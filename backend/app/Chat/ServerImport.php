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
 * ServerImport model for CRUD operations on the featherpanel_server_imports table.
 */
class ServerImport
{
    private static string $table = 'featherpanel_server_imports';

    /**
     * Create a new import record.
     *
     * @param array<string,mixed> $data
     *
     * @return int|false The new import's ID or false on failure
     */
    public static function create(array $data): int | false
    {
        $fields = [
            'server_id',
            'user',
            'host',
            'port',
            'source_location',
            'destination_location',
            'type',
            'wipe',
            'wipe_all_files',
            'status',
        ];
        $insert = [];
        foreach ($fields as $field) {
            $insert[$field] = $data[$field] ?? null;
        }

        // Set defaults
        $insert['status'] = $insert['status'] ?? 'pending';
        $insert['wipe'] = $insert['wipe'] ?? 0;
        $insert['wipe_all_files'] = $insert['wipe_all_files'] ?? 0;

        $pdo = Database::getPdoConnection();
        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($insert)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Get imports by server ID.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function getByServerId(int $serverId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY created_at DESC');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get import by ID.
     *
     * @return array<string,mixed>|null
     */
    public static function getById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get the most recent pending/importing import for a server.
     *
     * @return array<string,mixed>|null
     */
    public static function getLatestActiveByServerId(int $serverId): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id AND status IN (\'pending\', \'importing\') ORDER BY created_at DESC LIMIT 1'
        );
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Update an import record.
     *
     * @param array<string,mixed> $data
     */
    public static function update(int $id, array $data): bool
    {
        if (empty($data)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $set = implode(', ', array_map(fn ($f) => "`$f` = :$f", $fields));
        $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $data['id'] = $id;

        return $stmt->execute($data);
    }
}
