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

namespace App\Chat;

class VmTask
{
    private static string $table = 'featherpanel_vm_tasks';

    public static function create(array $data): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            INSERT INTO ' . self::$table . '
                (task_id, instance_id, vm_node_id, task_type, status, upid, target_node, vmid, data, user_uuid)
            VALUES
                (:task_id, :instance_id, :vm_node_id, :task_type, :status, :upid, :target_node, :vmid, :data, :user_uuid)
        ');

        $taskId = $data['task_id'] ?? bin2hex(random_bytes(16));
        $success = $stmt->execute([
            'task_id'     => $taskId,
            'instance_id' => isset($data['instance_id']) ? (int) $data['instance_id'] : null,
            'task_type'   => $data['task_type'] ?? 'unknown',
            'status'      => $data['status'] ?? 'pending',
            'upid'        => $data['upid'] ?? '',
            'target_node' => $data['target_node'] ?? '',
            'vmid'        => isset($data['vmid']) ? (int) $data['vmid'] : 0,
            'data'        => isset($data['data']) ? json_encode($data['data'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
            'user_uuid'   => $data['user_uuid'] ?? null,
            'vm_node_id'  => isset($data['vm_node_id']) ? (int) $data['vm_node_id'] : null,
        ]);

        if ($success) {
            self::notifyRustRunner($taskId);
        }

        return $success;
    }

    public static function getByTaskId(string $taskId): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE task_id = :task_id LIMIT 1');
        $stmt->execute(['task_id' => $taskId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public static function getPendingTasks(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . " WHERE status IN ('pending', 'running') ORDER BY created_at ASC");
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    public static function update(string $taskId, array $data): bool
    {
        $pdo = Database::getPdoConnection();
        $sets = [];
        foreach ($data as $key => $value) {
            $sets[] = "$key = :$key";
        }
        if (empty($sets)) {
            return false;
        }

        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $sets) . ' WHERE task_id = :task_id';
        $stmt = $pdo->prepare($sql);
        $data['task_id'] = $taskId;

        return $stmt->execute($data);
    }

    public static function deleteByTaskId(string $taskId): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE task_id = :task_id');
        $stmt->execute(['task_id' => $taskId]);

        return $stmt->rowCount() > 0;
    }

    public static function getTasksByInstanceId(int $instanceId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE instance_id = :instance_id ORDER BY created_at DESC');
        $stmt->execute(['instance_id' => $instanceId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Publish notification to Redis for instant VM task processing by Rust runner.
     */
    private static function notifyRustRunner(string $taskId): void
    {
        try {
            $redis = \App\App::getInstance(true, false, false)->getRedisConnection();
            if ($redis) {
                $payload = json_encode(['task_id' => $taskId]);
                $redis->publish('featherpanel:vm:pending', $payload);
            }
        } catch (\Exception $e) {
            error_log('Failed to notify Rust runner for VM task: ' . $e->getMessage());
        }
    }
}
