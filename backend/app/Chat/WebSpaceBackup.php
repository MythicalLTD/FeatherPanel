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

class WebSpaceBackup
{
    private static string $table = 'featherpanel_webspace_backups';

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $pdo = Database::getPdoConnection();
        $uuid = !empty($data['uuid']) ? (string) $data['uuid'] : self::uuid();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . ' (uuid, webspace_id, name, bytes, checksum, status) VALUES (:uuid, :wid, :name, :bytes, :checksum, :status)'
        );
        $ok = $stmt->execute([
            'uuid' => $uuid,
            'wid' => (int) $data['webspace_id'],
            'name' => $data['name'] ?? null,
            'bytes' => (int) ($data['bytes'] ?? 0),
            'checksum' => $data['checksum'] ?? null,
            'status' => $data['status'] ?? 'pending',
        ]);

        return $ok ? (int) $pdo->lastInsertId() : false;
    }

    /** @return array<int, array<string, mixed>> */
    public static function listByWebSpaceId(int $webspaceId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE webspace_id = :id ORDER BY id DESC');
        $stmt->execute(['id' => $webspaceId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    /** @return array<string, mixed>|null */
    public static function getByUuid(string $uuid): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public static function deleteByUuid(string $uuid): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE uuid = :uuid');

        return $stmt->execute(['uuid' => $uuid]);
    }

    public static function markCompleted(string $uuid, int $bytes, ?string $checksum): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . ' SET status = :status, bytes = :bytes, checksum = :checksum, completed_at = CURRENT_TIMESTAMP WHERE uuid = :uuid'
        );

        return $stmt->execute([
            'status' => 'completed',
            'bytes' => $bytes,
            'checksum' => $checksum,
            'uuid' => $uuid,
        ]);
    }

    private static function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0F) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3F) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
