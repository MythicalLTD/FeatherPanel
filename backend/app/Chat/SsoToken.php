<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Chat;

use App\App;

/**
 * SsoToken service/model for managing SSO login tokens.
 */
class SsoToken
{
    /**
     * @var string The SSO tokens table name
     */
    private static string $table = 'featherpanel_sso_tokens';

    /**
     * Create a new SSO token for a user.
     *
     * @param string $userUuid User UUID
     * @param int $expiresInMinutes Expiration time in minutes
     *
     * @return string|null Generated token or null on failure
     */
    public static function createTokenForUser(string $userUuid, int $expiresInMinutes = 5): ?string
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return null;
        }

        $token = bin2hex(random_bytes(32));

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . ' (token, user_uuid, expires_at) VALUES (:token, :user_uuid, :expires_at)'
        );

        $expiresAt = (new \DateTimeImmutable(sprintf('+%d minutes', $expiresInMinutes)))->format('Y-m-d H:i:s');

        $success = $stmt->execute([
            'token' => $token,
            'user_uuid' => $userUuid,
            'expires_at' => $expiresAt,
        ]);

        if (!$success) {
            App::getInstance(true)->getLogger()->error('Failed to create SSO token for user ' . $userUuid);

            return null;
        }

        return $token;
    }

    /**
     * Get a valid (not used, not expired) SSO token record by token string.
     *
     * @return array<string,mixed>|null
     */
    public static function getValidToken(string $token): ?array
    {
        if ($token === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE token = :token AND used = \'false\' LIMIT 1'
        );
        $stmt->execute(['token' => $token]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($row === false) {
            return null;
        }

        // Validate expiration in PHP to avoid DB timezone issues
        if (!isset($row['expires_at'])) {
            return null;
        }

        try {
            $expiresAt = new \DateTimeImmutable((string) $row['expires_at']);
            $now = new \DateTimeImmutable('now');
            if ($expiresAt <= $now) {
                return null;
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Invalid expires_at on SSO token: ' . $e->getMessage());

            return null;
        }

        return $row;
    }

    /**
     * Mark a token as used.
     */
    public static function markTokenUsed(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . ' SET used = \'true\' WHERE id = :id'
        );

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Delete old SSO tokens (expired or used).
     *
     * @param int $olderThanDays Delete tokens older than this many days (default: 7)
     *
     * @return int Number of tokens deleted
     */
    public static function deleteOldTokens(int $olderThanDays = 7): int
    {
        $pdo = Database::getPdoConnection();
        $cutoffDate = (new \DateTimeImmutable(sprintf('-%d days', $olderThanDays)))->format('Y-m-d H:i:s');

        // Delete tokens that are either expired, used, or older than cutoff date
        $stmt = $pdo->prepare(
            'DELETE FROM ' . self::$table . ' WHERE (expires_at < NOW() OR used = \'true\' OR created_at < :cutoff_date)'
        );

        if ($stmt->execute(['cutoff_date' => $cutoffDate])) {
            return $stmt->rowCount();
        }

        return 0;
    }
}
