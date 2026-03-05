<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studio
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
            $where = "WHERE i.hostname LIKE :search
                   OR i.ip_address LIKE :search
                   OR i.pve_node LIKE :search
                   OR CAST(i.vmid AS CHAR) LIKE :search
                   OR u.username LIKE :search
                   OR u.email LIKE :search";
            $params['search'] = '%' . $search . '%';
        }

        $stmt = $pdo->prepare("
            SELECT
                i.*,
                n.name  AS node_name,
                n.fqdn  AS node_fqdn,
                p.name  AS plan_name,
                p.memory AS plan_memory,
                p.cpus  AS plan_cpus,
                p.cores AS plan_cores,
                p.disk  AS plan_disk,
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
            LEFT JOIN featherpanel_vm_plans p     ON p.id  = i.plan_id
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

    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare("
            SELECT
                i.*,
                n.name  AS node_name,
                n.fqdn  AS node_fqdn,
                p.name  AS plan_name,
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
            LEFT JOIN featherpanel_vm_plans p ON p.id  = i.plan_id
            LEFT JOIN featherpanel_users u    ON u.uuid = i.user_uuid
            LEFT JOIN featherpanel_vm_ips ip  ON ip.id = i.vm_ip_id
            WHERE i.id = :id LIMIT 1
        ");
        $stmt->execute(['id' => $id]);

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
            $where = "WHERE i.hostname LIKE :search
                   OR i.ip_address LIKE :search
                   OR i.pve_node LIKE :search
                   OR CAST(i.vmid AS CHAR) LIKE :search
                   OR u.username LIKE :search
                   OR u.email LIKE :search";
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

    public static function updateStatus(int $id, string $status): bool
    {
        $allowed = ['running', 'stopped', 'suspended', 'creating', 'deleting', 'error', 'unknown'];
        if (!in_array($status, $allowed, true)) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE featherpanel_vm_instances SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);

        return $stmt->rowCount() > 0;
    }

    public static function create(array $data): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            INSERT INTO featherpanel_vm_instances
                (vmid, vm_node_id, user_uuid, pve_node, plan_id, template_id, vm_type,
                 hostname, status, ip_address, ip6_prefix, subnet_mask, gateway, vm_ip_id, notes)
            VALUES
                (:vmid, :vm_node_id, :user_uuid, :pve_node, :plan_id, :template_id, :vm_type,
                 :hostname, :status, :ip_address, :ip6_prefix, :subnet_mask, :gateway, :vm_ip_id, :notes)
        ');
        $stmt->execute([
            'vmid'        => (int) $data['vmid'],
            'vm_node_id'  => (int) $data['vm_node_id'],
            'user_uuid'   => $data['user_uuid'] ?? null,
            'pve_node'    => $data['pve_node'] ?? null,
            'plan_id'     => isset($data['plan_id']) ? (int) $data['plan_id'] : null,
            'template_id' => isset($data['template_id']) ? (int) $data['template_id'] : null,
            'vm_type'     => in_array($data['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $data['vm_type'] : 'qemu',
            'hostname'    => $data['hostname'] ?? null,
            'status'      => $data['status'] ?? 'unknown',
            'ip_address'  => $data['ip_address'] ?? null,
            'ip6_prefix'  => $data['ip6_prefix'] ?? null,
            'subnet_mask' => $data['subnet_mask'] ?? null,
            'gateway'     => $data['gateway'] ?? null,
            'vm_ip_id'    => isset($data['vm_ip_id']) ? (int) $data['vm_ip_id'] : null,
            'notes'       => $data['notes'] ?? null,
        ]);

        return self::getById((int) $pdo->lastInsertId());
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
