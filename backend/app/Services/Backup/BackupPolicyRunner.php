<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Services\Backup;

use App\App;
use App\Chat\Node;
use App\Chat\BackupPolicy;
use App\Chat\ServerSchedule;
use App\Chat\BackupPolicyRun;
use App\Services\Wings\Wings;
use App\Services\Notifications\WarningService;

/**
 * Executes an admin backup policy against its resolved server targets.
 */
class BackupPolicyRunner
{
    public const SKIP_OFFLINE = 'server_offline';
    public const SKIP_NO_NODE = 'node_missing';

    /**
     * @param array{manual?: bool} $options
     *
     * @return array{
     *     run_id: int|null,
     *     status: string,
     *     servers_total: int,
     *     servers_ok: int,
     *     servers_failed: int,
     *     servers_skipped: int,
     *     items: list<array<string, mixed>>
     * }
     */
    public function run(array $policy, array $options = []): array
    {
        $policyId = (int) ($policy['id'] ?? 0);
        if ($policyId <= 0) {
            throw new \InvalidArgumentException('Invalid backup policy');
        }

        $servers = $this->resolveTargets($policy);
        $runId = $this->createRunRecord($policyId, count($servers));
        if (!$runId) {
            throw new \RuntimeException('Failed to create backup policy run');
        }

        $ok = 0;
        $failed = 0;
        $skipped = 0;
        $items = [];
        $failureDetails = [];
        $concurrency = max(1, min(5, (int) ($policy['concurrency'] ?? 2)));
        $onlyWhenOnline = (int) ($policy['only_when_online'] ?? 0) === 1;
        $payload = (string) ($policy['backup_payload'] ?? '{"type":"files","ignored_files":""}');
        $namePrefix = 'admin policy ' . ($policy['name'] ?? ('#' . $policyId));

        $chunks = array_chunk($servers, $concurrency);
        foreach ($chunks as $chunkIndex => $chunk) {
            if ($chunkIndex > 0) {
                usleep(250000);
            }
            foreach ($chunk as $server) {
                $item = $this->runForServer($runId, $server, $payload, $namePrefix, $onlyWhenOnline);
                $items[] = $item;
                if ($item['status'] === 'created') {
                    ++$ok;
                } elseif ($item['status'] === 'skipped') {
                    ++$skipped;
                } else {
                    ++$failed;
                    $failureDetails[] = ($server['name'] ?? ('#' . $server['id'])) . ': ' . ($item['error'] ?? $item['reason'] ?? 'failed');
                }
            }
        }

        $status = 'completed';
        if ($failed > 0 && $ok === 0 && $skipped === 0) {
            $status = 'failed';
        } elseif ($failed > 0) {
            $status = 'partial';
        }

        $this->finalizeRunRecord($runId, [
            'status' => $status,
            'servers_total' => count($servers),
            'servers_ok' => $ok,
            'servers_failed' => $failed,
            'servers_skipped' => $skipped,
            'completed_at' => gmdate('Y-m-d H:i:s'),
        ]);

        $nextRunAt = $this->calculateNextRun($policy);

        $this->markPolicyFinished($policyId, $nextRunAt);

        if ($failed > 0 && (int) ($policy['notify_on_failure'] ?? 0) === 1) {
            $this->notifyFailure($policy, $failed, $failureDetails);
        }

        return [
            'run_id' => $runId,
            'status' => $status,
            'servers_total' => count($servers),
            'servers_ok' => $ok,
            'servers_failed' => $failed,
            'servers_skipped' => $skipped,
            'items' => $items,
        ];
    }

    /**
     * @param array<string, mixed> $server
     *
     * @return array{server_id: int, status: string, reason: string|null, backup_uuid: string|null, error: string|null}
     */
    protected function runForServer(int $runId, array $server, string $payload, string $namePrefix, bool $onlyWhenOnline): array
    {
        $serverId = (int) $server['id'];
        $startedAt = gmdate('Y-m-d H:i:s');
        $itemId = $this->createItemRecord($runId, $serverId, [
            'status' => 'pending',
            'started_at' => $startedAt,
        ]);

        try {
            if ($onlyWhenOnline && !$this->isServerOnline($server)) {
                $result = [
                    'server_id' => $serverId,
                    'status' => 'skipped',
                    'reason' => self::SKIP_OFFLINE,
                    'backup_uuid' => null,
                    'error' => null,
                ];
                $this->finalizeItem($itemId, $result);

                return $result;
            }

            $node = $this->getNode((int) $server['node_id']);
            if (!$node) {
                $result = [
                    'server_id' => $serverId,
                    'status' => 'skipped',
                    'reason' => self::SKIP_NO_NODE,
                    'backup_uuid' => null,
                    'error' => null,
                ];
                $this->finalizeItem($itemId, $result);

                return $result;
            }

            $wings = $this->createWings($node);
            $taskResult = $this->executeBackup($wings, $server, $payload, $namePrefix);

            if (($taskResult['status'] ?? '') === ServerBackupTaskService::STATUS_SKIPPED) {
                $result = [
                    'server_id' => $serverId,
                    'status' => 'skipped',
                    'reason' => $taskResult['reason'] ?? 'skipped',
                    'backup_uuid' => $taskResult['backup_uuid'] ?? null,
                    'error' => null,
                ];
                $this->finalizeItem($itemId, $result);

                return $result;
            }

            $result = [
                'server_id' => $serverId,
                'status' => 'created',
                'reason' => null,
                'backup_uuid' => $taskResult['backup_uuid'] ?? null,
                'error' => null,
            ];
            $this->finalizeItem($itemId, $result);

            return $result;
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error(
                'BackupPolicyRunner failed for server ' . $serverId . ': ' . $e->getMessage()
            );
            $result = [
                'server_id' => $serverId,
                'status' => 'failed',
                'reason' => null,
                'backup_uuid' => null,
                'error' => $e->getMessage(),
            ];
            $this->finalizeItem($itemId, $result);

            return $result;
        }
    }

    /**
     * @param array<string, mixed> $policy
     *
     * @return list<array<string, mixed>>
     */
    protected function resolveTargets(array $policy): array
    {
        return BackupPolicy::resolveTargetServers($policy);
    }

    protected function createRunRecord(int $policyId, int $serversTotal): int | false
    {
        return BackupPolicyRun::createRun($policyId, $serversTotal);
    }

    /**
     * @param array<string, mixed> $data
     */
    protected function finalizeRunRecord(int $runId, array $data): void
    {
        BackupPolicyRun::updateRun($runId, $data);
    }

    protected function markPolicyFinished(int $policyId, string $nextRunAt): void
    {
        BackupPolicy::updatePolicy($policyId, [
            'is_processing' => 0,
            'last_run_at' => gmdate('Y-m-d H:i:s'),
            'next_run_at' => $nextRunAt,
        ]);
    }

    /**
     * @param array<string, mixed> $data
     */
    protected function createItemRecord(int $runId, int $serverId, array $data): int | false
    {
        return BackupPolicyRun::createItem($runId, $serverId, $data);
    }

    /**
     * @param array{server_id: int, status: string, reason: string|null, backup_uuid: string|null, error: string|null} $result
     */
    protected function finalizeItem(?int $itemId, array $result): void
    {
        if (!$itemId) {
            return;
        }
        BackupPolicyRun::updateItem($itemId, [
            'status' => $result['status'],
            'reason' => $result['reason'],
            'backup_uuid' => $result['backup_uuid'],
            'error' => $result['error'],
            'completed_at' => gmdate('Y-m-d H:i:s'),
        ]);
    }

    /**
     * @param array<string, mixed> $policy
     */
    protected function calculateNextRun(array $policy): string
    {
        return ServerSchedule::calculateNextRunTime(
            (string) $policy['cron_day_of_week'],
            (string) $policy['cron_month'],
            (string) $policy['cron_day_of_month'],
            (string) $policy['cron_hour'],
            (string) $policy['cron_minute'],
            $policy['next_run_at'] ?? null,
            (string) ($policy['timezone'] ?? 'UTC')
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function getNode(int $nodeId): ?array
    {
        return Node::getNodeById($nodeId);
    }

    /**
     * @param array<string, mixed> $node
     */
    protected function createWings(array $node): Wings
    {
        return Wings::fromNode($node, 30);
    }

    /**
     * @param array<string, mixed> $server
     *
     * @return array<string, mixed>
     */
    protected function executeBackup(Wings $wings, array $server, string $payload, string $namePrefix): array
    {
        return (new ServerBackupTaskService())->run($wings, $server, $payload, [
            'context' => 'admin_policy',
            'name_prefix' => $namePrefix,
        ]);
    }

    /**
     * @param array<string, mixed> $server
     */
    protected function isServerOnline(array $server): bool
    {
        $status = strtolower((string) ($server['status'] ?? 'offline'));

        return $status === 'running';
    }

    /**
     * @param array<string, mixed> $policy
     * @param list<string> $failureDetails
     */
    protected function notifyFailure(array $policy, int $failedCount, array $failureDetails): void
    {
        $name = (string) ($policy['name'] ?? 'Backup policy');
        $preview = implode("\n", array_slice($failureDetails, 0, 10));
        if (count($failureDetails) > 10) {
            $preview .= "\n…and " . (count($failureDetails) - 10) . ' more';
        }

        WarningService::send([
            'title' => 'Backup schedule failed: ' . $name,
            'message_markdown' => $failedCount . " server backup(s) failed for policy **{$name}**.\n\n```\n{$preview}\n```",
            'type' => 'danger',
            'is_dismissible' => true,
            'is_sticky' => false,
            'send_email' => false,
        ]);
    }
}
