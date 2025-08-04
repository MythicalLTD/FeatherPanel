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

class Activity
{
    private static string $table = 'mythicalpanel_activity';

    public static function createActivity(array $data): int|false
    {
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

    public static function getActivityById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getActivitiesByUser(string $user_uuid): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE user_uuid = :user_uuid ORDER BY created_at DESC LIMIT 250');
        $stmt->execute(['user_uuid' => $user_uuid]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function getAllActivities(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT * FROM ' . self::$table . ' ORDER BY created_at DESC');

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function updateActivity(int $id, array $data): bool
    {
        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
        $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $data['id'] = $id;

        return $stmt->execute($data);
    }

    public static function deleteActivity(int $id): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }
}
