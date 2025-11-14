<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Chat;

use App\App;

class ServerTransfer
{
    private static string $table = 'featherpanel_server_transfers';

    /**
     * Create a new server transfer record.
     */
    public static function create(array $data): int | false
    {
        $pdo = Database::getPdoConnection();

        $allowedFields = [
            'server_id',
            'source_node_id',
            'destination_node_id',
            'destination_allocation_id',
            'status',
            'progress',
            'started_at',
            'completed_at',
            'error',
        ];

        $filteredData = array_intersect_key($data, array_flip($allowedFields));

        if (empty($filteredData)) {
            App::getInstance(true)->getLogger()->error('No valid data provided for server transfer creation');

            return false;
        }

        $fields = array_keys($filteredData);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (`' . implode('`,`', $fields) . '`) VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($filteredData)) {
            return (int) $pdo->lastInsertId();
        }

        App::getInstance(true)->getLogger()->error('Failed to create server transfer: ' . json_encode($stmt->errorInfo()));

        return false;
    }

    /**
     * Get transfer by server ID.
     */
    public static function getByServerId(int $serverId): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY created_at DESC LIMIT 1');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get transfer by ID.
     */
    public static function getById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Update transfer by server ID.
     */
    public static function updateByServerId(int $serverId, array $data): bool
    {
        $pdo = Database::getPdoConnection();

        $allowedFields = [
            'status',
            'progress',
            'started_at',
            'completed_at',
            'error',
            'destination_allocation_id',
        ];

        $filteredData = array_intersect_key($data, array_flip($allowedFields));

        if (empty($filteredData)) {
            return false;
        }

        $setParts = [];
        foreach ($filteredData as $field => $value) {
            $setParts[] = "`{$field}` = :{$field}";
        }

        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $setParts) . ' WHERE server_id = :server_id ORDER BY created_at DESC LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $filteredData['server_id'] = $serverId;

        return $stmt->execute($filteredData);
    }

    /**
     * Update transfer by ID.
     */
    public static function updateById(int $id, array $data): bool
    {
        $pdo = Database::getPdoConnection();

        $allowedFields = [
            'status',
            'progress',
            'started_at',
            'completed_at',
            'error',
            'destination_allocation_id',
        ];

        $filteredData = array_intersect_key($data, array_flip($allowedFields));

        if (empty($filteredData)) {
            return false;
        }

        $setParts = [];
        foreach ($filteredData as $field => $value) {
            $setParts[] = "`{$field}` = :{$field}";
        }

        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $setParts) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $filteredData['id'] = $id;

        return $stmt->execute($filteredData);
    }

    /**
     * Delete transfer by server ID.
     */
    public static function deleteByServerId(int $serverId): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE server_id = :server_id');

        return $stmt->execute(['server_id' => $serverId]);
    }

    /**
     * Delete transfer by ID.
     */
    public static function deleteById(int $id): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get all active transfers.
     */
    public static function getActiveTransfers(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . " WHERE status IN ('pending', 'in_progress') ORDER BY created_at ASC");
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Check if server has an active transfer.
     */
    public static function hasActiveTransfer(int $serverId): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . " WHERE server_id = :server_id AND status IN ('pending', 'in_progress')");
        $stmt->execute(['server_id' => $serverId]);

        return (int) $stmt->fetchColumn() > 0;
    }
}
