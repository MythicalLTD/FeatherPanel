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

class VmPlan
{
    private static string $table = 'featherpanel_vm_plans';

    /** Fetch all plans, optionally filtered by node ID and/or active only. */
    public static function getAll(bool $activeOnly = false, ?int $vmNodeId = null): array
    {
        $pdo = Database::getPdoConnection();
        $conditions = [];
        $params = [];

        if ($activeOnly) {
            $conditions[] = "is_active = 'true'";
        }
        if ($vmNodeId !== null) {
            $conditions[] = 'vm_node_id = :vm_node_id';
            $params['vm_node_id'] = $vmNodeId;
        }

        $where = empty($conditions) ? '' : 'WHERE ' . implode(' AND ', $conditions);
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . " $where ORDER BY name ASC");
        $stmt->execute($params);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    /** Fetch a single plan by ID. */
    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /** Create a new VM plan. Returns the new plan array or throws on failure. */
    public static function create(array $data): array
    {
        self::validate($data);

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            INSERT INTO ' . self::$table . '
                (vm_node_id, name, description, vm_type, cpus, cores, cpu_type, cpu_limit, cpu_units,
                 memory, balloon, swap, disk, disk_format, disk_cache, disk_type, storage, disk_io,
                 bridge, vlan_id, net_model, net_rate, firewall, bandwidth,
                 kvm, on_boot, unprivileged, ipv6, is_active)
            VALUES
                (:vm_node_id, :name, :description, :vm_type, :cpus, :cores, :cpu_type, :cpu_limit, :cpu_units,
                 :memory, :balloon, :swap, :disk, :disk_format, :disk_cache, :disk_type, :storage, :disk_io,
                 :bridge, :vlan_id, :net_model, :net_rate, :firewall, :bandwidth,
                 :kvm, :on_boot, :unprivileged, :ipv6, :is_active)
        ');

        $stmt->execute([
            'vm_node_id'   => isset($data['vm_node_id']) ? (int) $data['vm_node_id'] : null,
            'name'         => $data['name'],
            'description'  => $data['description'] ?? null,
            'vm_type'      => $data['vm_type'] ?? 'qemu',
            'cpus'         => (int) ($data['cpus'] ?? 1),
            'cores'        => (int) ($data['cores'] ?? 1),
            'cpu_type'     => $data['cpu_type'] ?? null,
            'cpu_limit'    => isset($data['cpu_limit']) ? (int) $data['cpu_limit'] : null,
            'cpu_units'    => (int) ($data['cpu_units'] ?? 1024),
            'memory'       => (int) ($data['memory'] ?? 512),
            'balloon'      => (int) ($data['balloon'] ?? 0),
            'swap'         => (int) ($data['swap'] ?? 0),
            'disk'         => (int) ($data['disk'] ?? 10),
            'disk_format'  => $data['disk_format'] ?? 'qcow2',
            'disk_cache'   => $data['disk_cache'] ?? null,
            'disk_type'    => $data['disk_type'] ?? 'scsi',
            'storage'      => $data['storage'] ?? 'local',
            'disk_io'      => $data['disk_io'] ?? '0',
            'bridge'       => $data['bridge'] ?? 'vmbr0',
            'vlan_id'      => isset($data['vlan_id']) ? (int) $data['vlan_id'] : null,
            'net_model'    => $data['net_model'] ?? 'virtio',
            'net_rate'     => (int) ($data['net_rate'] ?? 0),
            'firewall'     => (int) ($data['firewall'] ?? 0),
            'bandwidth'    => (int) ($data['bandwidth'] ?? 0),
            'kvm'          => (int) ($data['kvm'] ?? 1),
            'on_boot'      => (int) ($data['on_boot'] ?? 1),
            'unprivileged' => (int) ($data['unprivileged'] ?? 0),
            'ipv6'         => $data['ipv6'] ?? 'auto',
            'is_active'    => ($data['is_active'] ?? 'true') === 'false' ? 'false' : 'true',
        ]);

        $newId = (int) $pdo->lastInsertId();

        return self::getById($newId);
    }

    /** Update an existing plan. Returns the updated plan array. */
    public static function update(int $id, array $data): array
    {
        self::validate($data, false);

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            UPDATE ' . self::$table . ' SET
                vm_node_id = :vm_node_id,
                name = :name,
                description = :description,
                vm_type = :vm_type,
                cpus = :cpus,
                cores = :cores,
                cpu_type = :cpu_type,
                cpu_limit = :cpu_limit,
                cpu_units = :cpu_units,
                memory = :memory,
                balloon = :balloon,
                swap = :swap,
                disk = :disk,
                disk_format = :disk_format,
                disk_cache = :disk_cache,
                disk_type = :disk_type,
                storage = :storage,
                disk_io = :disk_io,
                bridge = :bridge,
                vlan_id = :vlan_id,
                net_model = :net_model,
                net_rate = :net_rate,
                firewall = :firewall,
                bandwidth = :bandwidth,
                kvm = :kvm,
                on_boot = :on_boot,
                unprivileged = :unprivileged,
                ipv6 = :ipv6,
                is_active = :is_active
            WHERE id = :id
        ');

        $stmt->execute([
            'id'           => $id,
            'vm_node_id'   => isset($data['vm_node_id']) ? (int) $data['vm_node_id'] : null,
            'name'         => $data['name'],
            'description'  => $data['description'] ?? null,
            'vm_type'      => $data['vm_type'] ?? 'qemu',
            'cpus'         => (int) ($data['cpus'] ?? 1),
            'cores'        => (int) ($data['cores'] ?? 1),
            'cpu_type'     => $data['cpu_type'] ?? null,
            'cpu_limit'    => isset($data['cpu_limit']) ? (int) $data['cpu_limit'] : null,
            'cpu_units'    => (int) ($data['cpu_units'] ?? 1024),
            'memory'       => (int) ($data['memory'] ?? 512),
            'balloon'      => (int) ($data['balloon'] ?? 0),
            'swap'         => (int) ($data['swap'] ?? 0),
            'disk'         => (int) ($data['disk'] ?? 10),
            'disk_format'  => $data['disk_format'] ?? 'qcow2',
            'disk_cache'   => $data['disk_cache'] ?? null,
            'disk_type'    => $data['disk_type'] ?? 'scsi',
            'storage'      => $data['storage'] ?? 'local',
            'disk_io'      => $data['disk_io'] ?? '0',
            'bridge'       => $data['bridge'] ?? 'vmbr0',
            'vlan_id'      => isset($data['vlan_id']) ? (int) $data['vlan_id'] : null,
            'net_model'    => $data['net_model'] ?? 'virtio',
            'net_rate'     => (int) ($data['net_rate'] ?? 0),
            'firewall'     => (int) ($data['firewall'] ?? 0),
            'bandwidth'    => (int) ($data['bandwidth'] ?? 0),
            'kvm'          => (int) ($data['kvm'] ?? 1),
            'on_boot'      => (int) ($data['on_boot'] ?? 1),
            'unprivileged' => (int) ($data['unprivileged'] ?? 0),
            'ipv6'         => $data['ipv6'] ?? 'auto',
            'is_active'    => ($data['is_active'] ?? 'true') === 'false' ? 'false' : 'true',
        ]);

        return self::getById($id);
    }

    /** Delete a plan. Returns false if the plan has instances attached. */
    public static function delete(int $id): bool
    {
        $pdo = Database::getPdoConnection();

        // Prevent deleting plans that are in use
        $usageStmt = $pdo->prepare(
            "SELECT COUNT(*) FROM featherpanel_vm_instances WHERE plan_id = :id"
        );
        $usageStmt->execute(['id' => $id]);
        if ((int) $usageStmt->fetchColumn() > 0) {
            return false;
        }

        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /** Count all plans. */
    public static function count(): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table);
        $stmt->execute();

        return (int) $stmt->fetchColumn();
    }

    /** @throws \InvalidArgumentException on validation failure */
    private static function validate(array $data, bool $isCreate = true): void
    {
        $errors = [];

        if (empty(trim($data['name'] ?? ''))) {
            $errors['name'] = 'Plan name is required.';
        } elseif (strlen($data['name']) > 255) {
            $errors['name'] = 'Plan name must not exceed 255 characters.';
        }

        if (!in_array($data['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true)) {
            $errors['vm_type'] = 'VM type must be qemu or lxc.';
        }

        foreach (['cpus', 'cores', 'memory', 'disk'] as $field) {
            if (isset($data[$field]) && ((int) $data[$field] < 1)) {
                $errors[$field] = ucfirst($field) . ' must be at least 1.';
            }
        }

        if (!empty($errors)) {
            throw new \InvalidArgumentException(json_encode($errors));
        }
    }
}
