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

/**
 * Notes of the FeatherOS Notes app, private to each user.
 */
class FeatherOsNote
{
    private static string $table = 'featherpanel_featheros_notes';

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function listForUser(int $userId): array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT id, title, content, color, pinned, created_at, updated_at FROM ' . self::$table . ' WHERE user_id = :u ORDER BY pinned DESC, updated_at DESC, id DESC');
        $stmt->execute(['u' => $userId]);

        return array_map([self::class, 'present'], $stmt->fetchAll(\PDO::FETCH_ASSOC));
    }

    public static function countForUser(int $userId): int
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE user_id = :u');
        $stmt->execute(['u' => $userId]);

        return (int) $stmt->fetchColumn();
    }

    public static function getForUser(int $userId, int $id): ?array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT id, title, content, color, pinned, created_at, updated_at FROM ' . self::$table . ' WHERE id = :id AND user_id = :u LIMIT 1');
        $stmt->execute(['id' => $id, 'u' => $userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? self::present($row) : null;
    }

    public static function create(int $userId, string $title, string $content, string $color, bool $pinned): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('INSERT INTO ' . self::$table . ' (user_id, title, content, color, pinned) VALUES (:u, :t, :c, :col, :p)');
        $stmt->execute(['u' => $userId, 't' => $title, 'c' => $content, 'col' => $color, 'p' => $pinned ? 1 : 0]);

        return self::getForUser($userId, (int) $pdo->lastInsertId());
    }

    /**
     * @param array<string, mixed> $fields title, content, color, pinned
     */
    public static function update(int $userId, int $id, array $fields): ?array
    {
        $sets = [];
        $params = ['id' => $id, 'u' => $userId];
        foreach (['title', 'content', 'color'] as $key) {
            if (array_key_exists($key, $fields)) {
                $sets[] = "`{$key}` = :{$key}";
                $params[$key] = (string) $fields[$key];
            }
        }
        if (array_key_exists('pinned', $fields)) {
            $sets[] = '`pinned` = :pinned';
            $params['pinned'] = $fields['pinned'] ? 1 : 0;
        }
        if ($sets !== []) {
            Database::getPdoConnection()->prepare('UPDATE ' . self::$table . ' SET ' . implode(', ', $sets) . ' WHERE id = :id AND user_id = :u')->execute($params);
        }

        return self::getForUser($userId, $id);
    }

    public static function delete(int $userId, int $id): bool
    {
        $stmt = Database::getPdoConnection()->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id AND user_id = :u');
        $stmt->execute(['id' => $id, 'u' => $userId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function present(array $row): array
    {
        $row['id'] = (int) $row['id'];
        $row['pinned'] = (int) $row['pinned'] === 1;

        return $row;
    }
}
