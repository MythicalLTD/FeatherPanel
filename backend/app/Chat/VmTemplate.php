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

class VmTemplate
{
    private static string $table = 'featherpanel_vm_templates';

    public static function getAll(bool $activeOnly = false): array
    {
        $pdo = Database::getPdoConnection();
        if ($activeOnly) {
            $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . " WHERE is_active = 'true' ORDER BY name ASC");
        } else {
            $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' ORDER BY name ASC');
        }
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    public static function getByNodeId(int $nodeId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE vm_node_id = :node_id ORDER BY name ASC');
        $stmt->execute(['node_id' => $nodeId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

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

    public static function create(array $data): array
    {
        if (empty(trim($data['name'] ?? ''))) {
            throw new \InvalidArgumentException(json_encode(['name' => 'Template name is required.']));
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            INSERT INTO ' . self::$table . '
                (name, description, guest_type, os_type, storage, template_file, vm_node_id, is_active)
            VALUES
                (:name, :description, :guest_type, :os_type, :storage, :template_file, :vm_node_id, :is_active)
        ');
        $stmt->execute([
            'name'          => $data['name'],
            'description'   => $data['description'] ?? null,
            'guest_type'    => in_array($data['guest_type'] ?? 'qemu', ['qemu', 'lxc']) ? $data['guest_type'] : 'qemu',
            'os_type'       => $data['os_type'] ?? null,
            'storage'       => $data['storage'] ?? 'local',
            'template_file' => $data['template_file'] ?? null,
            'vm_node_id'    => isset($data['vm_node_id']) ? (int) $data['vm_node_id'] : null,
            'is_active'     => ($data['is_active'] ?? 'true') === 'false' ? 'false' : 'true',
        ]);

        return self::getById((int) $pdo->lastInsertId());
    }

    public static function delete(int $id): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }

    public static function count(): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table);
        $stmt->execute();

        return (int) $stmt->fetchColumn();
    }
}
