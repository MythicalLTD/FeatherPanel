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

class VmInstance
{
    private static string $table = 'featherpanel_vm_instances';

    /**
     * Paginated list of VM instances joined with node, plan, and user data.
     *
     * @return array<int, mixed>
     */
    public static function getAll(int $page = 1, int $limit = 25, ?string $search = null): array
    {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;

        $where = '';
        $params = [];

        if (!empty($search)) {
            $where = 'WHERE i.hostname LIKE :search
                   OR i.ip_address LIKE :search
                   OR i.pve_node LIKE :search
                   OR CAST(i.vmid AS CHAR) LIKE :search
                   OR u.username LIKE :search
                   OR u.email LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        $stmt = $pdo->prepare("
            SELECT
                i.*,
                n.name  AS node_name,
                n.fqdn  AS node_fqdn,
                NULL    AS plan_name,
                NULL    AS plan_memory,
                NULL    AS plan_cpus,
                NULL    AS plan_cores,
                NULL    AS plan_disk,
                u.username    AS user_username,
                u.email       AS user_email,
                u.first_name  AS user_first_name,
                u.last_name   AS user_last_name,
                u.avatar      AS user_avatar,
                ip.ip         AS ip_pool_address,
                ip.cidr       AS ip_pool_cidr,
                ip.gateway    AS ip_pool_gateway
            FROM featherpanel_vm_instances i
            LEFT JOIN featherpanel_vm_nodes n     ON n.id  = i.vm_node_id
            LEFT JOIN featherpanel_users u        ON u.uuid = i.user_uuid
            LEFT JOIN featherpanel_vm_ips ip      ON ip.id = i.vm_ip_id
            $where
            ORDER BY i.created_at DESC
            LIMIT :limit OFFSET :offset
        ");

        foreach ($params as $key => $val) {
            $stmt->bindValue(':' . $key, $val);
        }
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param \PDO|null $pdo Optional connection (e.g. when inside a transaction)
     */
    public static function getById(int $id, ?\PDO $pdo = null): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = $pdo ?? Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT
                i.*,
                n.name  AS node_name,
                n.fqdn  AS node_fqdn,
                NULL    AS plan_name,
                u.username   AS user_username,
                u.email      AS user_email,
                u.first_name AS user_first_name,
                u.last_name  AS user_last_name,
                u.avatar     AS user_avatar,
                ip.ip        AS ip_pool_address,
                ip.cidr      AS ip_pool_cidr,
                ip.gateway   AS ip_pool_gateway
            FROM featherpanel_vm_instances i
            LEFT JOIN featherpanel_vm_nodes n ON n.id  = i.vm_node_id
            LEFT JOIN featherpanel_users u    ON u.uuid = i.user_uuid
            LEFT JOIN featherpanel_vm_ips ip  ON ip.id = i.vm_ip_id
            WHERE i.id = :id LIMIT 1
        ');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getByVmidAndNode(int $vmid, int $nodeId): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_vm_instances WHERE vmid = :vmid AND vm_node_id = :node_id LIMIT 1');
        $stmt->execute(['vmid' => $vmid, 'node_id' => $nodeId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getByNodeId(int $nodeId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_vm_instances WHERE vm_node_id = :node_id ORDER BY vmid ASC');
        $stmt->execute(['node_id' => $nodeId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    public static function countAll(?string $search = null): int
    {
        $pdo = Database::getPdoConnection();

        $where = '';
        $params = [];

        if (!empty($search)) {
            $where = 'WHERE i.hostname LIKE :search
                   OR i.ip_address LIKE :search
                   OR i.pve_node LIKE :search
                   OR CAST(i.vmid AS CHAR) LIKE :search
                   OR u.username LIKE :search
                   OR u.email LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        $stmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM featherpanel_vm_instances i
            LEFT JOIN featherpanel_users u ON u.uuid = i.user_uuid
            $where
        ");
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Paginated VM instances for a specific owner user UUID.
     *
     * @return array<int, mixed>
     */
    public static function getByUserUuid(string $userUuid, int $page = 1, int $limit = 25, ?string $search = null): array
    {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;

        $where = 'WHERE i.user_uuid = :user_uuid';
        $params = ['user_uuid' => $userUuid];

        if (!empty($search)) {
            $where .= ' AND (
                i.hostname LIKE :search
                OR i.ip_address LIKE :search
                OR i.pve_node LIKE :search
                OR CAST(i.vmid AS CHAR) LIKE :search
            )';
            $params['search'] = '%' . $search . '%';
        }

        $stmt = $pdo->prepare("
            SELECT
                i.*,
                n.name  AS node_name,
                n.fqdn  AS node_fqdn,
                u.username    AS user_username,
                u.email       AS user_email,
                u.first_name  AS user_first_name,
                u.last_name   AS user_last_name,
                u.avatar      AS user_avatar,
                ip.ip         AS ip_pool_address,
                ip.cidr       AS ip_pool_cidr,
                ip.gateway    AS ip_pool_gateway
            FROM featherpanel_vm_instances i
            LEFT JOIN featherpanel_vm_nodes n ON n.id = i.vm_node_id
            LEFT JOIN featherpanel_users u ON u.uuid = i.user_uuid
            LEFT JOIN featherpanel_vm_ips ip ON ip.id = i.vm_ip_id
            $where
            ORDER BY i.created_at DESC
            LIMIT :limit OFFSET :offset
        ");

        foreach ($params as $key => $val) {
            $stmt->bindValue(':' . $key, $val);
        }
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    public static function countByUserUuid(string $userUuid, ?string $search = null): int
    {
        $pdo = Database::getPdoConnection();

        $where = 'WHERE i.user_uuid = :user_uuid';
        $params = ['user_uuid' => $userUuid];

        if (!empty($search)) {
            $where .= ' AND (
                i.hostname LIKE :search
                OR i.ip_address LIKE :search
                OR i.pve_node LIKE :search
                OR CAST(i.vmid AS CHAR) LIKE :search
            )';
            $params['search'] = '%' . $search . '%';
        }

        $stmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM featherpanel_vm_instances i
            $where
        ");
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /** Returns ['running' => N, 'stopped' => N, ...] */
    public static function countByStatus(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT status, COUNT(*) AS cnt FROM featherpanel_vm_instances GROUP BY status');
        $stmt->execute();
        $result = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $result[$row['status']] = (int) $row['cnt'];
        }

        return $result;
    }

    /**
     * @param \PDO|null $pdo Optional connection (e.g. when inside a transaction)
     */
    public static function updateStatus(int $id, string $status, ?\PDO $pdo = null): bool
    {
        $allowed = ['running', 'stopped', 'suspended', 'creating', 'deleting', 'error', 'unknown'];
        if (!in_array($status, $allowed, true)) {
            return false;
        }
        $pdo = $pdo ?? Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE featherpanel_vm_instances SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * @param \PDO|null $pdo Optional connection (e.g. when inside a transaction)
     */
    public static function create(array $data, ?\PDO $pdo = null): ?array
    {
        $pdo = $pdo ?? Database::getPdoConnection();
        $stmt = $pdo->prepare('
            INSERT INTO featherpanel_vm_instances
                (vmid, vm_node_id, user_uuid, pve_node, plan_id, template_id, vm_type,
                 hostname, status, ip_address, ip6_prefix, subnet_mask, gateway, vm_ip_id, notes, backup_limit,
                 memory, cpus, cores, disk_gb, on_boot)
            VALUES
                (:vmid, :vm_node_id, :user_uuid, :pve_node, :plan_id, :template_id, :vm_type,
                 :hostname, :status, :ip_address, :ip6_prefix, :subnet_mask, :gateway, :vm_ip_id, :notes, :backup_limit,
                 :memory, :cpus, :cores, :disk_gb, :on_boot)
        ');
        $stmt->execute([
            'vmid' => (int) $data['vmid'],
            'vm_node_id' => (int) $data['vm_node_id'],
            'user_uuid' => $data['user_uuid'] ?? null,
            'pve_node' => $data['pve_node'] ?? null,
            'plan_id' => isset($data['plan_id']) ? (int) $data['plan_id'] : null,
            'template_id' => isset($data['template_id']) ? (int) $data['template_id'] : null,
            'vm_type' => in_array($data['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $data['vm_type'] : 'qemu',
            'hostname' => $data['hostname'] ?? null,
            'status' => $data['status'] ?? 'unknown',
            'ip_address' => $data['ip_address'] ?? null,
            'ip6_prefix' => $data['ip6_prefix'] ?? null,
            'subnet_mask' => $data['subnet_mask'] ?? null,
            'gateway' => $data['gateway'] ?? null,
            'vm_ip_id' => isset($data['vm_ip_id']) ? (int) $data['vm_ip_id'] : null,
            'notes' => $data['notes'] ?? null,
            'backup_limit' => isset($data['backup_limit']) ? (int) $data['backup_limit'] : 5,
            'memory' => isset($data['memory']) ? (int) $data['memory'] : 512,
            'cpus' => isset($data['cpus']) ? (int) $data['cpus'] : 1,
            'cores' => isset($data['cores']) ? (int) $data['cores'] : 1,
            'disk_gb' => isset($data['disk_gb']) ? (int) $data['disk_gb'] : 10,
            'on_boot' => isset($data['on_boot']) ? (int) (bool) $data['on_boot'] : 1,
        ]);

        return self::getById((int) $pdo->lastInsertId(), $pdo);
    }

    /**
     * Update instance fields. Only provided keys are updated.
     * Allowed: hostname, notes, user_uuid, vm_ip_id (when set, ip_address and gateway are filled from VmIp),
     * and resource fields memory, cpus, cores, disk_gb, on_boot.
     *
     * @param array<string, mixed> $data
     */
    public static function update(int $id, array $data): bool
    {
        $allowed = ['hostname', 'notes', 'user_uuid', 'vm_ip_id', 'memory', 'cpus', 'cores', 'disk_gb', 'on_boot', 'suspended'];
        $updates = [];
        $params = ['id' => $id];

        foreach ($allowed as $key) {
            if (!array_key_exists($key, $data)) {
                continue;
            }
            if ($key === 'user_uuid') {
                $val = $data[$key];
                if ($val !== null && (!is_string($val) || trim($val) === '')) {
                    continue;
                }
                $updates[] = 'user_uuid = :user_uuid';
                $params['user_uuid'] = $val === null || trim((string) $val) === '' ? null : trim((string) $val);
                continue;
            }
            if ($key === 'vm_ip_id') {
                $ipId = $data[$key];
                if ($ipId === null || $ipId === '') {
                    $updates[] = 'vm_ip_id = NULL';
                    $updates[] = 'ip_address = NULL';
                    $updates[] = 'gateway = NULL';
                } else {
                    $ip = VmIp::getById((int) $ipId);
                    if ($ip) {
                        $updates[] = 'vm_ip_id = :vm_ip_id';
                        $updates[] = 'ip_address = :ip_address';
                        $updates[] = 'gateway = :gateway';
                        $params['vm_ip_id'] = (int) $ipId;
                        $params['ip_address'] = $ip['ip'] ?? null;
                        $params['gateway'] = $ip['gateway'] ?? null;
                    }
                }
                continue;
            }
            if ($key === 'hostname' || $key === 'notes') {
                $updates[] = $key . ' = :' . $key;
                $params[$key] = $data[$key] === null ? null : (is_string($data[$key]) ? trim($data[$key]) : $data[$key]);
                continue;
            }
            if (in_array($key, ['memory', 'cpus', 'cores', 'disk_gb'], true)) {
                $val = (int) $data[$key];
                if ($val <= 0) {
                    continue;
                }
                $updates[] = $key . ' = :' . $key;
                $params[$key] = $val;
                continue;
            }
            if ($key === 'on_boot') {
                $updates[] = 'on_boot = :on_boot';
                $params['on_boot'] = (int) (bool) $data['on_boot'];
            }
            if ($key === 'suspended') {
                $updates[] = 'suspended = :suspended';
                $params['suspended'] = (int) (bool) $data['suspended'];
            }
        }

        if (empty($updates)) {
            return true;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE featherpanel_vm_instances SET ' . implode(', ', $updates) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    public static function delete(int $id): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM featherpanel_vm_instances WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /** Convenience to get the internal table name for the static-method PDO queries above. */
    private function table(): string
    {
        return self::$table;
    }
}
