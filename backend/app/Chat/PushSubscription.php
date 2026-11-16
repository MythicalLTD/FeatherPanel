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
 * Browser Web Push subscriptions for a user (endpoint + ECDH keys).
 */
class PushSubscription
{
    public const MAX_PER_USER = 10;

    private static string $table = 'featherpanel_push_subscriptions';

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function listForUser(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }
        $stmt = Database::getPdoConnection()->prepare(
            'SELECT id, endpoint, p256dh, auth, content_encoding, user_agent, created_at, updated_at FROM ' . self::$table . ' WHERE user_id = :u ORDER BY id DESC'
        );
        $stmt->execute(['u' => $userId]);

        return array_map([self::class, 'present'], $stmt->fetchAll(\PDO::FETCH_ASSOC));
    }

    public static function countForUser(int $userId): int
    {
        if ($userId <= 0) {
            return 0;
        }
        $stmt = Database::getPdoConnection()->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE user_id = :u');
        $stmt->execute(['u' => $userId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Upsert by endpoint. Reassigns the row to this user when the same browser was linked before.
     *
     * @return array<string, mixed>|null
     */
    public static function upsert(int $userId, string $endpoint, string $p256dh, string $auth, string $contentEncoding = 'aes128gcm', ?string $userAgent = null): ?array
    {
        if ($userId <= 0 || $endpoint === '' || $p256dh === '' || $auth === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $existing = $pdo->prepare('SELECT id, user_id FROM ' . self::$table . ' WHERE endpoint = :e LIMIT 1');
        $existing->execute(['e' => $endpoint]);
        $row = $existing->fetch(\PDO::FETCH_ASSOC);

        if ($row) {
            $stmt = $pdo->prepare(
                'UPDATE ' . self::$table . ' SET user_id = :u, p256dh = :p, auth = :a, content_encoding = :c, user_agent = :ua WHERE id = :id'
            );
            $stmt->execute([
                'u' => $userId,
                'p' => $p256dh,
                'a' => $auth,
                'c' => $contentEncoding !== '' ? $contentEncoding : 'aes128gcm',
                'ua' => $userAgent,
                'id' => (int) $row['id'],
            ]);

            return self::getById((int) $row['id']);
        }

        if (self::countForUser($userId) >= self::MAX_PER_USER) {
            // Drop the oldest subscription so a new device can register.
            $pdo->prepare(
                'DELETE FROM ' . self::$table . ' WHERE user_id = :u ORDER BY id ASC LIMIT 1'
            )->execute(['u' => $userId]);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . ' (user_id, endpoint, p256dh, auth, content_encoding, user_agent) VALUES (:u, :e, :p, :a, :c, :ua)'
        );
        $stmt->execute([
            'u' => $userId,
            'e' => $endpoint,
            'p' => $p256dh,
            'a' => $auth,
            'c' => $contentEncoding !== '' ? $contentEncoding : 'aes128gcm',
            'ua' => $userAgent,
        ]);

        return self::getById((int) $pdo->lastInsertId());
    }

    public static function deleteForUserByEndpoint(int $userId, string $endpoint): bool
    {
        if ($userId <= 0 || $endpoint === '') {
            return false;
        }
        $stmt = Database::getPdoConnection()->prepare(
            'DELETE FROM ' . self::$table . ' WHERE user_id = :u AND endpoint = :e'
        );
        $stmt->execute(['u' => $userId, 'e' => $endpoint]);

        return $stmt->rowCount() > 0;
    }

    public static function deleteByEndpoint(string $endpoint): bool
    {
        if ($endpoint === '') {
            return false;
        }
        $stmt = Database::getPdoConnection()->prepare('DELETE FROM ' . self::$table . ' WHERE endpoint = :e');
        $stmt->execute(['e' => $endpoint]);

        return $stmt->rowCount() > 0;
    }

    public static function deleteAllForUser(int $userId): int
    {
        if ($userId <= 0) {
            return 0;
        }
        $stmt = Database::getPdoConnection()->prepare('DELETE FROM ' . self::$table . ' WHERE user_id = :u');
        $stmt->execute(['u' => $userId]);

        return $stmt->rowCount();
    }

    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $stmt = Database::getPdoConnection()->prepare(
            'SELECT id, user_id, endpoint, p256dh, auth, content_encoding, user_agent, created_at, updated_at FROM ' . self::$table . ' WHERE id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? self::present($row) : null;
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function present(array $row): array
    {
        $row['id'] = (int) $row['id'];
        if (isset($row['user_id'])) {
            $row['user_id'] = (int) $row['user_id'];
        }

        return $row;
    }
}
