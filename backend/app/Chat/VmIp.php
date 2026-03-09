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

class VmIp
{
    private static string $table = 'featherpanel_vm_ips';

    /**
     * Get all IPs for a VM node with optional pagination.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getByVmNodeId(int $vmNodeId, int $limit = 50, int $offset = 0): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE vm_node_id = :vm_node_id ORDER BY created_at DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue('vm_node_id', $vmNodeId, \PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function getById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get IPs for a VM node that are not assigned to any VM instance (free pool).
     * Excludes the primary IP (Proxmox host) so it is never offered for VM assignment.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getFreeIpsForNode(int $vmNodeId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT ip.* FROM ' . self::$table . ' ip
            WHERE ip.vm_node_id = :vm_node_id
            AND ip.is_primary = \'false\'
            AND ip.id NOT IN (
                SELECT vm_ip_id FROM featherpanel_vm_instances
                WHERE vm_ip_id IS NOT NULL
            )
            ORDER BY ip.ip ASC
        ');
        $stmt->execute(['vm_node_id' => $vmNodeId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get IP IDs that are assigned to a VM instance (in use) for a given node.
     *
     * @return array<int, int>
     */
    public static function getInUseIpIdsForNode(int $vmNodeId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT DISTINCT vm_ip_id FROM featherpanel_vm_instances
            WHERE vm_node_id = :vm_node_id AND vm_ip_id IS NOT NULL
        ');
        $stmt->execute(['vm_node_id' => $vmNodeId]);

        return array_map('intval', $stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    public static function create(array $data): int | false
    {
        $required = ['vm_node_id', 'ip'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                return false;
            }
        }

        $vmNodeId = (int) $data['vm_node_id'];
        if ($vmNodeId <= 0 || !VmNode::getVmNodeById($vmNodeId)) {
            return false;
        }

        if (!is_string($data['ip']) || !filter_var($data['ip'], FILTER_VALIDATE_IP)) {
            return false;
        }

        if (isset($data['cidr']) && $data['cidr'] !== null) {
            if (!is_numeric($data['cidr'])) {
                return false;
            }
            $cidr = (int) $data['cidr'];
            if ($cidr < 0 || $cidr > 128) {
                return false;
            }
            $data['cidr'] = $cidr;
        } else {
            $data['cidr'] = null;
        }

        if (isset($data['gateway']) && $data['gateway'] !== null) {
            if (!is_string($data['gateway']) || !filter_var($data['gateway'], FILTER_VALIDATE_IP)) {
                return false;
            }
        } else {
            $data['gateway'] = null;
        }

        if (!isset($data['is_primary']) || !in_array($data['is_primary'], ['true', 'false'], true)) {
            $data['is_primary'] = 'false';
        }

        if (isset($data['notes']) && !is_string($data['notes'])) {
            return false;
        }

        if (!self::isUniqueIp($vmNodeId, $data['ip'])) {
            return false;
        }

        $fields = ['vm_node_id', 'ip', 'cidr', 'gateway', 'is_primary', 'notes'];
        $insert = [
            'vm_node_id' => $vmNodeId,
            'ip' => $data['ip'],
            'cidr' => $data['cidr'],
            'gateway' => $data['gateway'],
            'is_primary' => $data['is_primary'],
            'notes' => $data['notes'] ?? null,
        ];

        $pdo = Database::getPdoConnection();
        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($insert)) {
            return (int) $pdo->lastInsertId();
        }

        App::getInstance(true)->getLogger()->error('Failed to create VM IP: ' . json_encode($stmt->errorInfo()));

        return false;
    }

    public static function update(int $id, array $data): bool
    {
        $existing = self::getById($id);
        if (!$existing) {
            return false;
        }

        $fields = ['ip', 'cidr', 'gateway', 'is_primary', 'notes'];
        $set = [];
        $params = ['id' => $id];

        if (isset($data['ip'])) {
            if (!is_string($data['ip']) || !filter_var($data['ip'], FILTER_VALIDATE_IP)) {
                return false;
            }
            if (!self::isUniqueIp((int) $existing['vm_node_id'], $data['ip'], $id)) {
                return false;
            }
        }

        if (array_key_exists('cidr', $data)) {
            if ($data['cidr'] !== null) {
                if (!is_numeric($data['cidr'])) {
                    return false;
                }
                $cidr = (int) $data['cidr'];
                if ($cidr < 0 || $cidr > 128) {
                    return false;
                }
                $data['cidr'] = $cidr;
            }
        }

        if (array_key_exists('gateway', $data)) {
            if ($data['gateway'] !== null) {
                if (!is_string($data['gateway']) || !filter_var($data['gateway'], FILTER_VALIDATE_IP)) {
                    return false;
                }
            }
        }

        if (isset($data['is_primary']) && !in_array($data['is_primary'], ['true', 'false'], true)) {
            return false;
        }

        if (isset($data['notes']) && !is_string($data['notes'])) {
            return false;
        }

        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $set[] = "`{$field}` = :{$field}";
                $params[$field] = $data[$field];
            }
        }

        if (empty($set)) {
            return true;
        }

        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $set) . ' WHERE id = :id';
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare($sql);

        try {
            return $stmt->execute($params);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to update VM IP: ' . $e->getMessage());

            return false;
        }
    }

    public static function delete(int $id): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    public static function countByVmNodeId(int $vmNodeId): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE vm_node_id = :vm_node_id');
        $stmt->execute(['vm_node_id' => $vmNodeId]);

        return (int) $stmt->fetchColumn();
    }

    public static function isUniqueIp(int $vmNodeId, string $ip, ?int $excludeId = null): bool
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table . ' WHERE vm_node_id = :vm_node_id AND ip = :ip';
        $params = [
            'vm_node_id' => $vmNodeId,
            'ip' => $ip,
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
     * Mark one IP as primary for a VM node and clear the flag on all others.
     */
    public static function setPrimaryForVmNode(int $vmNodeId, int $ipId): bool
    {
        $pdo = Database::getPdoConnection();

        try {
            $pdo->beginTransaction();

            // Clear primary on all IPs for this node
            $clearStmt = $pdo->prepare('UPDATE ' . self::$table . ' SET is_primary = \'false\' WHERE vm_node_id = :vm_node_id');
            $clearStmt->execute(['vm_node_id' => $vmNodeId]);

            // Set primary on the selected IP
            $setStmt = $pdo->prepare('UPDATE ' . self::$table . ' SET is_primary = \'true\' WHERE id = :id AND vm_node_id = :vm_node_id');
            $setStmt->execute([
                'id' => $ipId,
                'vm_node_id' => $vmNodeId,
            ]);

            $pdo->commit();

            return $setStmt->rowCount() > 0;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            App::getInstance(true)->getLogger()->error('Failed to set primary VM IP: ' . $e->getMessage());

            return false;
        }
    }
}
