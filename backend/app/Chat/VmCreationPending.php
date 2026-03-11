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

class VmCreationPending
{
    private static string $table = 'featherpanel_vm_creation_pending';

    public static function create(array $data): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            INSERT INTO ' . self::$table . '
                (creation_id, upid, target_node, vmid, hostname, vm_node_id, plan_id, template_id, vm_ip_id, user_uuid, notes, vm_type, memory, cpus, cores, disk, storage, bridge, on_boot, backup_limit)
            VALUES
                (:creation_id, :upid, :target_node, :vmid, :hostname, :vm_node_id, :plan_id, :template_id, :vm_ip_id, :user_uuid, :notes, :vm_type, :memory, :cpus, :cores, :disk, :storage, :bridge, :on_boot, :backup_limit)
        ');

        return $stmt->execute([
            'creation_id'  => $data['creation_id'],
            'upid'         => $data['upid'],
            'target_node'  => $data['target_node'],
            'vmid'         => (int) $data['vmid'],
            'hostname'     => $data['hostname'],
            'vm_node_id'   => (int) $data['vm_node_id'],
            'plan_id'      => isset($data['plan_id']) && $data['plan_id'] > 0 ? (int) $data['plan_id'] : null,
            'template_id'  => isset($data['template_id']) ? (int) $data['template_id'] : null,
            'vm_ip_id'     => isset($data['vm_ip_id']) ? (int) $data['vm_ip_id'] : null,
            'user_uuid'    => $data['user_uuid'] ?? null,
            'notes'        => $data['notes'] ?? null,
            'vm_type'      => isset($data['vm_type']) && $data['vm_type'] === 'lxc' ? 'lxc' : 'qemu',
            'memory'       => (int) ($data['memory'] ?? 512),
            'cpus'         => (int) ($data['cpus'] ?? 1),
            'cores'        => (int) ($data['cores'] ?? 1),
            'disk'         => (int) ($data['disk'] ?? 10),
            'storage'      => $data['storage'] ?? 'local',
            'bridge'       => $data['bridge'] ?? 'vmbr0',
            'on_boot'      => isset($data['on_boot']) ? (int) (bool) $data['on_boot'] : 1,
            'backup_limit' => isset($data['backup_limit']) ? max(0, min(100, (int) $data['backup_limit'])) : 5,
        ]);
    }

    public static function getByCreationId(string $creationId): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE creation_id = :creation_id LIMIT 1');
        $stmt->execute(['creation_id' => $creationId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public static function deleteByCreationId(string $creationId): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE creation_id = :creation_id');
        $stmt->execute(['creation_id' => $creationId]);

        return $stmt->rowCount() > 0;
    }
}
