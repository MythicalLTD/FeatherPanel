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
use App\Services\Backup\BackupQuota;
use App\Services\Backup\ServerBackupTaskService;

/**
 * Backups on a user's own storage do not use the server backup limit, and rotation
 * never crosses storage pools (host storage vs. one user destination).
 */
final class BackupQuotaTest extends TestCase
{
    public function testCountingRule(): void
    {
        $this->assertTrue(BackupQuota::counts(null, false));
        $this->assertTrue(BackupQuota::counts(0, false));
        $this->assertFalse(BackupQuota::counts(8, false));
        $this->assertTrue(BackupQuota::counts(8, true));
    }

    public function testByoBackupAllowedWhenHostLimitReached(): void
    {
        $svc = $this->service([null, null], limit: 2, fifo: false);
        $result = $svc->runFilesBackup($this->wings(), $this->server(2), '[]', ['destination_id' => 8]);

        $this->assertSame(ServerBackupTaskService::STATUS_CREATED, $result['status']);
        $this->assertSame([], $svc->evicted, 'no host backup may be removed for a BYO backup');
        $this->assertSame([null, null, 8], $svc->backups);
    }

    public function testHostBackupStillLimited(): void
    {
        // Two BYO backups do not count, two host backups fill the limit of 2.
        $svc = $this->service([8, 8, null, null], limit: 2, fifo: false);
        $result = $svc->runFilesBackup($this->wings(), $this->server(2), '[]', []);

        $this->assertSame(ServerBackupTaskService::STATUS_SKIPPED, $result['status']);
        $this->assertSame(ServerBackupTaskService::SKIP_LIMIT, $result['reason']);
        $this->assertSame(2, $result['details']['current_backups']);
    }

    public function testHostBackupNotLimitedByByoBackups(): void
    {
        $svc = $this->service([8, 8, 8, null], limit: 2, fifo: false);
        $result = $svc->runFilesBackup($this->wings(), $this->server(2), '[]', []);

        $this->assertSame(ServerBackupTaskService::STATUS_CREATED, $result['status']);
    }

    public function testFifoRotatesHostPoolOnly(): void
    {
        $svc = $this->service([8, null, null], limit: 2, fifo: true);
        $result = $svc->runFilesBackup($this->wings(), $this->server(2), '[]', []);

        $this->assertSame(ServerBackupTaskService::STATUS_CREATED, $result['status']);
        $this->assertSame([null], $svc->evicted, 'the oldest HOST backup is rotated, not the older BYO one');
        $this->assertSame([8, null, null], $svc->backups);
    }

    public function testWhenAdminCountsByoRotationStaysInSamePool(): void
    {
        // Limit 2 is full (one host, one BYO). A new BYO backup rotates the BYO one, never the host one.
        $svc = $this->service([null, 8], limit: 2, fifo: true, byoCounts: true);
        $result = $svc->runFilesBackup($this->wings(), $this->server(2), '[]', ['destination_id' => 8]);
        $this->assertSame(ServerBackupTaskService::STATUS_CREATED, $result['status']);
        $this->assertSame([8], $svc->evicted);
        $this->assertSame([null, 8], $svc->backups);

        // Hard limit with counting on: a BYO backup is refused too.
        $svc = $this->service([null, 8], limit: 2, fifo: false, byoCounts: true);
        $result = $svc->runFilesBackup($this->wings(), $this->server(2), '[]', ['destination_id' => 8]);
        $this->assertSame(ServerBackupTaskService::SKIP_LIMIT, $result['reason']);
    }

    public function testDisabledBackupsStayDisabledForByo(): void
    {
        $svc = $this->service([], limit: 0, fifo: false);
        $result = $svc->runFilesBackup($this->wings(), $this->server(0), '[]', ['destination_id' => 8]);
        $this->assertSame(ServerBackupTaskService::SKIP_DISABLED, $result['reason']);
    }

    private function wings(): Wings
    {
        return $this->createMock(Wings::class);
    }

    /** No node_id, so activity logging is skipped. */
    private function server(int $limit): array
    {
        return ['id' => 3, 'uuid' => 'srv', 'name' => 'test', 'backup_limit' => $limit];
    }

    /**
     * @param list<int|null> $backups destination ids, oldest first (null = host storage)
     */
    private function service(array $backups, int $limit, bool $fifo, bool $byoCounts = false): ServerBackupTaskService
    {
        return new class ($backups, $fifo, $byoCounts) extends ServerBackupTaskService {
            /** @var list<int|null> */
            public array $evicted = [];

            public function __construct(public array $backups, private bool $fifo, private bool $byoCounts)
            {
            }

            protected function countBackups(int $serverId): int
            {
                return count(array_filter($this->backups, fn (?int $d): bool => BackupQuota::counts($d, $this->byoCounts)));
            }

            protected function countsTowardLimit(?int $destinationId): bool
            {
                return BackupQuota::counts($destinationId, $this->byoCounts);
            }

            protected function isFifoRolling(array $server): bool
            {
                return $this->fifo;
            }

            protected function evictOldestBackup(Wings $wings, array $server, ?int $destinationId = null): ?array
            {
                foreach ($this->backups as $i => $d) {
                    if ($d === $destinationId) {
                        $this->evicted[] = $d;
                        array_splice($this->backups, $i, 1);

                        return null;
                    }
                }

                return ['message' => 'none in pool', 'code' => 'BACKUP_LIMIT_REACHED', 'status' => 400];
            }

            protected function resolveDestination(?int $destinationId, array $server): ?int
            {
                return $destinationId;
            }

            protected function startWingsBackup(Wings $wings, array $server, string $ignoredFiles, string $name, ?int $destinationId = null): array
            {
                $this->backups[] = $destinationId;

                return ['id' => count($this->backups), 'uuid' => 'b' . count($this->backups), 'name' => $name, 'adapter' => 'wings'];
            }
        };
    }
}
