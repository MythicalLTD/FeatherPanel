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

class WebSpaceTransfer
{
    private static string $table = 'featherpanel_webspace_transfers';

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . ' (webspace_uuid, source_web_node_id, dest_web_node_id, status) VALUES (:uuid, :src, :dst, :status)'
        );
        $ok = $stmt->execute([
            'uuid' => (string) $data['webspace_uuid'],
            'src' => (int) $data['source_web_node_id'],
            'dst' => (int) $data['dest_web_node_id'],
            'status' => $data['status'] ?? 'pending',
        ]);

        return $ok ? (int) $pdo->lastInsertId() : false;
    }

    public static function hasActiveTransfer(string $webspaceUuid): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT id FROM ' . self::$table . " WHERE webspace_uuid = :uuid AND status IN ('pending','running') LIMIT 1"
        );
        $stmt->execute(['uuid' => $webspaceUuid]);

        return (bool) $stmt->fetchColumn();
    }

    /** @return array<string, mixed>|null */
    public static function getActiveByUuid(string $webspaceUuid): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . " WHERE webspace_uuid = :uuid AND status IN ('pending','running') ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['uuid' => $webspaceUuid]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /** @return array<string, mixed>|null */
    public static function getLatestByUuid(string $webspaceUuid): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE webspace_uuid = :uuid ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute(['uuid' => $webspaceUuid]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public static function complete(int $id, bool $successful, ?string $error = null): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . ' SET status = :status, error = :error, completed_at = CURRENT_TIMESTAMP WHERE id = :id'
        );

        return $stmt->execute([
            'status' => $successful ? 'completed' : 'failed',
            'error' => $error,
            'id' => $id,
        ]);
    }
}
