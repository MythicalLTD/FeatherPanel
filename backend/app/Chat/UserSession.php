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
 * Per-device login sessions.
 *
 * The session cookie holds a random per-device token (prefix "fps_"); only its SHA-256 hash is stored.
 * Each row also stores a hash of the user's account token (users.remember_token) at sign-in time.
 * Rotating the account token (password reset, admin forced logout) therefore ends every session at once.
 */
class UserSession
{
    public const TOKEN_PREFIX = 'fps_';

    /** Sessions are valid for 30 days after the last sign-in, like the cookie. */
    public const LIFETIME_SECONDS = 2592000;

    private static string $table = 'featherpanel_user_sessions';

    /** Id of the session that authenticated the current request, if any. */
    private static ?int $currentId = null;

    public static function isSessionToken(string $token): bool
    {
        return str_starts_with($token, self::TOKEN_PREFIX);
    }

    public static function hash(string $value): string
    {
        return hash('sha256', $value);
    }

    /**
     * Start a session for a user and return the raw cookie token.
     */
    public static function issue(array $user, string $accountToken, ?string $ip, ?string $userAgent): ?string
    {
        if (!isset($user['id'])) {
            return null;
        }
        $token = self::TOKEN_PREFIX . bin2hex(random_bytes(32));
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'INSERT INTO ' . self::$table . ' (user_id, token_hash, account_token_hash, ip_address, user_agent) VALUES (:user_id, :token_hash, :account_token_hash, :ip, :ua)'
            );
            $stmt->execute([
                'user_id' => (int) $user['id'],
                'token_hash' => self::hash($token),
                'account_token_hash' => self::hash($accountToken),
                'ip' => $ip !== null ? mb_substr($ip, 0, 64) : null,
                'ua' => $userAgent !== null ? mb_substr($userAgent, 0, 512) : null,
            ]);
            self::$currentId = (int) $pdo->lastInsertId();
        } catch (\Throwable) {
            // Table missing (migrations not applied yet): fall back to the legacy account token cookie.
            return null;
        }

        return $token;
    }

    /**
     * Resolve a session token to its active session row, or null when unknown, revoked or expired.
     */
    public static function findActive(string $token): ?array
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'SELECT * FROM ' . self::$table . ' WHERE token_hash = :hash AND revoked_at IS NULL AND created_at > (NOW() - INTERVAL ' . self::LIFETIME_SECONDS . ' SECOND) LIMIT 1'
            );
            $stmt->execute(['hash' => self::hash($token)]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        } catch (\Throwable) {
            return null;
        }

        return $row ?: null;
    }

    /**
     * Mark the session as the one serving this request and bump last_seen_at (at most once a minute).
     */
    public static function touch(array $session, ?string $ip): void
    {
        self::$currentId = (int) $session['id'];
        $lastSeen = strtotime((string) ($session['last_seen_at'] ?? '')) ?: 0;
        if (time() - $lastSeen < 60 && ($session['ip_address'] ?? null) === $ip) {
            return;
        }
        try {
            $stmt = Database::getPdoConnection()->prepare(
                'UPDATE ' . self::$table . ' SET last_seen_at = NOW(), ip_address = :ip WHERE id = :id'
            );
            $stmt->execute(['id' => (int) $session['id'], 'ip' => $ip !== null ? mb_substr($ip, 0, 64) : null]);
        } catch (\Throwable) {
            // Not critical.
        }
    }

    public static function currentId(): ?int
    {
        return self::$currentId;
    }

    /**
     * Active sessions of a user, newest activity first.
     *
     * @return list<array<string, mixed>>
     */
    public static function listActive(int $userId, string $accountToken): array
    {
        $stmt = Database::getPdoConnection()->prepare(
            'SELECT id, ip_address, user_agent, created_at, last_seen_at FROM ' . self::$table . ' WHERE user_id = :user_id AND account_token_hash = :account AND revoked_at IS NULL AND created_at > (NOW() - INTERVAL ' . self::LIFETIME_SECONDS . ' SECOND) ORDER BY last_seen_at DESC LIMIT 100'
        );
        $stmt->execute(['user_id' => $userId, 'account' => self::hash($accountToken)]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    public static function revoke(int $id, int $userId): bool
    {
        $stmt = Database::getPdoConnection()->prepare(
            'UPDATE ' . self::$table . ' SET revoked_at = NOW() WHERE id = :id AND user_id = :user_id AND revoked_at IS NULL'
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);

        return $stmt->rowCount() > 0;
    }

    public static function revokeToken(string $token): void
    {
        try {
            $stmt = Database::getPdoConnection()->prepare(
                'UPDATE ' . self::$table . ' SET revoked_at = NOW() WHERE token_hash = :hash AND revoked_at IS NULL'
            );
            $stmt->execute(['hash' => self::hash($token)]);
        } catch (\Throwable) {
            // Not critical.
        }
    }

    /**
     * Revoke every session of a user except one. Returns how many were revoked.
     */
    public static function revokeOthers(int $userId, ?int $keepId): int
    {
        $sql = 'UPDATE ' . self::$table . ' SET revoked_at = NOW() WHERE user_id = :user_id AND revoked_at IS NULL';
        $params = ['user_id' => $userId];
        if ($keepId !== null) {
            $sql .= ' AND id <> :keep';
            $params['keep'] = $keepId;
        }
        $stmt = Database::getPdoConnection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount();
    }

    /**
     * Re-bind a session to a rotated account token so it survives "sign out other sessions".
     */
    public static function rebind(int $id, string $accountToken): void
    {
        $stmt = Database::getPdoConnection()->prepare(
            'UPDATE ' . self::$table . ' SET account_token_hash = :account WHERE id = :id'
        );
        $stmt->execute(['id' => $id, 'account' => self::hash($accountToken)]);
    }
}
