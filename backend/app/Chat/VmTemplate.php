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

        $lxcRootPassword = null;
        if (($data['guest_type'] ?? 'qemu') === 'lxc') {
            $raw = $data['lxc_root_password'] ?? null;
            $lxcRootPassword = $raw === '' ? null : $raw;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            INSERT INTO ' . self::$table . '
                (name, description, guest_type, os_type, storage, template_file, vm_node_id, is_active, lxc_root_password)
            VALUES
                (:name, :description, :guest_type, :os_type, :storage, :template_file, :vm_node_id, :is_active, :lxc_root_password)
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
            'lxc_root_password' => $lxcRootPassword,
        ]);

        return self::getById((int) $pdo->lastInsertId());
    }

    public static function update(int $id, array $data): ?array
    {
        $existing = self::getById($id);
        if (!$existing) {
            return null;
        }
        $name = array_key_exists('name', $data) ? trim((string) $data['name']) : $existing['name'];
        $description = array_key_exists('description', $data) ? ($data['description'] === '' || $data['description'] === null ? null : (string) $data['description']) : $existing['description'];
        $guestType = array_key_exists('guest_type', $data) ? (in_array($data['guest_type'], ['qemu', 'lxc'], true) ? $data['guest_type'] : $existing['guest_type']) : $existing['guest_type'];
        $osType = array_key_exists('os_type', $data) ? ($data['os_type'] === '' || $data['os_type'] === null ? null : (string) $data['os_type']) : $existing['os_type'];
        $storage = array_key_exists('storage', $data) ? (string) $data['storage'] : $existing['storage'];
        $templateFile = array_key_exists('template_file', $data) ? ($data['template_file'] === '' || $data['template_file'] === null ? null : (string) $data['template_file']) : $existing['template_file'];
        $isActive = array_key_exists('is_active', $data) ? (($data['is_active'] ?? 'true') === 'false' ? 'false' : 'true') : $existing['is_active'];

        $lxcRootPassword = $existing['lxc_root_password'] ?? null;
        if ($guestType === 'lxc') {
            if (array_key_exists('lxc_root_password', $data)) {
                $raw = $data['lxc_root_password'];
                $lxcRootPassword = $raw === '' || $raw === null ? null : (string) $raw;
            }
        } else {
            $lxcRootPassword = null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            UPDATE ' . self::$table . ' SET
                name = :name,
                description = :description,
                guest_type = :guest_type,
                os_type = :os_type,
                storage = :storage,
                template_file = :template_file,
                is_active = :is_active,
                lxc_root_password = :lxc_root_password
            WHERE id = :id
        ');
        $stmt->execute([
            'id' => $id,
            'name' => $name,
            'description' => $description,
            'guest_type' => $guestType,
            'os_type' => $osType,
            'storage' => $storage,
            'template_file' => $templateFile,
            'is_active' => $isActive,
            'lxc_root_password' => $lxcRootPassword,
        ]);

        return $stmt->rowCount() >= 0 ? self::getById($id) : $existing;
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
