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

use PHPUnit\Framework\TestCase;
use App\Services\Backup\StalledBackupRecovery;

final class StalledBackupRecoveryTest extends TestCase
{
    private \PDO $db;
    private StalledBackupRecovery $service;
    private \DateTimeImmutable $now;

    protected function setUp(): void
    {
        $this->now = new \DateTimeImmutable('2026-10-06T12:00:00Z');
        $this->db = new \PDO('sqlite::memory:');
        $this->db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->db->exec('CREATE TABLE featherpanel_server_backups (id INTEGER PRIMARY KEY, server_id INTEGER, is_successful INTEGER, is_locked INTEGER, completed_at TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, checksum TEXT, bytes INTEGER)');
        $this->db->exec("INSERT INTO featherpanel_server_backups VALUES (1, 10, 0, 1, NULL, '2026-08-31 12:00:00', '2026-08-31 12:00:00', NULL, 'original-checksum', 123)");
        $this->service = new StalledBackupRecovery($this->db);
    }

    public function testOldLockedBackupCanBeMarkedFailedWithoutLosingArtifactMetadata(): void
    {
        self::assertTrue(StalledBackupRecovery::isStale($this->backup(), $this->now));
        self::assertTrue($this->service->recover(1, 10, $this->now));
        $backup = $this->backup();
        self::assertSame(0, (int) $backup['is_successful']);
        self::assertSame(0, (int) $backup['is_locked']);
        self::assertSame('2026-10-06 12:00:00', $backup['completed_at']);
        self::assertSame('original-checksum', $backup['checksum']);
        self::assertSame(123, (int) $backup['bytes']);
        self::assertFalse(StalledBackupRecovery::isStale($backup, $this->now));
        self::assertFalse($this->service->recover(1, 10, $this->now));
    }

    public function testActiveJobsAndWrongServerCannotBeRecovered(): void
    {
        self::assertFalse($this->service->recover(1, 99, $this->now));
        $this->db->exec("UPDATE featherpanel_server_backups SET created_at = '2026-10-06 11:00:00'");
        self::assertFalse(StalledBackupRecovery::isStale($this->backup(), $this->now));
        self::assertFalse($this->service->recover(1, 10, $this->now));
        self::assertNull($this->backup()['completed_at']);
        self::assertSame(1, (int) $this->backup()['is_locked']);
    }

    public function testConcurrentCompletionIsNotOverwritten(): void
    {
        self::assertTrue(StalledBackupRecovery::isStale($this->backup(), $this->now));
        $this->db->exec("UPDATE featherpanel_server_backups SET is_successful = 1, completed_at = '2026-10-06 11:59:59'");
        self::assertFalse($this->service->recover(1, 10, $this->now));
        self::assertSame(1, (int) $this->backup()['is_successful']);
        self::assertSame('2026-10-06 11:59:59', $this->backup()['completed_at']);
    }

    public function testDeletedFailedAndSuccessfulBackupsAreExcluded(): void
    {
        foreach ([['deleted_at' => '2026-10-01'], ['completed_at' => '2026-10-01'], ['is_successful' => 1], ['created_at' => 'invalid'], ['created_at' => '2026-10-07']] as $changes) {
            self::assertFalse(StalledBackupRecovery::isStale(array_replace($this->backup(), $changes), $this->now));
        }
        $this->db->exec("UPDATE featherpanel_server_backups SET deleted_at = '2026-10-01'");
        self::assertFalse($this->service->recover(1, 10, $this->now));
    }

    public function testExactlyTwentyFourHoursIsEligible(): void
    {
        $this->db->exec("UPDATE featherpanel_server_backups SET created_at = '2026-10-05 12:00:00'");
        self::assertTrue(StalledBackupRecovery::isStale($this->backup(), $this->now));
        self::assertTrue($this->service->recover(1, 10, $this->now));
    }

    private function backup(): array
    {
        return $this->db->query('SELECT * FROM featherpanel_server_backups WHERE id = 1')->fetch(\PDO::FETCH_ASSOC);
    }
}
