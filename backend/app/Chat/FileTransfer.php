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
 * Cross server file copy and move jobs.
 */
class FileTransfer
{
    private static string $table = 'featherpanel_file_transfers';

    public static function create(array $data): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('INSERT INTO ' . self::$table . ' (uuid, user_id, source_server_id, target_server_id, mode, source_root, files, destination) VALUES (:uuid, :user_id, :source, :target, :mode, :root, :files, :destination)');
        $stmt->execute([
            'uuid' => $data['uuid'],
            'user_id' => (int) $data['user_id'],
            'source' => (int) $data['source_server_id'],
            'target' => (int) $data['target_server_id'],
            'mode' => $data['mode'] === 'move' ? 'move' : 'copy',
            'root' => (string) $data['source_root'],
            'files' => json_encode(array_values($data['files']), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'destination' => (string) $data['destination'],
        ]);

        return self::getByUuid((string) $data['uuid']);
    }

    public static function getByUuid(string $uuid): ?array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * @param array<string, mixed> $fields status, progress, stage, method, error, finished
     */
    public static function update(int $id, array $fields): void
    {
        $sets = [];
        $params = ['id' => $id];
        foreach (['status', 'progress', 'stage', 'method', 'error'] as $key) {
            if (array_key_exists($key, $fields)) {
                $sets[] = "`{$key}` = :{$key}";
                $params[$key] = $fields[$key];
            }
        }
        if (!empty($fields['finished'])) {
            $sets[] = '`finished_at` = NOW()';
        }
        if ($sets === []) {
            return;
        }
        Database::getPdoConnection()->prepare('UPDATE ' . self::$table . ' SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($params);
    }

    /**
     * Recent jobs of a user (last 24 hours), with server names.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function listRecentForUser(int $userId, int $limit = 20): array
    {
        $pdo = Database::getPdoConnection();
        // Jobs stuck for over an hour are reported as failed (worker died mid run).
        $pdo->prepare('UPDATE ' . self::$table . " SET status = 'failed', error = 'Timed out', finished_at = NOW() WHERE user_id = :u AND status IN ('pending', 'running') AND updated_at < (NOW() - INTERVAL 1 HOUR)")->execute(['u' => $userId]);
        $stmt = $pdo->prepare('SELECT t.uuid, t.mode, t.source_root, t.files, t.destination, t.status, t.progress, t.stage, t.method, t.error, t.created_at, t.finished_at, s.uuidShort AS source_server, s.name AS source_name, d.uuidShort AS target_server, d.name AS target_name FROM ' . self::$table . ' t JOIN featherpanel_servers s ON s.id = t.source_server_id JOIN featherpanel_servers d ON d.id = t.target_server_id WHERE t.user_id = :u AND t.created_at > (NOW() - INTERVAL 1 DAY) ORDER BY t.id DESC LIMIT :l');
        $stmt->bindValue('u', $userId, \PDO::PARAM_INT);
        $stmt->bindValue('l', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return array_map(static function (array $r): array {
            $r['files'] = json_decode((string) $r['files'], true) ?: [];
            $r['progress'] = (int) $r['progress'];

            return $r;
        }, $stmt->fetchAll(\PDO::FETCH_ASSOC));
    }
}
