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
 * Linked single sign-on identities (generic OIDC, Google, GitHub).
 *
 * Provider keys: "google", "github" or "oidc:<provider uuid>".
 */
class SsoIdentity
{
    private static string $table = 'featherpanel_user_sso_identities';

    public static function findByProviderSubject(string $provider, string $subject): ?array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT * FROM ' . self::$table . ' WHERE provider = :provider AND subject = :subject LIMIT 1');
        $stmt->execute(['provider' => $provider, 'subject' => $subject]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function findByUserAndProvider(int $userId, string $provider): ?array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT * FROM ' . self::$table . ' WHERE user_id = :user_id AND provider = :provider LIMIT 1');
        $stmt->execute(['user_id' => $userId, 'provider' => $provider]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function listForUser(int $userId): array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT id, provider, email, last_login_at, created_at FROM ' . self::$table . ' WHERE user_id = :user_id ORDER BY created_at ASC');
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    public static function countForUser(int $userId): int
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE user_id = :user_id');
        $stmt->execute(['user_id' => $userId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Link (or refresh) an identity. One identity per provider per user.
     */
    public static function link(int $userId, string $provider, string $subject, ?string $email): bool
    {
        try {
            $pdo = Database::getPdoConnection();
            $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE user_id = :user_id AND provider = :provider AND subject <> :subject')
                ->execute(['user_id' => $userId, 'provider' => $provider, 'subject' => $subject]);
            $stmt = $pdo->prepare(
                'INSERT INTO ' . self::$table . ' (user_id, provider, subject, email) VALUES (:user_id, :provider, :subject, :email)
                 ON DUPLICATE KEY UPDATE email = VALUES(email), updated_at = CURRENT_TIMESTAMP'
            );

            return $stmt->execute(['user_id' => $userId, 'provider' => $provider, 'subject' => $subject, 'email' => $email]);
        } catch (\Throwable $e) {
            return false;
        }
    }

    public static function touchLogin(int $id): void
    {
        Database::getPdoConnection()->prepare('UPDATE ' . self::$table . ' SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id')->execute(['id' => $id]);
    }

    public static function unlink(int $userId, string $provider): bool
    {
        $stmt = Database::getPdoConnection()->prepare('DELETE FROM ' . self::$table . ' WHERE user_id = :user_id AND provider = :provider');

        return $stmt->execute(['user_id' => $userId, 'provider' => $provider]);
    }
}
