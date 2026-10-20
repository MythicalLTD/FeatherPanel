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

class FeatherOsTrash
{
    private static string $table = 'featherpanel_featheros_trash';

    public static function listForUser(int $userId): array
    {
        try {
            $pdo = App::getInstance(true)->getDatabase()->getPdo();
            $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE user_id = :u ORDER BY deleted_at DESC, id DESC LIMIT 500');
            $stmt->execute(['u' => $userId]);

            return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('FeatherOsTrash::listForUser failed: ' . $e->getMessage());

            return [];
        }
    }

    public static function getForUser(int $userId, string $uuid): ?array
    {
        $pdo = App::getInstance(true)->getDatabase()->getPdo();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE user_id = :u AND uuid = :uuid LIMIT 1');
        $stmt->execute(['u' => $userId, 'uuid' => $uuid]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public static function create(array $data): ?array
    {
        $pdo = App::getInstance(true)->getDatabase()->getPdo();
        $stmt = $pdo->prepare('INSERT INTO ' . self::$table . ' (uuid, user_id, server_id, server_uuid_short, original_root, original_name, is_directory, size) VALUES (:uuid, :user_id, :server_id, :server_uuid_short, :original_root, :original_name, :is_directory, :size)');
        $ok = $stmt->execute([
            'uuid' => $data['uuid'],
            'user_id' => (int) $data['user_id'],
            'server_id' => (int) $data['server_id'],
            'server_uuid_short' => $data['server_uuid_short'],
            'original_root' => $data['original_root'],
            'original_name' => $data['original_name'],
            'is_directory' => !empty($data['is_directory']) ? 1 : 0,
            'size' => (int) ($data['size'] ?? 0),
        ]);
        if (!$ok) {
            return null;
        }

        return self::getForUser((int) $data['user_id'], $data['uuid']);
    }

    public static function deleteForUser(int $userId, array $uuids): int
    {
        if ($uuids === []) {
            return 0;
        }
        $pdo = App::getInstance(true)->getDatabase()->getPdo();
        $in = implode(',', array_fill(0, count($uuids), '?'));
        $params = array_merge([$userId], array_values($uuids));
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE user_id = ? AND uuid IN (' . $in . ')');
        $stmt->execute($params);

        return $stmt->rowCount();
    }

    public static function deleteAllForUser(int $userId, ?string $serverUuidShort = null): int
    {
        $pdo = App::getInstance(true)->getDatabase()->getPdo();
        if ($serverUuidShort) {
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE user_id = :u AND server_uuid_short = :s');
            $stmt->execute(['u' => $userId, 's' => $serverUuidShort]);
        } else {
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE user_id = :u');
            $stmt->execute(['u' => $userId]);
        }

        return $stmt->rowCount();
    }

    public static function present(array $row): array
    {
        return [
            'id' => $row['uuid'],
            'server_uuid' => $row['server_uuid_short'],
            'original_root' => $row['original_root'],
            'original_name' => $row['original_name'],
            'is_directory' => (bool) $row['is_directory'],
            'size' => (int) $row['size'],
            'deleted_at' => $row['deleted_at'],
            'trash_path' => '/.featheros-trash/' . $row['uuid'] . '/' . $row['original_name'],
        ];
    }
}
