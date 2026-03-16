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

/**
 * VmSubuser model for managing VM instance subusers.
 */
class VmSubuser
{
    private static string $table = 'featherpanel_vm_subusers';

    /**
     * Get subuser by user ID and VM instance ID.
     */
    public static function getSubuserByUserAndVmInstance(int $userId, int $vmInstanceId): ?array
    {
        if ($userId <= 0 || $vmInstanceId <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT * FROM ' . self::$table . '
            WHERE user_id = :user_id AND vm_instance_id = :vm_instance_id
            LIMIT 1
        ');
        $stmt->execute([
            'user_id' => $userId,
            'vm_instance_id' => $vmInstanceId,
        ]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get all subusers for a VM instance.
     */
    public static function getSubusersByVmInstance(int $vmInstanceId): array
    {
        if ($vmInstanceId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT s.*, u.username, u.email, u.first_name, u.last_name, u.avatar
            FROM ' . self::$table . ' s
            LEFT JOIN featherpanel_users u ON s.user_id = u.id
            WHERE s.vm_instance_id = :vm_instance_id
            ORDER BY s.created_at DESC
        ');
        $stmt->execute(['vm_instance_id' => $vmInstanceId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Get all VM instances accessible by a user (as subuser).
     */
    public static function getVmInstancesByUser(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT vm_instance_id FROM ' . self::$table . '
            WHERE user_id = :user_id
        ');
        $stmt->execute(['user_id' => $userId]);

        return array_column($stmt->fetchAll(\PDO::FETCH_ASSOC), 'vm_instance_id');
    }

    /**
     * Create a new subuser.
     */
    public static function create(array $data): ?array
    {
        $required = ['user_id', 'vm_instance_id', 'permissions'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                return null;
            }
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            INSERT INTO ' . self::$table . ' (user_id, vm_instance_id, permissions)
            VALUES (:user_id, :vm_instance_id, :permissions)
        ');

        $permissions = is_array($data['permissions'])
            ? json_encode($data['permissions'])
            : $data['permissions'];

        $stmt->execute([
            'user_id' => (int) $data['user_id'],
            'vm_instance_id' => (int) $data['vm_instance_id'],
            'permissions' => $permissions,
        ]);

        $id = (int) $pdo->lastInsertId();

        return self::getById($id);
    }

    /**
     * Get subuser by ID.
     */
    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Update subuser permissions.
     */
    public static function update(int $id, array $data): bool
    {
        if ($id <= 0 || empty($data)) {
            return false;
        }

        $allowed = ['permissions'];
        $updates = [];
        $params = ['id' => $id];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $updates[] = "$field = :$field";
                $params[$field] = $field === 'permissions' && is_array($data[$field])
                    ? json_encode($data[$field])
                    : $data[$field];
            }
        }

        if (empty($updates)) {
            return true;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $updates) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /**
     * Delete a subuser.
     */
    public static function delete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Delete all subusers for a VM instance.
     */
    public static function deleteByVmInstance(int $vmInstanceId): bool
    {
        if ($vmInstanceId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE vm_instance_id = :vm_instance_id');
        $stmt->execute(['vm_instance_id' => $vmInstanceId]);

        return true;
    }

    /**
     * Check if user has specific permission for a VM instance.
     */
    public static function hasPermission(int $userId, int $vmInstanceId, string $permission): bool
    {
        $subuser = self::getSubuserByUserAndVmInstance($userId, $vmInstanceId);
        if (!$subuser) {
            return false;
        }

        $permissions = json_decode($subuser['permissions'] ?? '[]', true);
        if (!is_array($permissions)) {
            return false;
        }

        return in_array($permission, $permissions, true);
    }
}
