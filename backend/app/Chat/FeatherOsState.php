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
 * Per-user FeatherOS desktop state (open windows, icon layout, dock, wallpaper, theme).
 * Stored as one JSON document per user so it follows the user across browsers.
 */
class FeatherOsState
{
    private static string $table = 'featherpanel_featheros_states';

    /**
     * @return array{state: array<string, mixed>, revision: int, updated_at: string}|null
     */
    public static function getForUser(int $userId): ?array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT state, revision, updated_at FROM ' . self::$table . ' WHERE user_id = :u LIMIT 1');
        $stmt->execute(['u' => $userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $state = json_decode((string) $row['state'], true);

        return [
            'state' => is_array($state) ? $state : [],
            'revision' => (int) $row['revision'],
            'updated_at' => (string) $row['updated_at'],
        ];
    }

    /**
     * Insert or replace the state of a user and bump its revision.
     *
     * @param array<string, mixed> $state
     */
    public static function saveForUser(int $userId, array $state): ?array
    {
        $json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            return null;
        }
        $stmt = Database::getPdoConnection()->prepare('INSERT INTO ' . self::$table . ' (user_id, state) VALUES (:u, :s) ON DUPLICATE KEY UPDATE state = VALUES(state), revision = revision + 1');
        $stmt->execute(['u' => $userId, 's' => $json]);

        return self::getForUser($userId);
    }

    public static function deleteForUser(int $userId): bool
    {
        $stmt = Database::getPdoConnection()->prepare('DELETE FROM ' . self::$table . ' WHERE user_id = :u');

        return $stmt->execute(['u' => $userId]);
    }
}
