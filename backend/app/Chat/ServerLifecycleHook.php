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
 * Server lifecycle hook model for the featherpanel_server_lifecycle_hooks table.
 */
class ServerLifecycleHook
{
    private static string $table = 'featherpanel_server_lifecycle_hooks';

    /**
     * Get an active lifecycle hook by server id and type.
     */
    public static function getActiveHookByServerAndType(int $serverId, string $hookType): ?array
    {
        if ($serverId <= 0 || trim($hookType) === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id AND hook_type = :hook_type AND is_active = 1 LIMIT 1');
        $stmt->execute([
            'server_id' => $serverId,
            'hook_type' => $hookType,
        ]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get any hook by server id and type.
     */
    public static function getHookByServerAndType(int $serverId, string $hookType): ?array
    {
        if ($serverId <= 0 || trim($hookType) === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id AND hook_type = :hook_type LIMIT 1');
        $stmt->execute([
            'server_id' => $serverId,
            'hook_type' => $hookType,
        ]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get hook by id.
     */
    public static function getHookById(int $hookId): ?array
    {
        if ($hookId <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $hookId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get all hooks for a server.
     */
    public static function getHooksByServerId(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY hook_type ASC');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Upsert a hook by server id and hook type.
     */
    public static function upsertHookByServerAndType(int $serverId, string $hookType, int $isActive = 1): int | false
    {
        if ($serverId <= 0 || trim($hookType) === '') {
            return false;
        }

        $existing = self::getHookByServerAndType($serverId, $hookType);
        if ($existing) {
            $updated = self::updateHookById((int) $existing['id'], [
                'is_active' => $isActive,
            ]);

            return $updated ? (int) $existing['id'] : false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('INSERT INTO ' . self::$table . ' (server_id, hook_type, is_active) VALUES (:server_id, :hook_type, :is_active)');
        $ok = $stmt->execute([
            'server_id' => $serverId,
            'hook_type' => $hookType,
            'is_active' => $isActive,
        ]);

        if (!$ok) {
            return false;
        }

        return (int) $pdo->lastInsertId();
    }

    /**
     * Update hook fields by id.
     */
    public static function updateHookById(int $hookId, array $data): bool
    {
        if ($hookId <= 0 || empty($data)) {
            return false;
        }

        unset($data['id'], $data['server_id'], $data['hook_type'], $data['created_at'], $data['updated_at']);
        if (empty($data)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $setClause = implode(', ', array_map(fn ($field) => $field . ' = :' . $field, $fields));
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET ' . $setClause . ' WHERE id = :id');

        $params = $data;
        $params['id'] = $hookId;

        return $stmt->execute($params);
    }

    /**
     * Delete hook by id.
     */
    public static function deleteHookById(int $hookId): bool
    {
        if ($hookId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $hookId]);
    }
}
