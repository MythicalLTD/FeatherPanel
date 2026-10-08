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

use App\WebSpaceSubuserPermissions;

/**
 * WebSpace subuser model (featherpanel_webspace_subusers).
 */
class WebSpaceSubuser
{
    private static string $table = 'featherpanel_webspace_subusers';

    /**
     * @param array{user_id: int, webspace_id: int, permissions: array<int, string>|string} $data
     *
     * @return array<string, mixed>|null
     */
    public static function create(array $data): ?array
    {
        $required = ['user_id', 'webspace_id', 'permissions'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                return null;
            }
        }

        $userId = (int) $data['user_id'];
        $webspaceId = (int) $data['webspace_id'];
        if ($userId <= 0 || $webspaceId <= 0) {
            return null;
        }

        if (self::getByUserAndWebSpace($userId, $webspaceId)) {
            return null;
        }

        $permissions = self::normalizePermissions($data['permissions']);
        if ($permissions === null) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . ' (user_id, webspace_id, permissions)
             VALUES (:user_id, :webspace_id, :permissions)'
        );
        $ok = $stmt->execute([
            'user_id' => $userId,
            'webspace_id' => $webspaceId,
            'permissions' => json_encode(array_values($permissions)),
        ]);

        if (!$ok) {
            return null;
        }

        return self::getById((int) $pdo->lastInsertId());
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? self::hydrate($row) : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function getByUserAndWebSpace(int $userId, int $webspaceId): ?array
    {
        if ($userId <= 0 || $webspaceId <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . '
             WHERE user_id = :user_id AND webspace_id = :webspace_id
             LIMIT 1'
        );
        $stmt->execute([
            'user_id' => $userId,
            'webspace_id' => $webspaceId,
        ]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? self::hydrate($row) : null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listByWebSpaceId(int $webspaceId): array
    {
        if ($webspaceId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT s.*, u.username, u.email, u.first_name, u.last_name, u.uuid, u.avatar
             FROM ' . self::$table . ' s
             LEFT JOIN featherpanel_users u ON s.user_id = u.id
             WHERE s.webspace_id = :webspace_id
             ORDER BY s.created_at DESC'
        );
        $stmt->execute(['webspace_id' => $webspaceId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map([self::class, 'hydrate'], $rows);
    }

    /**
     * @return list<int>
     */
    public static function listWebSpaceIdsByUserId(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT webspace_id FROM ' . self::$table . ' WHERE user_id = :user_id'
        );
        $stmt->execute(['user_id' => $userId]);

        return array_map('intval', $stmt->fetchAll(\PDO::FETCH_COLUMN) ?: []);
    }

    /**
     * @param list<string>|string $permissions
     */
    public static function updatePermissions(int $id, array | string $permissions): bool
    {
        if ($id <= 0) {
            return false;
        }

        $normalized = self::normalizePermissions($permissions);
        if ($normalized === null) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . ' SET permissions = :permissions WHERE id = :id'
        );

        return $stmt->execute([
            'id' => $id,
            'permissions' => json_encode(array_values($normalized)),
        ]);
    }

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

    public static function deleteAllByUserId(int $userId): bool
    {
        if ($userId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE user_id = :user_id');

        return $stmt->execute(['user_id' => $userId]);
    }

    public static function hasPermission(int $userId, int $webspaceId, string $permission): bool
    {
        $subuser = self::getByUserAndWebSpace($userId, $webspaceId);
        if (!$subuser) {
            return false;
        }

        $permissions = $subuser['permissions'] ?? [];
        if (!is_array($permissions)) {
            return false;
        }

        if (in_array('*', $permissions, true)) {
            return true;
        }

        return in_array($permission, $permissions, true);
    }

    /**
     * @return list<string>
     */
    public static function getPermissionsList(int $userId, int $webspaceId): array
    {
        $subuser = self::getByUserAndWebSpace($userId, $webspaceId);
        if (!$subuser) {
            return [];
        }

        $permissions = $subuser['permissions'] ?? [];

        return is_array($permissions) ? array_values($permissions) : [];
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function hydrate(array $row): array
    {
        if (isset($row['permissions']) && is_string($row['permissions'])) {
            $decoded = json_decode($row['permissions'], true);
            $row['permissions'] = is_array($decoded) ? array_values($decoded) : [];
        } elseif (!isset($row['permissions']) || !is_array($row['permissions'])) {
            $row['permissions'] = [];
        }

        return $row;
    }

    /**
     * @param list<string>|string $permissions
     *
     * @return list<string>|null
     */
    private static function normalizePermissions(array | string $permissions): ?array
    {
        if (is_string($permissions)) {
            $decoded = json_decode($permissions, true);
            if (!is_array($decoded)) {
                return null;
            }
            $permissions = $decoded;
        }

        $allowed = WebSpaceSubuserPermissions::getAll();
        $out = [];
        foreach ($permissions as $perm) {
            $perm = (string) $perm;
            if ($perm === '*' || in_array($perm, $allowed, true)) {
                $out[] = $perm;
            }
        }

        return array_values(array_unique($out));
    }
}
