<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Chat;

class Location
{
    private static string $table = 'mythicalpanel_locations';

    public static function getAll(?string $search = null, int $limit = 10, int $offset = 0): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $params = [];

        if ($search !== null) {
            $sql .= ' WHERE name LIKE :search OR country LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        $sql .= ' LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);
        if (!empty($params)) {
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function getById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getCount(?string $search = null): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $params = [];

        if ($search !== null) {
            $sql .= ' WHERE name LIKE :search OR country LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        $stmt = $pdo->prepare($sql);
        if (!empty($params)) {
            $stmt->execute($params);
        } else {
            $stmt->execute();
        }

        return (int) $stmt->fetchColumn();
    }

    public static function create(array $data): int|false
    {
        $fields = ['name', 'description', 'ip_address', 'country'];
        $insert = [];
        foreach ($fields as $field) {
            $insert[$field] = $data[$field] ?? null;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'INSERT INTO ' . self::$table . ' (name, description, ip_address, country) VALUES (:name, :description, :ip_address, :country)';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($insert)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    public static function update(int $id, array $data): bool
    {
        $fields = ['name', 'description', 'ip_address', 'country'];
        $set = [];
        $params = ['id' => $id];
        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $set[] = "`$field` = :$field";
                $params[$field] = $data[$field];
            }
        }
        if (empty($set)) {
            return false;
        }
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $set) . ' WHERE id = :id';
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    public static function delete(int $id): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }
}
