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
 * VDS ISO library rows: provider ISOs registered by admins and ISOs owned by users.
 */
class VmIso
{
    public const CATEGORIES = ['linux', 'windows', 'bsd', 'rescue', 'tools', 'other'];

    private const COLUMNS = ['kind', 'vm_node_id', 'pve_node', 'storage', 'volid', 'name', 'description', 'category', 'visible', 'sort_order', 'user_id', 'vm_instance_id', 'source', 'source_url', 'size_bytes', 'status', 'approval', 'upid', 'error'];

    private static string $table = 'featherpanel_vm_isos';

    public static function create(array $data): ?int
    {
        $data = array_intersect_key($data, array_flip(self::COLUMNS));
        if (($data['volid'] ?? '') === '' || ($data['name'] ?? '') === '') {
            return null;
        }
        $cols = array_keys($data);
        $sql = 'INSERT INTO ' . self::$table . ' (`' . implode('`, `', $cols) . '`) VALUES (:' . implode(', :', $cols) . ')';
        $pdo = Database::getPdoConnection();
        if (!$pdo->prepare($sql)->execute($data)) {
            return null;
        }

        return (int) $pdo->lastInsertId();
    }

    public static function getById(int $id): ?array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function update(int $id, array $data): bool
    {
        $data = array_intersect_key($data, array_flip(self::COLUMNS));
        if ($data === []) {
            return true;
        }
        $sets = array_map(static fn ($c) => "`$c` = :$c", array_keys($data));
        $data['id'] = $id;

        return Database::getPdoConnection()->prepare('UPDATE ' . self::$table . ' SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($data);
    }

    public static function delete(int $id): bool
    {
        return Database::getPdoConnection()->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id')->execute(['id' => $id]);
    }

    /** Provider rows that apply to a VDS node (node-specific rows plus rows for every node). */
    public static function providerForNode(int $vmNodeId): array
    {
        $stmt = Database::getPdoConnection()->prepare(
            'SELECT * FROM ' . self::$table . " WHERE kind = 'provider' AND (vm_node_id IS NULL OR vm_node_id = :node) ORDER BY sort_order ASC, name ASC"
        );
        $stmt->execute(['node' => $vmNodeId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /** A user's own ISOs that live on the same Proxmox node as the VDS. */
    public static function userIsosForNode(int $userId, int $vmNodeId, string $pveNode): array
    {
        $stmt = Database::getPdoConnection()->prepare(
            'SELECT * FROM ' . self::$table . " WHERE kind = 'user' AND user_id = :uid AND vm_node_id = :node AND pve_node = :pve ORDER BY created_at DESC"
        );
        $stmt->execute(['uid' => $userId, 'node' => $vmNodeId, 'pve' => $pveNode]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /** ISOs counted against the per-user quota (failed and rejected ones do not count). */
    public static function countUserQuota(int $userId): int
    {
        $stmt = Database::getPdoConnection()->prepare(
            'SELECT COUNT(*) FROM ' . self::$table . " WHERE kind = 'user' AND user_id = :uid AND status <> 'failed' AND approval <> 'rejected'"
        );
        $stmt->execute(['uid' => $userId]);

        return (int) $stmt->fetchColumn();
    }

    /** Admin listing with owner and node names. */
    public static function listForAdmin(string $kind, ?string $approval = null, string $search = ''): array
    {
        $where = ['i.kind = :kind'];
        $params = ['kind' => $kind === 'user' ? 'user' : 'provider'];
        if ($approval !== null && in_array($approval, ['approved', 'pending', 'rejected'], true)) {
            $where[] = 'i.approval = :approval';
            $params['approval'] = $approval;
        }
        if ($search !== '') {
            $where[] = '(i.name LIKE :q OR i.volid LIKE :q OR u.username LIKE :q)';
            $params['q'] = '%' . $search . '%';
        }
        $stmt = Database::getPdoConnection()->prepare(
            'SELECT i.*, u.username AS owner_username, u.uuid AS owner_uuid, n.name AS node_name, vi.hostname AS vm_hostname
             FROM ' . self::$table . ' i
             LEFT JOIN featherpanel_users u ON u.id = i.user_id
             LEFT JOIN featherpanel_vm_nodes n ON n.id = i.vm_node_id
             LEFT JOIN featherpanel_vm_instances vi ON vi.id = i.vm_instance_id
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY i.sort_order ASC, i.created_at DESC
             LIMIT 500'
        );
        $stmt->execute($params);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function countPendingApproval(): int
    {
        return (int) Database::getPdoConnection()->query('SELECT COUNT(*) FROM ' . self::$table . " WHERE kind = 'user' AND approval = 'pending'")->fetchColumn();
    }
}
