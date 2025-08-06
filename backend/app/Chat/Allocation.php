<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Chat;

class Allocation
{
    private static string $table = 'mythicalpanel_allocations';

    /**
     * Get all allocations with optional filtering and pagination.
     */
    public static function getAll(
        ?string $search = null,
        ?int $nodeId = null,
        ?int $serverId = null,
        int $limit = 10,
        int $offset = 0,
    ): array {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $params = [];
        $conditions = [];

        if ($search !== null) {
            $conditions[] = '(ip LIKE :search OR ip_alias LIKE :search OR notes LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($nodeId !== null) {
            $conditions[] = 'node_id = :node_id';
            $params['node_id'] = $nodeId;
        }

        if ($serverId !== null) {
            $conditions[] = 'server_id = :server_id';
            $params['server_id'] = $serverId;
        }

        if (!empty($conditions)) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }

        $sql .= ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';
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
    ): int {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $params = [];
        $conditions = [];

        if ($search !== null) {
            $conditions[] = '(ip LIKE :search OR ip_alias LIKE :search OR notes LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($nodeId !== null) {
            $conditions[] = 'node_id = :node_id';
            $params['node_id'] = $nodeId;
        }

        if ($serverId !== null) {
            $conditions[] = 'server_id = :server_id';
            $params['server_id'] = $serverId;
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

        return $stmt->execute($params);
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
     */
    public static function delete(int $id): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
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
            LEFT JOIN mythicalpanel_nodes n ON a.node_id = n.id 
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
            LEFT JOIN mythicalpanel_servers s ON a.server_id = s.id 
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
            LEFT JOIN mythicalpanel_nodes n ON a.node_id = n.id 
            LEFT JOIN mythicalpanel_servers s ON a.server_id = s.id 
            WHERE a.id = :id LIMIT 1
        ');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }
}
