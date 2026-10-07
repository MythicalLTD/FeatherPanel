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

namespace App\Services\NodeBackup;

use App\App;
use App\Chat\NodeBackupRun;
use App\Chat\ServerSchedule;
use App\Services\Wings\Wings;
use App\Chat\NodeBackupPolicy;
use App\Chat\NodeBackupDestination;

/**
 * Orchestrates node-level backups across Wings nodes into SFTP/S3 destinations.
 */
class NodeBackupAgentRunner
{
    public const SKIP_OFFLINE = 'node_offline';

    /**
     * @param array<string, mixed> $policy
     *
     * @return array{run_id: int, status: string, items: list<array<string, mixed>>}
     */
    public function run(array $policy): array
    {
        $policyId = (int) ($policy['id'] ?? 0);
        if ($policyId <= 0) {
            throw new \InvalidArgumentException('Invalid node backup policy');
        }

        $nodes = NodeBackupPolicy::resolveTargetNodes($policy);
        $runId = NodeBackupRun::createRun($policyId, count($nodes));
        if ($runId === false) {
            throw new \RuntimeException('Failed to create node backup run');
        }

        NodeBackupPolicy::updatePolicy($policyId, ['is_processing' => 1]);
        NodeBackupRun::updateRun($runId, [
            'status' => 'running',
            'started_at' => gmdate('Y-m-d H:i:s'),
        ]);

        $primary = NodeBackupDestination::getById((int) $policy['primary_destination_id']);
        if (!$primary) {
            NodeBackupRun::updateRun($runId, [
                'status' => 'failed',
                'completed_at' => gmdate('Y-m-d H:i:s'),
            ]);
            NodeBackupPolicy::updatePolicy($policyId, [
                'is_processing' => 0,
                'last_run_at' => gmdate('Y-m-d H:i:s'),
                'next_run_at' => ServerSchedule::calculateNextRunTime(
                    (string) $policy['cron_day_of_week'],
                    (string) $policy['cron_month'],
                    (string) $policy['cron_day_of_month'],
                    (string) $policy['cron_hour'],
                    (string) $policy['cron_minute'],
                    $policy['next_run_at'] ?? null,
                    (string) ($policy['timezone'] ?? 'UTC')
                ),
            ]);

            throw new \RuntimeException('Primary destination not found');
        }

        $mirrors = [];
        foreach (NodeBackupPolicy::getMirrorDestinationIds($policyId) as $destId) {
            $row = NodeBackupDestination::getById($destId);
            if ($row) {
                $mirrors[] = $row;
            }
        }

        $ok = 0;
        $failed = 0;
        $skipped = 0;
        $mode = (string) ($policy['mode'] ?? NodeBackupPolicy::MODE_FULL);
        $deleteLocal = (int) ($policy['delete_local_after_upload'] ?? 1) === 1;

        foreach ($nodes as $node) {
            $nodeId = (int) ($node['id'] ?? 0);
            $itemId = NodeBackupRun::createItem($runId, $nodeId, ['status' => 'pending']);
            $started = gmdate('Y-m-d H:i:s');
            try {
                $result = $this->backupNode($node, $mode, $primary, $mirrors, $deleteLocal);
                if (($result['status'] ?? '') === 'skipped') {
                    ++$skipped;
                    if ($itemId !== false) {
                        NodeBackupRun::updateItem($itemId, [
                            'status' => 'skipped',
                            'error' => $result['reason'] ?? self::SKIP_OFFLINE,
                            'started_at' => $started,
                            'completed_at' => gmdate('Y-m-d H:i:s'),
                        ]);
                    }
                } else {
                    ++$ok;
                    if ($itemId !== false) {
                        NodeBackupRun::updateItem($itemId, [
                            'status' => 'uploaded',
                            'backup_uuid' => $result['backup_uuid'] ?? null,
                            'remote_path' => $result['remote_path'] ?? null,
                            'bytes' => $result['bytes'] ?? null,
                            'checksum' => $result['checksum'] ?? null,
                            'started_at' => $started,
                            'completed_at' => gmdate('Y-m-d H:i:s'),
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                ++$failed;
                App::getInstance(true)->getLogger()->error(
                    'NodeBackupAgentRunner failed for node ' . $nodeId . ': ' . $e->getMessage()
                );
                if ($itemId !== false) {
                    NodeBackupRun::updateItem($itemId, [
                        'status' => 'failed',
                        'error' => $e->getMessage(),
                        'started_at' => $started,
                        'completed_at' => gmdate('Y-m-d H:i:s'),
                    ]);
                }
            }
        }

        $status = 'completed';
        if ($failed > 0 && $ok > 0) {
            $status = 'partial';
        } elseif ($failed > 0 && $ok === 0) {
            $status = 'failed';
        }

        NodeBackupRun::updateRun($runId, [
            'status' => $status,
            'nodes_ok' => $ok,
            'nodes_failed' => $failed,
            'nodes_skipped' => $skipped,
            'completed_at' => gmdate('Y-m-d H:i:s'),
        ]);
        $nextRunAt = ServerSchedule::calculateNextRunTime(
            (string) $policy['cron_day_of_week'],
            (string) $policy['cron_month'],
            (string) $policy['cron_day_of_month'],
            (string) $policy['cron_hour'],
            (string) $policy['cron_minute'],
            $policy['next_run_at'] ?? null,
            (string) ($policy['timezone'] ?? 'UTC')
        );
        NodeBackupPolicy::updatePolicy($policyId, [
            'is_processing' => 0,
            'last_run_at' => gmdate('Y-m-d H:i:s'),
            'next_run_at' => $nextRunAt,
        ]);

        // Retention purge for this policy's destinations
        try {
            (new NodeBackupRetentionService())->purgePolicyDestinations($policy);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Node backup retention purge failed: ' . $e->getMessage());
        }

        return [
            'run_id' => $runId,
            'status' => $status,
            'items' => NodeBackupRun::getItemsForRun($runId),
        ];
    }

    /**
     * @param array<string, mixed> $node
     * @param array<string, mixed> $primary
     * @param list<array<string, mixed>> $mirrors
     *
     * @return array{status: string, reason?: string, backup_uuid?: string, remote_path?: string, bytes?: int, checksum?: string}
     */
    private function backupNode(array $node, string $mode, array $primary, array $mirrors, bool $deleteLocal): array
    {
        $wings = Wings::fromNode($node, 120);
        try {
            $wings->getSystem()->getSystemInfo();
        } catch (\Throwable) {
            return ['status' => 'skipped', 'reason' => self::SKIP_OFFLINE];
        }

        $created = $wings->getSystem()->createNodeBackup($mode, false, true);
        $backupUuid = (string) ($created['uuid'] ?? '');
        if ($backupUuid === '') {
            throw new \RuntimeException('Wings did not return a node backup uuid');
        }

        $info = $this->waitForBackup($wings, $backupUuid, 3600);
        if (($info['status'] ?? '') !== 'completed') {
            throw new \RuntimeException('Node backup failed: ' . ($info['error'] ?? $info['status'] ?? 'unknown'));
        }

        $tmp = tempnam(sys_get_temp_dir(), 'fp_node_backup_');
        if ($tmp === false) {
            throw new \RuntimeException('Unable to allocate temp file for node backup download');
        }
        $archive = $tmp . '.tar.gz';
        @unlink($tmp);
        try {
            $wings->getSystem()->downloadNodeBackupToFile($backupUuid, $archive);
            $bytes = filesize($archive) ?: (int) ($info['bytes'] ?? 0);
            $checksum = (string) ($info['checksum'] ?? '');
            $nodeUuid = (string) ($node['uuid'] ?? $node['id'] ?? 'node');
            $remotePath = sprintf(
                'wings/%s/%s_%s.tar.gz',
                $nodeUuid,
                gmdate('Ymd_His'),
                $mode
            );

            $primaryClient = DestinationFactory::fromRow($primary);
            $primaryClient->upload($archive, $remotePath);
            foreach ($mirrors as $mirror) {
                DestinationFactory::fromRow($mirror)->upload($archive, $remotePath);
            }

            if ($deleteLocal) {
                try {
                    $wings->getSystem()->deleteNodeBackup($backupUuid);
                } catch (\Throwable $e) {
                    App::getInstance(true)->getLogger()->warning(
                        'Failed to delete local node backup ' . $backupUuid . ': ' . $e->getMessage()
                    );
                }
            }

            return [
                'status' => 'uploaded',
                'backup_uuid' => $backupUuid,
                'remote_path' => $remotePath,
                'bytes' => $bytes,
                'checksum' => $checksum,
            ];
        } finally {
            @unlink($archive);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function waitForBackup(Wings $wings, string $uuid, int $timeoutSeconds): array
    {
        $deadline = time() + $timeoutSeconds;
        while (time() < $deadline) {
            $info = $wings->getSystem()->getNodeBackup($uuid);
            $status = (string) ($info['status'] ?? '');
            if (in_array($status, ['completed', 'failed'], true)) {
                return $info;
            }
            sleep(3);
        }

        throw new \RuntimeException('Timed out waiting for node backup ' . $uuid);
    }
}
