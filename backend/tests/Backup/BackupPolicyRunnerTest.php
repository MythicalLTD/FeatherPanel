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

namespace Tests\Backup;

use App\Services\Wings\Wings;
use PHPUnit\Framework\TestCase;
use App\Services\Backup\BackupPolicyRunner;
use App\Services\Backup\ServerBackupTaskService;

final class BackupPolicyRunnerTest extends TestCase
{
    public function testSkipsOfflineServersWhenOnlyWhenOnline(): void
    {
        $runner = new class () extends BackupPolicyRunner {
            public array $notified = [];
            public array $finished = [];

            protected function resolveTargets(array $policy): array
            {
                return [
                    ['id' => 1, 'name' => 'offline-server', 'node_id' => 9, 'status' => 'offline', 'uuid' => 'a'],
                ];
            }

            protected function createRunRecord(int $policyId, int $serversTotal): int | false
            {
                return 42;
            }

            protected function finalizeRunRecord(int $runId, array $data): void
            {
                $this->finished = $data;
            }

            protected function markPolicyFinished(int $policyId, string $nextRunAt): void
            {
            }

            protected function calculateNextRun(array $policy): string
            {
                return '2026-10-07 03:00:00';
            }

            protected function createItemRecord(int $runId, int $serverId, array $data): int | false
            {
                return 1;
            }

            protected function finalizeItem(?int $itemId, array $result): void
            {
            }

            protected function isServerOnline(array $server): bool
            {
                return false;
            }

            protected function notifyFailure(array $policy, int $failedCount, array $failureDetails): void
            {
                $this->notified[] = $failedCount;
            }
        };

        $result = $runner->run($this->policy(['only_when_online' => 1]));
        self::assertSame('completed', $result['status']);
        self::assertSame(0, $result['servers_ok']);
        self::assertSame(1, $result['servers_skipped']);
        self::assertSame(0, $result['servers_failed']);
        self::assertSame(BackupPolicyRunner::SKIP_OFFLINE, $result['items'][0]['reason']);
        self::assertSame([], $runner->notified);
    }

    public function testCountsCreatedSkippedAndFailedAndNotifies(): void
    {
        $wings = $this->createMock(Wings::class);
        $runner = new class ($wings) extends BackupPolicyRunner {
            public array $notified = [];
            private int $itemSeq = 0;
            private Wings $wings;

            public function __construct(Wings $wings)
            {
                $this->wings = $wings;
            }

            protected function resolveTargets(array $policy): array
            {
                return [
                    ['id' => 1, 'name' => 'ok', 'node_id' => 1, 'status' => 'running', 'uuid' => 'a'],
                    ['id' => 2, 'name' => 'skip', 'node_id' => 1, 'status' => 'running', 'uuid' => 'b'],
                    ['id' => 3, 'name' => 'fail', 'node_id' => 1, 'status' => 'running', 'uuid' => 'c'],
                ];
            }

            protected function createRunRecord(int $policyId, int $serversTotal): int | false
            {
                return 7;
            }

            protected function finalizeRunRecord(int $runId, array $data): void
            {
            }

            protected function markPolicyFinished(int $policyId, string $nextRunAt): void
            {
            }

            protected function calculateNextRun(array $policy): string
            {
                return '2026-10-07 03:00:00';
            }

            protected function createItemRecord(int $runId, int $serverId, array $data): int | false
            {
                return ++$this->itemSeq;
            }

            protected function finalizeItem(?int $itemId, array $result): void
            {
            }

            protected function getNode(int $nodeId): ?array
            {
                return ['id' => $nodeId, 'fqdn' => 'node.example'];
            }

            protected function createWings(array $node): Wings
            {
                return $this->wings;
            }

            protected function executeBackup(Wings $wings, array $server, string $payload, string $namePrefix): array
            {
                return match ((int) $server['id']) {
                    1 => [
                        'type' => 'files',
                        'status' => ServerBackupTaskService::STATUS_CREATED,
                        'reason' => null,
                        'backup_uuid' => 'backup-ok',
                        'backup_id' => 11,
                        'name' => 'ok',
                        'details' => [],
                    ],
                    2 => [
                        'type' => 'files',
                        'status' => ServerBackupTaskService::STATUS_SKIPPED,
                        'reason' => ServerBackupTaskService::SKIP_LIMIT,
                        'backup_uuid' => null,
                        'backup_id' => null,
                        'name' => null,
                        'details' => [],
                    ],
                    default => throw new \RuntimeException('Wings unavailable'),
                };
            }

            protected function notifyFailure(array $policy, int $failedCount, array $failureDetails): void
            {
                $this->notified = [$failedCount, $failureDetails];
            }
        };

        $result = $runner->run($this->policy(['notify_on_failure' => 1, 'concurrency' => 2]));
        self::assertSame('partial', $result['status']);
        self::assertSame(1, $result['servers_ok']);
        self::assertSame(1, $result['servers_skipped']);
        self::assertSame(1, $result['servers_failed']);
        self::assertSame(1, $runner->notified[0]);
        self::assertStringContainsString('fail', $runner->notified[1][0]);
    }

    public function testDoesNotNotifyWhenFlagDisabled(): void
    {
        $wings = $this->createMock(Wings::class);
        $runner = new class ($wings) extends BackupPolicyRunner {
            public bool $notified = false;
            private Wings $wings;

            public function __construct(Wings $wings)
            {
                $this->wings = $wings;
            }

            protected function resolveTargets(array $policy): array
            {
                return [
                    ['id' => 3, 'name' => 'fail', 'node_id' => 1, 'status' => 'running', 'uuid' => 'c'],
                ];
            }

            protected function createRunRecord(int $policyId, int $serversTotal): int | false
            {
                return 9;
            }

            protected function finalizeRunRecord(int $runId, array $data): void
            {
            }

            protected function markPolicyFinished(int $policyId, string $nextRunAt): void
            {
            }

            protected function calculateNextRun(array $policy): string
            {
                return '2026-10-07 03:00:00';
            }

            protected function createItemRecord(int $runId, int $serverId, array $data): int | false
            {
                return 1;
            }

            protected function finalizeItem(?int $itemId, array $result): void
            {
            }

            protected function getNode(int $nodeId): ?array
            {
                return ['id' => $nodeId];
            }

            protected function createWings(array $node): Wings
            {
                return $this->wings;
            }

            protected function executeBackup(Wings $wings, array $server, string $payload, string $namePrefix): array
            {
                throw new \RuntimeException('boom');
            }

            protected function notifyFailure(array $policy, int $failedCount, array $failureDetails): void
            {
                $this->notified = true;
            }
        };

        $result = $runner->run($this->policy(['notify_on_failure' => 0]));
        self::assertSame('failed', $result['status']);
        self::assertFalse($runner->notified);
    }

    /**
     * @param array<string, mixed> $overrides
     *
     * @return array<string, mixed>
     */
    private function policy(array $overrides = []): array
    {
        return array_merge([
            'id' => 1,
            'name' => 'Nightly',
            'cron_day_of_week' => '*',
            'cron_month' => '*',
            'cron_day_of_month' => '*',
            'cron_hour' => '3',
            'cron_minute' => '0',
            'timezone' => 'UTC',
            'backup_payload' => '{"type":"files","ignored_files":""}',
            'concurrency' => 2,
            'only_when_online' => 0,
            'notify_on_failure' => 1,
            'next_run_at' => '2026-10-06 00:00:00',
        ], $overrides);
    }
}
