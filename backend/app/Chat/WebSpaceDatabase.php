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
 * WebSpace database records (featherpanel_webspace_databases).
 */
class WebSpaceDatabase
{
    private static string $table = 'featherpanel_webspace_databases';

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $required = ['webspace_id', 'database_host_id', 'database', 'username', 'password'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim((string) $data[$field]) === '')) {
                return false;
            }
        }

        $data['remote'] = $data['remote'] ?? '%';
        $data['max_connections'] = (int) ($data['max_connections'] ?? 0);
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');
        $data['password'] = self::encryptPassword((string) $data['password']);

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . '
            (webspace_id, database_host_id, `database`, username, password, remote, max_connections, created_at, updated_at)
            VALUES (:webspace_id, :database_host_id, :database, :username, :password, :remote, :max_connections, :created_at, :updated_at)'
        );

        if (
            !$stmt->execute([
                'webspace_id' => (int) $data['webspace_id'],
                'database_host_id' => (int) $data['database_host_id'],
                'database' => (string) $data['database'],
                'username' => (string) $data['username'],
                'password' => (string) $data['password'],
                'remote' => (string) $data['remote'],
                'max_connections' => (int) $data['max_connections'],
                'created_at' => (string) $data['created_at'],
                'updated_at' => (string) $data['updated_at'],
            ])
        ) {
            return false;
        }

        return (int) $pdo->lastInsertId();
    }

    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? self::decryptSensitiveFields($row) : null;
    }

    public static function getWithDetails(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT wd.*, dh.name as database_host_name, dh.database_type, dh.database_host, dh.database_port
                FROM ' . self::$table . ' wd
                LEFT JOIN featherpanel_databases dh ON wd.database_host_id = dh.id
                WHERE wd.id = :id LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? self::decryptSensitiveFields($row) : null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listByWebSpaceId(int $webspaceId): array
    {
        if ($webspaceId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT wd.*, dh.name as database_host_name, dh.database_type, dh.database_host, dh.database_port
                FROM ' . self::$table . ' wd
                LEFT JOIN featherpanel_databases dh ON wd.database_host_id = dh.id
                WHERE wd.webspace_id = :webspace_id
                ORDER BY wd.created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['webspace_id' => $webspaceId]);

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(static fn (array $row): array => self::decryptSensitiveFields($row), $rows);
    }

    public static function countByWebSpaceId(int $webspaceId): int
    {
        if ($webspaceId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE webspace_id = :webspace_id');
        $stmt->execute(['webspace_id' => $webspaceId]);

        return (int) $stmt->fetchColumn();
    }

    public static function update(int $id, array $data): bool
    {
        if ($id <= 0 || $data === []) {
            return false;
        }

        unset($data['id'], $data['created_at']);
        $data['updated_at'] = date('Y-m-d H:i:s');

        if (isset($data['password']) && is_string($data['password']) && $data['password'] !== '') {
            $data['password'] = self::encryptPassword($data['password']);
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $setClause = implode(', ', array_map(static fn ($f) => '`' . str_replace('`', '``', $f) . '` = :' . $f, $fields));
        $sql = 'UPDATE ' . self::$table . ' SET ' . $setClause . ' WHERE id = :id';
        $data['id'] = $id;
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($data);
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

    private static function encryptPassword(string $password): string
    {
        return App::getInstance(true)->encryptValue($password);
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function decryptSensitiveFields(array $row): array
    {
        try {
            if (isset($row['password']) && is_string($row['password']) && $row['password'] !== '') {
                $row['password'] = App::getInstance(true)->decryptValue($row['password']);
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to decrypt webspace database password: ' . $e->getMessage());
        }

        return $row;
    }
}
