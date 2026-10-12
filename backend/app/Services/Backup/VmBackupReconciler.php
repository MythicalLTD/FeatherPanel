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

use App\Chat\VmNode;
use App\Chat\VmTask;
use App\Chat\Database;
use App\Services\Vm\VmInstanceUtil;

/** Resolve backup state from the task's node, never from age alone. */
final class VmBackupReconciler
{
    public static function reconcileInstance(int $instanceId): void
    {
        $db = Database::getPdoConnection();
        $query = $db->prepare("SELECT * FROM featherpanel_vm_tasks WHERE instance_id = :id AND task_type = 'backup' AND status IN ('pending', 'running') AND updated_at < :cutoff ORDER BY created_at LIMIT 3");
        $query->execute(['id' => $instanceId, 'cutoff' => gmdate('Y-m-d H:i:s', time() - 30)]);
        foreach ($query->fetchAll(\PDO::FETCH_ASSOC) as $task) {
            self::reconcile($task);
        }
    }

    public static function reconcile(array $task): array
    {
        if (($task['task_type'] ?? '') !== 'backup' || !in_array($task['status'] ?? '', ['pending', 'running'], true)) {
            return $task;
        }
        $upid = (string) ($task['upid'] ?? '');
        $nodeName = (string) ($task['target_node'] ?? '');
        $node = VmNode::getVmNodeById((int) ($task['vm_node_id'] ?? 0));
        if (!$node || $upid === '' || $nodeName === '') {
            return $task;
        }
        // Avoid overlapping browser polls repeatedly querying the same node task.
        $claim = Database::getPdoConnection()->prepare("UPDATE featherpanel_vm_tasks SET updated_at = :now WHERE task_id = :task AND status IN ('pending', 'running') AND updated_at <= :cutoff");
        $claim->execute(['now' => gmdate('Y-m-d H:i:s'), 'task' => $task['task_id'], 'cutoff' => gmdate('Y-m-d H:i:s', time() - 30)]);
        if ($claim->rowCount() !== 1) {
            return VmTask::getByTaskId($task['task_id']) ?? $task;
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($node);
            $status = $client->getTaskStatus($nodeName, $upid);
            if (empty($status['ok']) || ($status['status'] ?? '') !== 'stopped' || empty($status['exitstatus'])) {
                return $task;
            }
            $archive = null;
            if ($status['exitstatus'] === 'OK') {
                $logs = $client->getTaskLog($nodeName, $upid);
                $volumes = $client->listVmBackups($nodeName, (int) $task['vmid']);
                if (empty($logs['ok']) || empty($volumes['ok'])) {
                    return $task;
                }
                $archive = self::matchArchive($logs['lines'], $volumes['backups'] ?? [], (int) $task['vmid']);
                // A stopped job is not proof that an arbitrary existing archive belongs to it.
                if ($archive === null) {
                    return $task;
                }
            }
            self::applyResult(Database::getPdoConnection(), $task, $archive, $status['exitstatus']);

            return VmTask::getByTaskId($task['task_id']) ?? $task;
        } catch (\Throwable) {
            // Offline nodes and expired task logs must not turn a running job into a failed one.
            return $task;
        }
    }

    /** Explicit stale recovery is separate from automatic node reconciliation. */
    public static function deleteFailedPlaceholder(int $instanceId, int $backupId): bool
    {
        $q = Database::getPdoConnection()->prepare("DELETE FROM featherpanel_vm_instance_backups WHERE id = :id AND vm_instance_id = :instance AND status = 'failed' AND (volid = '' OR volid = 'pending')");
        $q->execute(['id' => $backupId, 'instance' => $instanceId]);

        return $q->rowCount() === 1;
    }

    public static function recoverBackup(int $instanceId, int $backupId): string
    {
        $db = Database::getPdoConnection();
        $q = $db->prepare('SELECT * FROM featherpanel_vm_instance_backups WHERE id = :id AND vm_instance_id = :instance');
        $q->execute(['id' => $backupId, 'instance' => $instanceId]);
        $backup = $q->fetch(\PDO::FETCH_ASSOC);
        if (!$backup || !self::isStale($backup)) {
            return 'BACKUP_NOT_STALE';
        }
        $q = $db->prepare("SELECT * FROM featherpanel_vm_tasks WHERE instance_id = :instance AND task_type = 'backup' AND status IN ('pending', 'running')");
        $q->execute(['instance' => $instanceId]);
        $tasks = [];
        foreach ($q->fetchAll(\PDO::FETCH_ASSOC) as $task) {
            $meta = json_decode($task['data'] ?? '{}', true) ?: [];
            if ((int) ($meta['backup_id'] ?? 0) !== $backupId) {
                continue;
            }
            $node = VmNode::getVmNodeById((int) $task['vm_node_id']);
            if ($node && !empty($task['upid']) && !empty($task['target_node'])) {
                try {
                    $status = VmInstanceUtil::buildProxmoxClientForNode($node)->getTaskStatus($task['target_node'], $task['upid']);
                    if (!empty($status['ok']) && !empty($status['status']) && $status['status'] !== 'stopped') {
                        return 'BACKUP_STILL_RUNNING';
                    }
                } catch (\Throwable) {
                    // The caller explicitly confirms interruption when the node cannot be checked.
                }
            }
            $tasks[] = $task;
        }
        $db->beginTransaction();
        try {
            $q = $db->prepare("UPDATE featherpanel_vm_instance_backups SET status = 'failed' WHERE id = :id AND vm_instance_id = :instance AND (status IN ('pending', 'running') OR (status = 'completed' AND (volid = '' OR volid = 'pending'))) AND created_at <= :cutoff");
            $q->execute(['id' => $backupId, 'instance' => $instanceId, 'cutoff' => gmdate('Y-m-d H:i:s', time() - 86400)]);
            if ($q->rowCount() !== 1) {
                $db->rollBack();

                return 'BACKUP_STATUS_CHANGED';
            }
            foreach ($tasks as $task) {
                $q = $db->prepare("UPDATE featherpanel_vm_tasks SET status = 'failed', error = 'Explicitly marked interrupted by user', updated_at = :now WHERE task_id = :task AND instance_id = :instance AND status IN ('pending', 'running')");
                $q->execute(['now' => gmdate('Y-m-d H:i:s'), 'task' => $task['task_id'], 'instance' => $instanceId]);
            }
            $db->commit();

            return '';
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function isStale(array $backup): bool
    {
        return (in_array($backup['status'] ?? '', ['pending', 'running'], true) || self::hasMissingArchive($backup))
            && StalledBackupRecovery::isStale(['created_at' => $backup['created_at'] ?? null]);
    }

    public static function hasMissingArchive(array $backup): bool
    {
        return ($backup['status'] ?? '') === 'completed' && in_array($backup['volid'] ?? '', ['', 'pending'], true);
    }

    public static function matchArchive(array $lines, array $archives, int $vmid): ?array
    {
        $filenames = [];
        foreach ($lines as $line) {
            $text = is_array($line) ? ($line['t'] ?? '') : $line;
            if (is_string($text) && preg_match_all('/vzdump-(?:qemu|lxc)-' . $vmid . '-[^\s\x27\x22\/]+/', $text, $matches)) {
                $filenames = array_merge($filenames, $matches[0]);
            }
        }
        $matches = [];
        foreach ($archives as $archive) {
            if ((int) ($archive['vmid'] ?? 0) === $vmid && !empty($archive['storage']) && in_array(basename((string) ($archive['volid'] ?? '')), $filenames, true)) {
                $matches[] = $archive;
            }
        }

        return count($matches) === 1 ? $matches[0] : null;
    }

    /** Update task and owned backup together, guarded against concurrent completion. */
    public static function applyResult(\PDO $db, array $task, ?array $archive, string $exitStatus): void
    {
        $meta = json_decode($task['data'] ?? '{}', true) ?: [];
        $db->beginTransaction();
        try {
            $update = $db->prepare("UPDATE featherpanel_vm_tasks SET status = :status, error = :error, updated_at = :now WHERE task_id = :task AND instance_id = :instance AND task_type = 'backup' AND status IN ('pending', 'running')");
            $update->execute(['status' => $archive ? 'completed' : 'failed', 'error' => $archive ? null : $exitStatus, 'now' => gmdate('Y-m-d H:i:s'), 'task' => $task['task_id'], 'instance' => $task['instance_id']]);
            if ($update->rowCount() === 1) {
                $backupId = (int) ($meta['backup_id'] ?? 0);
                if ($archive) {
                    // Only repair the record associated with this task, never another backup.
                    $q = $db->prepare("UPDATE featherpanel_vm_instance_backups SET status = 'completed', storage = :storage, volid = :volid, size_bytes = :size, ctime = :ctime, format = :format WHERE id = :id AND vm_instance_id = :instance");
                    $q->execute(['storage' => $archive['storage'], 'volid' => $archive['volid'], 'size' => (int) ($archive['size'] ?? 0), 'ctime' => (int) ($archive['ctime'] ?? 0), 'format' => $archive['format'] ?? null, 'id' => $backupId, 'instance' => $task['instance_id']]);
                    if ($backupId > 0 && $q->rowCount() !== 1) {
                        throw new \RuntimeException('Owned backup record missing or changed');
                    }
                    if ($backupId === 0) {
                        $insert = $db->prepare("INSERT INTO featherpanel_vm_instance_backups (vm_instance_id, vmid, storage, volid, size_bytes, ctime, format, status) VALUES (:instance, :vmid, :storage, :volid, :size, :ctime, :format, 'completed')");
                        $insert->execute(['instance' => $task['instance_id'], 'vmid' => $task['vmid'], 'storage' => $archive['storage'], 'volid' => $archive['volid'], 'size' => (int) ($archive['size'] ?? 0), 'ctime' => (int) ($archive['ctime'] ?? 0), 'format' => $archive['format'] ?? null]);
                        $meta['backup_id'] = (int) $db->lastInsertId();
                        $q = $db->prepare('UPDATE featherpanel_vm_tasks SET data = :data WHERE task_id = :task');
                        $q->execute(['data' => json_encode($meta), 'task' => $task['task_id']]);
                    }
                } elseif ($backupId > 0) {
                    $q = $db->prepare("UPDATE featherpanel_vm_instance_backups SET status = 'failed' WHERE id = :id AND vm_instance_id = :instance AND status IN ('pending', 'running')");
                    $q->execute(['id' => $backupId, 'instance' => $task['instance_id']]);
                }
            }
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }
}
