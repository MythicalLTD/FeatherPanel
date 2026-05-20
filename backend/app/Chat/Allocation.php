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
     * Get allocation by server ID and port.
     */
    public static function getByServerIdAndPort(int $serverId, int $port): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id AND port = :port LIMIT 1');
        $stmt->execute([
            'server_id' => $serverId,
            'port' => $port,
        ]);

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $result ?: null;
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
     * Count free (unassigned) allocations on a specific node.
     */
    public static function getFreeCountByNodeId(int $nodeId): int
    {
        if ($nodeId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE node_id = :node_id AND server_id IS NULL');
        $stmt->execute(['node_id' => $nodeId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Pick free allocation IDs on a node for assignment (e.g. server transfers).
     *
     * @param array<int> $excludeIds Allocation IDs to skip (already reserved in the same batch)
     *
     * @return array<int>
     */
    public static function pickFreeAllocationIdsForNode(int $nodeId, int $count, array $excludeIds = []): array
    {
        if ($nodeId <= 0 || $count <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT id FROM ' . self::$table . ' WHERE node_id = :node_id AND server_id IS NULL';
        $params = ['node_id' => $nodeId];

        $excludeIds = array_values(array_filter(
            array_map('intval', $excludeIds),
            fn (int $id) => $id > 0
        ));

        if (!empty($excludeIds)) {
            $placeholders = implode(',', array_fill(0, count($excludeIds), '?'));
            $sql .= ' AND id NOT IN (' . $placeholders . ')';
        }

        $sql .= ' ORDER BY ip ASC, port ASC LIMIT ' . (int) $count;

        $stmt = $pdo->prepare($sql);
        $stmt->bindValue('node_id', $nodeId, \PDO::PARAM_INT);

        $paramIndex = 1;
        foreach ($excludeIds as $excludeId) {
            $stmt->bindValue($paramIndex, $excludeId, \PDO::PARAM_INT);
            ++$paramIndex;
        }

        $stmt->execute();

        return array_map('intval', $stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    /**
     * Create a new allocation.
     */
    public static function create(array $data): int | false
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

        // Handle optional ID for migrations (same pattern as Location.php)
        $hasId = false;
        if (isset($data['id'])) {
            // Accept both int and numeric string IDs
            if (is_int($data['id']) || (is_string($data['id']) && ctype_digit((string) $data['id']))) {
                $idValue = (int) $data['id'];
                if ($idValue > 0) {
                    $insert['id'] = $idValue;
                    $fields[] = 'id';
                    $hasId = true;
                }
            }
        }

        $pdo = Database::getPdoConnection();
        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($insert)) {
            return $hasId ? $insert['id'] : (int) $pdo->lastInsertId();
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
    public static function assignToServer(int $allocationId, int $serverId, ?\PDO $pdo = null): bool
    {
        $pdo ??= Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . ' SET server_id = :server_id WHERE id = :id AND server_id IS NULL'
        );
        if (
            !$stmt->execute([
                'id' => $allocationId,
                'server_id' => $serverId,
            ])
        ) {
            return false;
        }

        return $stmt->rowCount() > 0;
    }

    /**
     * Unassign allocation from server.
     */
    public static function unassignFromServer(int $allocationId, ?\PDO $pdo = null): bool
    {
        $pdo ??= Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET server_id = NULL WHERE id = :id');

        return $stmt->execute(['id' => $allocationId]);
    }

    /**
     * Unassign multiple allocations from their servers.
     *
     * @param array $allocationIds Array of allocation IDs to unassign
     *
     * @return bool True if all allocations were unassigned successfully
     */
    public static function unassignMultiple(array $allocationIds): bool
    {
        if (empty($allocationIds)) {
            return true;
        }

        // Filter out null/invalid values
        $allocationIds = array_filter($allocationIds, fn ($id) => $id !== null && is_numeric($id) && (int) $id > 0);
        if (empty($allocationIds)) {
            return true;
        }

        $pdo = Database::getPdoConnection();
        $placeholders = implode(',', array_fill(0, count($allocationIds), '?'));
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET server_id = NULL WHERE id IN (' . $placeholders . ')');

        return $stmt->execute(array_values($allocationIds));
    }

    /**
     * Assign multiple allocations to a server.
     *
     * @param int $serverId The server ID to assign allocations to
     * @param array $allocationIds Array of allocation IDs to assign
     *
     * @return bool True if all allocations were assigned successfully
     */
    public static function assignMultipleToServer(int $serverId, array $allocationIds): bool
    {
        if (empty($allocationIds)) {
            return true;
        }

        // Filter out null/invalid values
        $allocationIds = array_filter($allocationIds, fn ($id) => $id !== null && is_numeric($id) && (int) $id > 0);
        if (empty($allocationIds)) {
            return true;
        }

        $pdo = Database::getPdoConnection();
        $placeholders = implode(',', array_fill(0, count($allocationIds), '?'));
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET server_id = ? WHERE id IN (' . $placeholders . ') AND server_id IS NULL');

        $params = array_merge([$serverId], array_values($allocationIds));

        return $stmt->execute($params);
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
        $checkStmt = $pdo->prepare('SELECT id FROM ' . self::$table . " WHERE id IN ($placeholders) AND server_id IS NOT NULL");
        $checkStmt->execute($ids);
        $assignedIds = $checkStmt->fetchAll(\PDO::FETCH_COLUMN);

        // Only delete allocations that are NOT assigned
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . " WHERE id IN ($placeholders) AND server_id IS NULL");
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
     * @param string|null $ip Optional IP address to filter deletions by subnet/IP
     *
     * @return int Number of allocations deleted
     */
    public static function deleteUnused(?int $nodeId = null, ?string $ip = null): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE server_id IS NULL';
        $params = [];

        if ($nodeId !== null) {
            $sql .= ' AND node_id = :node_id';
            $params['node_id'] = $nodeId;
        }

        if ($ip !== null && $ip !== '') {
            $sql .= ' AND ip = :ip';
            $params['ip'] = $ip;
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
     * Count allocations matching a node and IP address.
     */
    public static function countByNodeAndIp(int $nodeId, string $ip): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE node_id = :node_id AND ip = :ip');
        $stmt->execute([
            'node_id' => $nodeId,
            'ip' => $ip,
        ]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Update the IP and/or IP alias for every allocation on a node using a specific IP.
     */
    public static function updateAddressByNodeAndIp(int $nodeId, string $fromIp, ?string $toIp, mixed $ipAlias, bool $updateAlias): array | false
    {
        $set = [];
        $params = [
            'node_id' => $nodeId,
            'from_ip' => $fromIp,
        ];

        if ($toIp !== null) {
            $set[] = 'ip = :to_ip';
            $params['to_ip'] = $toIp;
        }

        if ($updateAlias) {
            $set[] = 'ip_alias = :ip_alias';
            $params['ip_alias'] = $ipAlias;
        }

        if (empty($set)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $deletedTargetConflicts = 0;
        $deletedSourceConflicts = 0;
        $assignedConflictCount = 0;

        try {
            $pdo->beginTransaction();

            if ($toIp !== null && $toIp !== $fromIp) {
                $conflictStmt = $pdo->prepare('
                    SELECT
                        src.id AS source_id,
                        src.server_id AS source_server_id,
                        dst.id AS target_id,
                        dst.server_id AS target_server_id
                    FROM ' . self::$table . ' src
                    INNER JOIN ' . self::$table . ' dst
                        ON dst.node_id = src.node_id
                        AND dst.ip = :to_ip
                        AND dst.port = src.port
                    WHERE src.node_id = :node_id
                      AND src.ip = :from_ip
                ');
                $conflictStmt->execute([
                    'node_id' => $nodeId,
                    'from_ip' => $fromIp,
                    'to_ip' => $toIp,
                ]);
                $conflicts = $conflictStmt->fetchAll(\PDO::FETCH_ASSOC);

                $deleteTargetStmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id AND server_id IS NULL');
                $deleteSourceStmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id AND server_id IS NULL');
                $updateTargetAliasStmt = $pdo->prepare('UPDATE ' . self::$table . ' SET ip_alias = :ip_alias WHERE id = :id');

                foreach ($conflicts as $conflict) {
                    $sourceAssigned = $conflict['source_server_id'] !== null;
                    $targetAssigned = $conflict['target_server_id'] !== null;

                    if ($sourceAssigned && $targetAssigned) {
                        ++$assignedConflictCount;
                        continue;
                    }

                    if (!$targetAssigned) {
                        $deleteTargetStmt->execute(['id' => (int) $conflict['target_id']]);
                        $deletedTargetConflicts += $deleteTargetStmt->rowCount();
                    } else {
                        $deleteSourceStmt->execute(['id' => (int) $conflict['source_id']]);
                        $deletedSourceConflicts += $deleteSourceStmt->rowCount();

                        if ($updateAlias) {
                            $updateTargetAliasStmt->execute([
                                'id' => (int) $conflict['target_id'],
                                'ip_alias' => $ipAlias,
                            ]);
                        }
                    }
                }

                if ($assignedConflictCount > 0) {
                    $pdo->rollBack();

                    return [
                        'assigned_conflict_count' => $assignedConflictCount,
                    ];
                }
            }

            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET ' . implode(', ', $set) . ' WHERE node_id = :node_id AND ip = :from_ip');
            $stmt->execute($params);
            $updatedCount = $stmt->rowCount();
            $pdo->commit();

            return [
                'updated_count' => $updatedCount,
                'deleted_target_conflicts' => $deletedTargetConflicts,
                'deleted_source_conflicts' => $deletedSourceConflicts,
                'assigned_conflict_count' => 0,
            ];
        } catch (\Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('Failed to bulk update allocation address: ' . $e->getMessage());

            return false;
        }
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

    /**
     * Unassign all allocations for a specific server (set server_id to NULL).
     */
    public static function unassignAllByServerId(int $serverId, ?\PDO $pdo = null): bool
    {
        $pdo ??= Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET server_id = NULL WHERE server_id = :server_id');

        return $stmt->execute(['server_id' => $serverId]);
    }

    /**
     * Clean up orphaned allocations (allocations assigned to non-existent servers).
     * Sets server_id to NULL for any allocation where the referenced server_id does not exist.
     */
    public static function cleanupOrphans(): int
    {
        $pdo = Database::getPdoConnection();
        // Update allocations where server_id is set but the server does not exist
        $sql = 'UPDATE ' . self::$table . ' a 
                LEFT JOIN featherpanel_servers s ON a.server_id = s.id 
                SET a.server_id = NULL 
                WHERE a.server_id IS NOT NULL AND s.id IS NULL';

        $stmt = $pdo->prepare($sql);
        $stmt->execute();

        return $stmt->rowCount();
    }
}
