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

class Allocation
{
    private static string $table = 'featherpanel_allocations';

    /**
     * Get all allocations with optional filtering and pagination.
     */
    public static function getAll(
        ?string $search = null,
        ?int $nodeId = null,
        ?int $serverId = null,
        int $limit = 10,
        int $offset = 0,
        bool $notUsed = false,
    ): array {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT a.*, s.name as server_name, s.uuid as server_uuid 
                FROM ' . self::$table . ' a 
                LEFT JOIN featherpanel_servers s ON a.server_id = s.id';
        $params = [];
        $conditions = [];

        if ($search !== null) {
            $conditions[] = '(a.ip LIKE :search OR a.ip_alias LIKE :search OR a.notes LIKE :search OR CAST(a.port AS CHAR) LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($nodeId !== null) {
            $conditions[] = 'a.node_id = :node_id';
            $params['node_id'] = $nodeId;
        }

        if ($serverId !== null) {
            $conditions[] = 'a.server_id = :server_id';
            $params['server_id'] = $serverId;
        }

        if ($notUsed) {
            $conditions[] = 'a.server_id IS NULL';
        }

        if (!empty($conditions)) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }

        $sql .= ' ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get allocation by ID.
     */
    public static function getById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getAllocationById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get allocations by node ID.
     */
    public static function getByNodeId(int $nodeId, int $limit = 10, int $offset = 0): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE node_id = :node_id ORDER BY created_at DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue('node_id', $nodeId, \PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get allocations by server ID.
     */
    public static function getByServerId(int $serverId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY created_at DESC');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get available allocations (not assigned to any server).
     */
    public static function getAvailable(int $limit = 10, int $offset = 0): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id IS NULL ORDER BY created_at DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get count of allocations with optional filtering.
     */
    public static function getCount(
        ?string $search = null,
        ?int $nodeId = null,
        ?int $serverId = null,
        bool $notUsed = false,
    ): int {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table . ' a';
        $params = [];
        $conditions = [];

        if ($search !== null) {
            $conditions[] = '(a.ip LIKE :search OR a.ip_alias LIKE :search OR a.notes LIKE :search OR CAST(a.port AS CHAR) LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($nodeId !== null) {
            $conditions[] = 'a.node_id = :node_id';
            $params['node_id'] = $nodeId;
        }

        if ($serverId !== null) {
            $conditions[] = 'a.server_id = :server_id';
            $params['server_id'] = $serverId;
        }

        if ($notUsed) {
            $conditions[] = 'a.server_id IS NULL';
        }

        if (!empty($conditions)) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }

        $stmt = $pdo->prepare($sql);
        if (!empty($params)) {
            $stmt->execute($params);
        } else {
            $stmt->execute();
        }

        return (int) $stmt->fetchColumn();
    }

    /**
     * Get count of available allocations.
     */
    public static function getAvailableCount(): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE server_id IS NULL');
        $stmt->execute();

        return (int) $stmt->fetchColumn();
    }

    /**
     * Create a new allocation.
     */
    public static function create(array $data): int|false
    {
        $fields = ['node_id', 'ip', 'ip_alias', 'port', 'server_id', 'notes'];
        $insert = [];

        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $insert[$field] = $data[$field];
            } else {
                // Set default values for optional fields
                if ($field === 'ip_alias' || $field === 'notes') {
                    $insert[$field] = null;
                } elseif ($field === 'server_id') {
                    $insert[$field] = null;
                }
            }
        }

        // Validate required fields
        if (!isset($insert['node_id']) || !isset($insert['ip']) || !isset($insert['port'])) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'INSERT INTO ' . self::$table . ' (node_id, ip, ip_alias, port, server_id, notes) VALUES (:node_id, :ip, :ip_alias, :port, :server_id, :notes)';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($insert)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Create multiple allocations in batch.
     */
    public static function createBatch(array $allocations): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'INSERT INTO ' . self::$table . ' (node_id, ip, ip_alias, port, server_id, notes) VALUES (:node_id, :ip, :ip_alias, :port, :server_id, :notes)';
        $stmt = $pdo->prepare($sql);

        $createdIds = [];
        $pdo->beginTransaction();

        try {
            foreach ($allocations as $allocation) {
                $fields = ['node_id', 'ip', 'ip_alias', 'port', 'server_id', 'notes'];
                $insert = [];

                foreach ($fields as $field) {
                    if (isset($allocation[$field])) {
                        $insert[$field] = $allocation[$field];
                    } else {
                        // Set default values for optional fields
                        if ($field === 'ip_alias' || $field === 'notes') {
                            $insert[$field] = null;
                        } elseif ($field === 'server_id') {
                            $insert[$field] = null;
                        }
                    }
                }

                // Validate required fields
                if (!isset($insert['node_id']) || !isset($insert['ip']) || !isset($insert['port'])) {
                    continue;
                }

                if ($stmt->execute($insert)) {
                    $createdIds[] = (int) $pdo->lastInsertId();
                }
            }

            $pdo->commit();

            return $createdIds;
        } catch (\Exception $e) {
            $pdo->rollBack();

            return [];
        }
    }

    /**
     * Update an allocation.
     */
    public static function update(int $id, array $data): bool
    {
        $fields = ['node_id', 'ip', 'ip_alias', 'port', 'server_id', 'notes'];
        $set = [];
        $params = ['id' => $id];

        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $set[] = "`$field` = :$field";
                $params[$field] = $data[$field];
            }
        }

        if (empty($set)) {
            return false;
        }

        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $set) . ' WHERE id = :id';
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare($sql);

        try {
            return $stmt->execute($params);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update allocation: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Assign allocation to a server.
     */
    public static function assignToServer(int $allocationId, int $serverId): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET server_id = :server_id WHERE id = :id');

        return $stmt->execute([
            'id' => $allocationId,
            'server_id' => $serverId,
        ]);
    }

    /**
     * Unassign allocation from server.
     */
    public static function unassignFromServer(int $allocationId): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET server_id = NULL WHERE id = :id');

        return $stmt->execute(['id' => $allocationId]);
    }

    /**
     * Delete an allocation.
     * Only allows deletion if the allocation is not assigned to a server.
     */
    public static function delete(int $id): bool
    {
        // Check if allocation can be deleted
        if (!self::canDelete($id)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id AND server_id IS NULL');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Check if an allocation can be safely deleted.
     * An allocation can only be deleted if it's not assigned to any server.
     *
     * @param int $id Allocation ID
     *
     * @return bool True if allocation can be deleted
     */
    public static function canDelete(int $id): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT server_id FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$result) {
            return false; // Allocation doesn't exist
        }

        // Can only delete if not assigned to a server
        return $result['server_id'] === null;
    }

    /**
     * Delete multiple allocations by their IDs.
     * Only deletes allocations that are not assigned to servers.
     *
     * @param array $ids Array of allocation IDs to delete
     *
     * @return array ['deleted' => count, 'skipped' => count, 'skipped_ids' => []]
     */
    public static function deleteBulk(array $ids): array
    {
        if (empty($ids)) {
            return ['deleted' => 0, 'skipped' => 0, 'skipped_ids' => []];
        }

        $pdo = Database::getPdoConnection();

        // Ensure all IDs are integers
        $ids = array_map('intval', $ids);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        // Find which allocations are assigned to servers (cannot be deleted)
        $checkStmt = $pdo->prepare("SELECT id FROM " . self::$table . " WHERE id IN ($placeholders) AND server_id IS NOT NULL");
        $checkStmt->execute($ids);
        $assignedIds = $checkStmt->fetchAll(\PDO::FETCH_COLUMN);

        // Only delete allocations that are NOT assigned
        $stmt = $pdo->prepare("DELETE FROM " . self::$table . " WHERE id IN ($placeholders) AND server_id IS NULL");
        $stmt->execute($ids);
        $deletedCount = $stmt->rowCount();

        return [
            'deleted' => $deletedCount,
            'skipped' => count($assignedIds),
            'skipped_ids' => $assignedIds,
        ];
    }

    /**
     * Delete all unused allocations (where server_id IS NULL).
     *
     * @param int|null $nodeId Optional node ID to filter deletions
     *
     * @return int Number of allocations deleted
     */
    public static function deleteUnused(?int $nodeId = null): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE server_id IS NULL';
        $params = [];

        if ($nodeId !== null) {
            $sql .= ' AND node_id = :node_id';
            $params['node_id'] = $nodeId;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount();
    }

    /**
     * Check if IP and port combination is unique for a node.
     */
    public static function isUniqueIpPort(int $nodeId, string $ip, int $port, ?int $excludeId = null): bool
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table . ' WHERE node_id = :node_id AND ip = :ip AND port = :port';
        $params = [
            'node_id' => $nodeId,
            'ip' => $ip,
            'port' => $port,
        ];

        if ($excludeId !== null) {
            $sql .= ' AND id != :exclude_id';
            $params['exclude_id'] = $excludeId;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn() === 0;
    }

    /**
     * Get allocation with node information.
     */
    public static function getWithNode(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT a.*, n.name as node_name, n.fqdn as node_fqdn 
            FROM ' . self::$table . ' a 
            LEFT JOIN featherpanel_nodes n ON a.node_id = n.id 
            WHERE a.id = :id LIMIT 1
        ');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get allocation with server information.
     */
    public static function getWithServer(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT a.*, s.name as server_name, s.uuid as server_uuid 
            FROM ' . self::$table . ' a 
            LEFT JOIN featherpanel_servers s ON a.server_id = s.id 
            WHERE a.id = :id LIMIT 1
        ');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get allocation with both node and server information.
     */
    public static function getWithNodeAndServer(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT a.*, n.name as node_name, n.fqdn as node_fqdn, s.name as server_name, s.uuid as server_uuid 
            FROM ' . self::$table . ' a 
            LEFT JOIN featherpanel_nodes n ON a.node_id = n.id 
            LEFT JOIN featherpanel_servers s ON a.server_id = s.id 
            WHERE a.id = :id LIMIT 1
        ');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function deleteAllAllocationsByServerId(int $serverId): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE server_id = :server_id');

        return $stmt->execute(['server_id' => $serverId]);
    }

    public static function deleteAllAllocationsByNodeId(int $nodeId): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE node_id = :node_id');

        return $stmt->execute(['node_id' => $nodeId]);
    }
}
