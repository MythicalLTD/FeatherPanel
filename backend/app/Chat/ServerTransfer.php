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
     *
     * @param array $data Transfer data including:
     *                    - server_id: The server being transferred
     *                    - source_node_id: The source node ID (old_node in Pelican)
     *                    - destination_node_id: The destination node ID (new_node in Pelican)
     *                    - old_allocation: The server's primary allocation before transfer
     *                    - new_allocation: The new primary allocation on destination node
     *                    - old_additional_allocations: JSON array of additional allocation IDs before transfer
     *                    - new_additional_allocations: JSON array of additional allocation IDs on destination
     *                    - status: Transfer status (pending, in_progress, completed, failed)
     *                    - progress: Transfer progress (0-100)
     *                    - started_at: When the transfer started
     *                    - completed_at: When the transfer completed
     *                    - error: Error message if failed
     *                    - archived: Whether the transfer is archived
     *                    - successful: Whether the transfer was successful (null = in progress)
     */
    public static function create(array $data): int | false
    {
        $pdo = Database::getPdoConnection();

        $allowedFields = [
            'server_id',
            'source_node_id',
            'destination_node_id',
            'source_allocation_id',
            'destination_allocation_id',
            'old_allocation',
            'new_allocation',
            'old_additional_allocations',
            'new_additional_allocations',
            'status',
            'progress',
            'started_at',
            'completed_at',
            'error',
            'archived',
            'successful',
        ];

        // Encode JSON fields if they are arrays
        if (isset($data['old_additional_allocations']) && is_array($data['old_additional_allocations'])) {
            $data['old_additional_allocations'] = json_encode($data['old_additional_allocations']);
        }
        if (isset($data['new_additional_allocations']) && is_array($data['new_additional_allocations'])) {
            $data['new_additional_allocations'] = json_encode($data['new_additional_allocations']);
        }

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
     * Get transfer by server ID (most recent).
     */
    public static function getByServerId(int $serverId): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY created_at DESC LIMIT 1');
        $stmt->execute(['server_id' => $serverId]);

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($result) {
            $result = self::decodeJsonFields($result);
        }

        return $result ?: null;
    }

    /**
     * Get active (in-progress) transfer by server ID.
     * Active transfers have successful = NULL (not yet completed).
     */
    public static function getActiveByServerId(int $serverId): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id AND successful IS NULL ORDER BY created_at DESC LIMIT 1');
        $stmt->execute(['server_id' => $serverId]);

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($result) {
            $result = self::decodeJsonFields($result);
        }

        return $result ?: null;
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
            'source_allocation_id',
            'destination_allocation_id',
            'old_allocation',
            'new_allocation',
            'old_additional_allocations',
            'new_additional_allocations',
            'archived',
            'successful',
        ];

        // Encode JSON fields if they are arrays
        if (isset($data['old_additional_allocations']) && is_array($data['old_additional_allocations'])) {
            $data['old_additional_allocations'] = json_encode($data['old_additional_allocations']);
        }
        if (isset($data['new_additional_allocations']) && is_array($data['new_additional_allocations'])) {
            $data['new_additional_allocations'] = json_encode($data['new_additional_allocations']);
        }

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
            'source_allocation_id',
            'destination_allocation_id',
            'old_allocation',
            'new_allocation',
            'old_additional_allocations',
            'new_additional_allocations',
            'archived',
            'successful',
        ];

        // Encode JSON fields if they are arrays
        if (isset($data['old_additional_allocations']) && is_array($data['old_additional_allocations'])) {
            $data['old_additional_allocations'] = json_encode($data['old_additional_allocations']);
        }
        if (isset($data['new_additional_allocations']) && is_array($data['new_additional_allocations'])) {
            $data['new_additional_allocations'] = json_encode($data['new_additional_allocations']);
        }

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
     * Get all active transfers (where successful is NULL).
     */
    public static function getActiveTransfers(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE successful IS NULL ORDER BY created_at ASC');
        $stmt->execute();

        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map([self::class, 'decodeJsonFields'], $results);
    }

    /**
     * Check if server has an active transfer (where successful is NULL).
     */
    public static function hasActiveTransfer(int $serverId): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE server_id = :server_id AND successful IS NULL');
        $stmt->execute(['server_id' => $serverId]);

        return (int) $stmt->fetchColumn() > 0;
    }

    /**
     * Mark transfer as successful.
     */
    public static function markSuccessful(int $serverId): bool
    {
        return self::updateByServerId($serverId, [
            'successful' => 1,
            'status' => 'completed',
            'progress' => 100.0,
            'completed_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Mark transfer as failed.
     */
    public static function markFailed(int $serverId, string $error = 'Unknown error'): bool
    {
        return self::updateByServerId($serverId, [
            'successful' => 0,
            'status' => 'failed',
            'completed_at' => date('Y-m-d H:i:s'),
            'error' => $error,
        ]);
    }

    /**
     * Decode JSON fields in transfer record.
     */
    private static function decodeJsonFields(array $transfer): array
    {
        if (isset($transfer['old_additional_allocations']) && is_string($transfer['old_additional_allocations'])) {
            $transfer['old_additional_allocations'] = json_decode($transfer['old_additional_allocations'], true) ?? [];
        }
        if (isset($transfer['new_additional_allocations']) && is_string($transfer['new_additional_allocations'])) {
            $transfer['new_additional_allocations'] = json_decode($transfer['new_additional_allocations'], true) ?? [];
        }

        return $transfer;
    }
}
