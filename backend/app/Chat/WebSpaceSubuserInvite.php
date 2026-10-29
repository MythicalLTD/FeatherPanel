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
 * Invite links that add the person who opens them as a WebSpace subuser with preset permissions.
 * Only a SHA-256 hash of the token is stored; the token itself is shown once.
 * Times use the PHP clock, like the rest of the panel's DATETIME columns.
 */
class WebSpaceSubuserInvite
{
    private static string $table = 'featherpanel_webspace_subuser_invites';

    /** @return array{id: int, token: string}|null */
    public static function create(int $webspaceId, int $createdBy, array $permissions, int $expiresInSeconds, int $maxUses): ?array
    {
        $token = bin2hex(random_bytes(24));
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'INSERT INTO ' . self::$table . ' (webspace_id, token_hash, permissions, created_by, max_uses, expires_at) VALUES (:webspace_id, :hash, :permissions, :created_by, :max_uses, :expires_at)'
            );
            $stmt->execute([
                'webspace_id' => $webspaceId,
                'hash' => hash('sha256', $token),
                'permissions' => json_encode(array_values($permissions)),
                'created_by' => $createdBy,
                'max_uses' => $maxUses,
                'expires_at' => date('Y-m-d H:i:s', time() + $expiresInSeconds),
            ]);

            return ['id' => (int) $pdo->lastInsertId(), 'token' => $token];
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to create WebSpace subuser invite: ' . $e->getMessage());

            return null;
        }
    }

    /** Invites that can still be used, newest first. */
    public static function activeForWebSpace(int $webspaceId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT i.id, i.permissions, i.max_uses, i.uses, i.expires_at, i.created_at, u.username AS created_by_username FROM ' . self::$table . ' i
             LEFT JOIN featherpanel_users u ON u.id = i.created_by
             WHERE i.webspace_id = :webspace_id AND i.revoked_at IS NULL AND i.expires_at > :now AND i.uses < i.max_uses ORDER BY i.id DESC LIMIT 50'
        );
        $stmt->execute(['webspace_id' => $webspaceId, 'now' => date('Y-m-d H:i:s')]);

        return array_map(static function (array $row): array {
            $row['id'] = (int) $row['id'];
            $row['max_uses'] = (int) $row['max_uses'];
            $row['uses'] = (int) $row['uses'];
            $row['permissions'] = json_decode((string) $row['permissions'], true) ?: [];

            return $row;
        }, $stmt->fetchAll(\PDO::FETCH_ASSOC));
    }

    public static function findUsableByToken(string $token): ?array
    {
        if (!preg_match('/^[a-f0-9]{48}$/', $token)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE token_hash = :hash AND revoked_at IS NULL AND expires_at > :now AND uses < max_uses LIMIT 1'
        );
        $stmt->execute(['hash' => hash('sha256', $token), 'now' => date('Y-m-d H:i:s')]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $row['permissions'] = json_decode((string) $row['permissions'], true) ?: [];

        return $row;
    }

    /** Count one use; false when the invite was used up, revoked or expired meanwhile. */
    public static function consume(int $id): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . ' SET uses = uses + 1 WHERE id = :id AND revoked_at IS NULL AND expires_at > :now AND uses < max_uses'
        );
        $stmt->execute(['id' => $id, 'now' => date('Y-m-d H:i:s')]);

        return $stmt->rowCount() === 1;
    }

    public static function revoke(int $id, int $webspaceId): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET revoked_at = :now WHERE id = :id AND webspace_id = :webspace_id AND revoked_at IS NULL');
        $stmt->execute(['id' => $id, 'webspace_id' => $webspaceId, 'now' => date('Y-m-d H:i:s')]);

        return $stmt->rowCount() === 1;
    }
}
