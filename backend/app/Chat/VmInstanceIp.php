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

class VmInstanceIp
{
    private static string $table = 'featherpanel_vm_instance_ips';

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function getByInstanceId(int $instanceId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT
                vii.*,
                vip.ip,
                vip.cidr,
                vip.gateway,
                vip.notes AS ip_notes
            FROM ' . self::$table . ' vii
            INNER JOIN featherpanel_vm_ips vip ON vip.id = vii.vm_ip_id
            WHERE vii.vm_instance_id = :instance_id
            ORDER BY vii.sort_order ASC, vii.id ASC
        ');
        $stmt->execute(['instance_id' => $instanceId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param array<int, array<string, mixed>> $assignments
     */
    public static function syncForInstance(int $instanceId, array $assignments, ?\PDO $pdo = null): bool
    {
        $pdo = $pdo ?? Database::getPdoConnection();

        $delete = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE vm_instance_id = :instance_id');
        $delete->execute(['instance_id' => $instanceId]);

        if (empty($assignments)) {
            return true;
        }

        $insert = $pdo->prepare('
            INSERT INTO ' . self::$table . '
                (vm_instance_id, vm_ip_id, network_key, bridge, interface_name, is_primary, sort_order)
            VALUES
                (:vm_instance_id, :vm_ip_id, :network_key, :bridge, :interface_name, :is_primary, :sort_order)
        ');

        foreach (array_values($assignments) as $index => $assignment) {
            $vmIpId = isset($assignment['vm_ip_id']) ? (int) $assignment['vm_ip_id'] : 0;
            if ($vmIpId <= 0) {
                continue;
            }

            $ok = $insert->execute([
                'vm_instance_id' => $instanceId,
                'vm_ip_id' => $vmIpId,
                'network_key' => isset($assignment['network_key']) && is_string($assignment['network_key'])
                    ? trim($assignment['network_key'])
                    : ('net' . $index),
                'bridge' => isset($assignment['bridge']) && is_string($assignment['bridge']) && trim($assignment['bridge']) !== ''
                    ? trim($assignment['bridge'])
                    : null,
                'interface_name' => isset($assignment['interface_name']) && is_string($assignment['interface_name']) && trim($assignment['interface_name']) !== ''
                    ? trim($assignment['interface_name'])
                    : null,
                'is_primary' => !empty($assignment['is_primary']) ? 1 : 0,
                'sort_order' => isset($assignment['sort_order']) ? (int) $assignment['sort_order'] : $index,
            ]);

            if (!$ok) {
                return false;
            }
        }

        return true;
    }
}
