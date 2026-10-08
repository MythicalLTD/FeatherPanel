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
 * Named hosting packages for WebSpace limits (WHM-style product tiers).
 */
class HostingPackage
{
    private static string $table = 'featherpanel_hosting_packages';

    /** @var array<int, string> */
    private static array $allowedFields = [
        'id',
        'name',
        'description',
        'disk',
        'cpu_limit',
        'memory_limit',
        'bandwidth_limit_gb',
        'database_limit',
        'mailbox_limit',
        'webplate_id',
    ];

    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? self::hydrate($row) : null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listAll(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT * FROM ' . self::$table . ' ORDER BY name ASC');

        return array_map([self::class, 'hydrate'], $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            App::getInstance(true)->getLogger()->error('HostingPackage create missing name');

            return false;
        }

        $row = self::normalize($data);
        $row['name'] = $name;

        $pdo = Database::getPdoConnection();
        $cols = array_keys($row);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(', ', $cols) . ') VALUES (:' . implode(', :', $cols) . ')';
        $stmt = $pdo->prepare($sql);
        if (!$stmt->execute($row)) {
            return false;
        }

        return (int) $pdo->lastInsertId();
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function update(int $id, array $data): bool
    {
        if ($id <= 0) {
            return false;
        }

        $row = self::normalize($data);
        if (isset($data['name'])) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                return false;
            }
            $row['name'] = $name;
        }

        if ($row === []) {
            return true;
        }

        $sets = [];
        foreach (array_keys($row) as $col) {
            $sets[] = $col . ' = :' . $col;
        }

        $row['id'] = $id;
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET ' . implode(', ', $sets) . ' WHERE id = :id');

        return $stmt->execute($row);
    }

    public static function delete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Apply package defaults onto create payload (does not override explicit values).
     *
     * @param array<string, mixed> $payload
     *
     * @return array<string, mixed>
     */
    public static function applyToCreatePayload(array $payload): array
    {
        $packageId = (int) ($payload['hosting_package_id'] ?? 0);
        if ($packageId <= 0) {
            return $payload;
        }

        $pkg = self::getById($packageId);
        if (!$pkg) {
            return $payload;
        }

        $payload['hosting_package_id'] = $packageId;
        foreach (['disk', 'cpu_limit', 'memory_limit', 'bandwidth_limit_gb', 'database_limit', 'mailbox_limit', 'webplate_id'] as $field) {
            if (!array_key_exists($field, $payload) && isset($pkg[$field])) {
                $payload[$field] = $pkg[$field];
            }
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    private static function normalize(array $data): array
    {
        $row = [];
        if (array_key_exists('description', $data)) {
            $row['description'] = (string) $data['description'];
        }
        if (array_key_exists('disk', $data)) {
            $row['disk'] = max(1, (int) $data['disk']);
        }
        if (array_key_exists('cpu_limit', $data)) {
            $row['cpu_limit'] = max(0, (float) $data['cpu_limit']);
        }
        if (array_key_exists('memory_limit', $data)) {
            $row['memory_limit'] = max(0, (int) $data['memory_limit']);
        }
        if (array_key_exists('bandwidth_limit_gb', $data)) {
            $row['bandwidth_limit_gb'] = max(0, (int) $data['bandwidth_limit_gb']);
        }
        if (array_key_exists('database_limit', $data)) {
            $row['database_limit'] = max(0, (int) $data['database_limit']);
        }
        if (array_key_exists('mailbox_limit', $data)) {
            $row['mailbox_limit'] = max(0, (int) $data['mailbox_limit']);
        }
        if (array_key_exists('webplate_id', $data)) {
            $wp = (int) $data['webplate_id'];
            $row['webplate_id'] = $wp > 0 ? $wp : null;
        }

        return $row;
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function hydrate(array $row): array
    {
        $row['disk'] = (int) ($row['disk'] ?? 1024);
        $row['cpu_limit'] = (float) ($row['cpu_limit'] ?? 0);
        $row['memory_limit'] = (int) ($row['memory_limit'] ?? 0);
        $row['bandwidth_limit_gb'] = (int) ($row['bandwidth_limit_gb'] ?? 0);
        $row['database_limit'] = (int) ($row['database_limit'] ?? 1);
        $row['mailbox_limit'] = (int) ($row['mailbox_limit'] ?? 0);
        $row['webplate_id'] = isset($row['webplate_id']) ? (int) $row['webplate_id'] : null;

        return $row;
    }
}
