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

/**
 * VmInstanceBackup service/model for CRUD operations on the featherpanel_vm_instance_backups table.
 */
class VmInstanceBackup
{
    /**
     * @var string The VM instance backups table name
     */
    private static string $table = 'featherpanel_vm_instance_backups';

    /**
     * Create a new VM instance backup row.
     *
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $required = ['vm_instance_id', 'vmid', 'storage', 'volid'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                App::getInstance(true)->getLogger()->error('VmInstanceBackup missing required field: ' . $field);

                return false;
            }
        }

        $vmInstanceId = (int) $data['vm_instance_id'];
        if ($vmInstanceId <= 0) {
            App::getInstance(true)->getLogger()->error('VmInstanceBackup invalid vm_instance_id: ' . $data['vm_instance_id']);

            return false;
        }

        $pdo = Database::getPdoConnection();
        $fields = [
            'vm_instance_id',
            'vmid',
            'storage',
            'volid',
            'size_bytes',
            'ctime',
            'format',
            'created_at',
        ];

        $insert = [
            'vm_instance_id' => $vmInstanceId,
            'vmid'           => (int) $data['vmid'],
            'storage'        => (string) $data['storage'],
            'volid'          => (string) $data['volid'],
            'size_bytes'     => isset($data['size_bytes']) ? (int) $data['size_bytes'] : 0,
            'ctime'          => isset($data['ctime']) ? (int) $data['ctime'] : 0,
            'format'         => isset($data['format']) ? (string) $data['format'] : null,
            'created_at'     => $data['created_at'] ?? date('Y-m-d H:i:s'),
        ];

        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')';

        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($insert)) {
            return (int) $pdo->lastInsertId();
        }

        $errorInfo = $stmt->errorInfo();
        App::getInstance(true)->getLogger()->error(
            'Failed to create VmInstanceBackup: ' . ($errorInfo[2] ?? 'Unknown error')
        );

        return false;
    }

    /**
     * Get all backups for a specific VM instance.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getBackupsByInstanceId(int $vmInstanceId): array
    {
        if ($vmInstanceId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE vm_instance_id = :vm_instance_id ORDER BY created_at DESC, id DESC'
        );
        $stmt->execute(['vm_instance_id' => $vmInstanceId]);

        /** @var array<int, array<string, mixed>> $rows */
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return $rows;
    }

    /**
     * Get a backup by VM instance and volid.
     */
    public static function getByInstanceAndVolid(int $vmInstanceId, string $volid): ?array
    {
        if ($vmInstanceId <= 0 || $volid === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE vm_instance_id = :vm_instance_id AND volid = :volid LIMIT 1'
        );
        $stmt->execute([
            'vm_instance_id' => $vmInstanceId,
            'volid'          => $volid,
        ]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * Delete a backup row by ID.
     */
    public static function deleteById(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Delete all backups for a VM instance.
     */
    public static function deleteByInstanceId(int $vmInstanceId): int
    {
        if ($vmInstanceId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE vm_instance_id = :vm_instance_id');
        $stmt->execute(['vm_instance_id' => $vmInstanceId]);

        return (int) $stmt->rowCount();
    }

    /**
     * Count backups for a VM instance.
     */
    public static function countByInstanceId(int $vmInstanceId): int
    {
        if ($vmInstanceId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE vm_instance_id = :vm_instance_id');
        $stmt->execute(['vm_instance_id' => $vmInstanceId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Oldest tracked VM backup for FIFO rotation.
     *
     * @return array<string, mixed>|null
     */
    public static function getOldestForInstanceId(int $vmInstanceId): ?array
    {
        if ($vmInstanceId <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE vm_instance_id = :vm_instance_id ORDER BY created_at ASC, id ASC LIMIT 1'
        );
        $stmt->execute(['vm_instance_id' => $vmInstanceId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }
}
