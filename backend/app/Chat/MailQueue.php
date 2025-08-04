<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Chat;

/**
 * MailQueue service/model for CRUD operations on the mythicalpanel_mail_queue table.
 */
class MailQueue
{
    private static string $table = 'mythicalpanel_mail_queue';

    public static function create(array $data): int|false
    {
        $required = ['user_uuid', 'subject', 'body'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                return false;
            }
        }
        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($data)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
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

    public static function getByIds(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = 'SELECT * FROM ' . self::$table . ' WHERE id IN (' . $placeholders . ')';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($ids);
        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $byId = [];
        foreach ($results as $row) {
            $byId[$row['id']] = $row;
        }

        return $byId;
    }

    public static function getAll(bool $includeDeleted = false): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        if (!$includeDeleted) {
            $sql .= " WHERE deleted = 'false'";
        }
        $stmt = $pdo->query($sql);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function update(int $id, array $data): bool
    {
        if ($id <= 0 || empty($data)) {
            return false;
        }
        unset($data['id']);
        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        if (empty($fields)) {
            return false;
        }
        $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
        $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $data['id'] = $id;

        return $stmt->execute($data);
    }

    public static function softDelete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . " SET deleted = 'true' WHERE id = :id";
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    public static function hardDelete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    public static function restore(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . " SET deleted = 'false' WHERE id = :id";
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }
}
