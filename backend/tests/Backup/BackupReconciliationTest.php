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
use App\Services\Backup\VmBackupReconciler;
use App\Services\Backup\BackupCompletionPayload;
use App\Services\Backup\WebSpaceBackupReconciler;

final class BackupReconciliationTest extends TestCase
{
    public function testFailureCallbackAcceptsNullMetadataWithoutOverwritingArchive(): void
    {
        $result = BackupCompletionPayload::parse(['successful' => false, 'checksum' => null, 'size' => null]);
        self::assertSame(0, $result['is_successful']);
        self::assertSame(0, $result['is_locked']);
        self::assertArrayNotHasKey('checksum', $result);
        self::assertArrayNotHasKey('bytes', $result);
        self::assertNotEmpty($result['completed_at']);
        self::assertNotNull(BackupCompletionPayload::parse(['successful' => false]));
    }

    public function testSuccessRequiresMetadataAndStrictBoolean(): void
    {
        self::assertNull(BackupCompletionPayload::parse(['successful' => 'false']));
        self::assertNull(BackupCompletionPayload::parse(['successful' => true]));
        self::assertNull(BackupCompletionPayload::parse(['successful' => true, 'checksum' => 'abc', 'checksum_type' => 'sha256', 'size' => -1]));
        $result = BackupCompletionPayload::parse(['successful' => true, 'checksum' => 'abc', 'checksum_type' => 'sha256', 'size' => 123]);
        self::assertSame(1, $result['is_successful']);
        self::assertSame('abc', $result['checksum']);
        self::assertSame(123, $result['bytes']);
    }

    public function testVmMatchingRequiresTheExactTaskArchiveAndVm(): void
    {
        $archive = ['vmid' => 103, 'storage' => 'nas', 'volid' => 'nas:backup/vzdump-qemu-103-2026_10_06-12_00_00.vma.zst'];
        $old = ['vmid' => 103, 'storage' => 'nas', 'volid' => 'nas:backup/vzdump-qemu-103-old.vma.zst'];
        $logs = [['t' => "creating vzdump archive '/mnt/nas/dump/vzdump-qemu-103-2026_10_06-12_00_00.vma.zst'"]];
        self::assertSame($archive, VmBackupReconciler::matchArchive($logs, [$old, $archive], 103));
        self::assertNull(VmBackupReconciler::matchArchive($logs, [$old], 103));
        self::assertNull(VmBackupReconciler::matchArchive($logs, [$archive], 104));
        self::assertNull(VmBackupReconciler::matchArchive($logs, [$archive, $archive], 103));
        self::assertNull(VmBackupReconciler::matchArchive([], [$archive], 103));
    }

    public function testFailureUpdatesOnlyTheOwnedPendingBackup(): void
    {
        $db = $this->database();
        VmBackupReconciler::applyResult($db, $this->task(), null, 'Backup failed on node');
        self::assertSame('failed', $db->query('SELECT status FROM featherpanel_vm_tasks')->fetchColumn());
        self::assertSame('failed', $db->query('SELECT status FROM featherpanel_vm_instance_backups WHERE id = 1')->fetchColumn());
        self::assertSame('completed', $db->query('SELECT status FROM featherpanel_vm_instance_backups WHERE id = 2')->fetchColumn());
    }

    public function testConcurrentCompletionIsNotOverwritten(): void
    {
        $db = $this->database();
        $db->exec("UPDATE featherpanel_vm_tasks SET status = 'completed'");
        $db->exec("UPDATE featherpanel_vm_instance_backups SET status = 'completed' WHERE id = 1");
        VmBackupReconciler::applyResult($db, $this->task(), null, 'Stale failure snapshot');
        self::assertSame('completed', $db->query('SELECT status FROM featherpanel_vm_tasks')->fetchColumn());
        self::assertSame('completed', $db->query('SELECT status FROM featherpanel_vm_instance_backups WHERE id = 1')->fetchColumn());
    }

    public function testVerifiedCompletionRepairsArchiveMetadata(): void
    {
        $db = $this->database();
        VmBackupReconciler::applyResult($db, $this->task(), ['volid' => 'nas:backup/verified.vma.zst', 'storage' => 'nas', 'size' => 2048, 'ctime' => 123], 'OK');
        self::assertSame('completed', $db->query('SELECT status FROM featherpanel_vm_tasks')->fetchColumn());
        $backup = $db->query('SELECT * FROM featherpanel_vm_instance_backups WHERE id = 1')->fetch(\PDO::FETCH_ASSOC);
        self::assertSame('completed', $backup['status']);
        self::assertSame('nas:backup/verified.vma.zst', $backup['volid']);
        self::assertSame(2048, $backup['size_bytes']);
    }

    public function testWebspaceIncompleteArchivesAreNotMarkedCompleted(): void
    {
        $archive = ['uuid' => '71281b01-8c95-4fac-9f58-6d68aac179d7', 'bytes' => 123];
        self::assertTrue(WebSpaceBackupReconciler::isCompletedArchive($archive));
        self::assertFalse(WebSpaceBackupReconciler::isCompletedArchive($archive + ['status' => 'pending']));
        self::assertFalse(WebSpaceBackupReconciler::isCompletedArchive($archive + ['status' => 'failed']));
        self::assertFalse(WebSpaceBackupReconciler::isCompletedArchive(['uuid' => $archive['uuid'], 'bytes' => 0]));
        self::assertFalse(WebSpaceBackupReconciler::isCompletedArchive(['uuid' => '../bad', 'bytes' => 123]));
    }

    public function testLegacyCompletedPlaceholderCanBeRecoveredWithoutARealArchiveBeingMarkedStale(): void
    {
        self::assertTrue(VmBackupReconciler::isStale(['status' => 'completed', 'volid' => 'pending', 'created_at' => '2026-08-31 12:00:00']));
        self::assertFalse(VmBackupReconciler::isStale(['status' => 'completed', 'volid' => 'nas:backup/real.vma.zst', 'created_at' => '2026-08-31 12:00:00']));
        self::assertFalse(VmBackupReconciler::isStale(['status' => 'pending', 'created_at' => gmdate('Y-m-d H:i:s')]));
    }

    public function testVmWrongOwnerRollsBackCompletion(): void
    {
        $db = $this->database();
        $task = $this->task();
        $task['data'] = '{"backup_id":2}';
        try {
            VmBackupReconciler::applyResult($db, $task, ['volid' => 'nas:backup/test', 'storage' => 'nas'], 'OK');
            self::fail('Wrong owner must prevent completion');
        } catch (\RuntimeException) {
            self::assertSame('running', $db->query('SELECT status FROM featherpanel_vm_tasks')->fetchColumn());
            self::assertSame('nas:backup/other', $db->query('SELECT volid FROM featherpanel_vm_instance_backups WHERE id = 2')->fetchColumn());
        }
    }

    public function testVerifiedVmCompletionRestoresRecordMissingAfterWorkerCrash(): void
    {
        $db = $this->database();
        $task = $this->task();
        $task['data'] = '{}';
        VmBackupReconciler::applyResult($db, $task, ['volid' => 'nas:backup/recovered', 'storage' => 'nas', 'size' => 123], 'OK');
        $meta = json_decode($db->query('SELECT data FROM featherpanel_vm_tasks')->fetchColumn(), true);
        self::assertGreaterThan(2, $meta['backup_id']);
        self::assertSame('completed', $db->query('SELECT status FROM featherpanel_vm_tasks')->fetchColumn());
        self::assertSame('nas:backup/recovered', $db->query('SELECT volid FROM featherpanel_vm_instance_backups WHERE id = ' . $meta['backup_id'])->fetchColumn());
    }

    public function testWebspaceFailureCannotChangeAnotherOwnerOrCompletedBackup(): void
    {
        $db = new \PDO('sqlite::memory:');
        $db->exec('CREATE TABLE featherpanel_webspace_backups (uuid TEXT, webspace_id INTEGER, status TEXT, completed_at TEXT)');
        $db->exec("INSERT INTO featherpanel_webspace_backups VALUES ('one', 10, 'pending', NULL), ('two', 99, 'pending', NULL), ('three', 10, 'completed', '2026-10-01')");
        WebSpaceBackupReconciler::markFailed($db, 10, 'one');
        WebSpaceBackupReconciler::markFailed($db, 10, 'two');
        WebSpaceBackupReconciler::markFailed($db, 10, 'three');
        self::assertSame('failed', $db->query("SELECT status FROM featherpanel_webspace_backups WHERE uuid = 'one'")->fetchColumn());
        self::assertSame('pending', $db->query("SELECT status FROM featherpanel_webspace_backups WHERE uuid = 'two'")->fetchColumn());
        self::assertSame('completed', $db->query("SELECT status FROM featherpanel_webspace_backups WHERE uuid = 'three'")->fetchColumn());
    }

    private function database(): \PDO
    {
        $db = new \PDO('sqlite::memory:');
        $db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $db->exec('CREATE TABLE featherpanel_vm_tasks (task_id TEXT, instance_id INTEGER, vmid INTEGER, task_type TEXT, status TEXT, error TEXT, data TEXT, updated_at TEXT)');
        $db->exec('CREATE TABLE featherpanel_vm_instance_backups (id INTEGER PRIMARY KEY, vm_instance_id INTEGER, vmid INTEGER, storage TEXT, volid TEXT, size_bytes INTEGER, ctime INTEGER, format TEXT, status TEXT)');
        $db->exec("INSERT INTO featherpanel_vm_tasks VALUES ('task-1', 10, 103, 'backup', 'running', NULL, '{\"backup_id\":1}', NULL)");
        $db->exec("INSERT INTO featherpanel_vm_instance_backups VALUES (1, 10, 103, 'pending', 'pending', 0, 0, NULL, 'pending'), (2, 99, 104, 'nas', 'nas:backup/other', 123, 0, NULL, 'completed')");

        return $db;
    }

    private function task(): array
    {
        return ['task_id' => 'task-1', 'instance_id' => 10, 'vmid' => 103, 'data' => '{"backup_id":1}'];
    }
}
