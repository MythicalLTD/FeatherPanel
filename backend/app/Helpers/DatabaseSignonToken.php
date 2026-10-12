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

namespace App\Helpers;

/**
 * Single-use, short-lived tokens for phpMyAdmin / phpPgAdmin signon.
 * Credentials stay server-side; the browser only receives the opaque token.
 */
final class DatabaseSignonToken
{
    public const TTL_SECONDS = 60;

    /**
     * @param array{
     *   db: string,
     *   host: string,
     *   port?: int,
     *   user: string,
     *   pass: string,
     * } $creds
     *
     * @throws \RuntimeException when the token cannot be persisted
     */
    public static function mint(array $creds, int $ttlSeconds = self::TTL_SECONDS): string
    {
        $token = bin2hex(random_bytes(32));
        $dir = self::tokenDir();
        if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
            throw new \RuntimeException('Failed to create signon token directory');
        }

        self::pruneStale($dir);

        $payload = [
            'db' => (string) $creds['db'],
            'host' => (string) $creds['host'],
            'port' => (int) ($creds['port'] ?? 3306),
            'user' => (string) $creds['user'],
            'pass' => (string) $creds['pass'],
            'expires' => time() + max(15, $ttlSeconds),
        ];

        $path = $dir . '/' . $token . '.json';
        if (file_put_contents($path, json_encode($payload, JSON_UNESCAPED_SLASHES), LOCK_EX) === false) {
            throw new \RuntimeException('Failed to persist signon token');
        }
        @chmod($path, 0600);

        return $token;
    }

    /**
     * Backend-reachable hostname (not the user-facing subdomain).
     *
     * @param array<string, mixed> $databaseHost
     */
    public static function backendHost(array $databaseHost): string
    {
        if (!empty($databaseHost['database_host'])) {
            return (string) $databaseHost['database_host'];
        }

        return \App\Chat\DatabaseInstance::getDatabaseHostname($databaseHost);
    }

    public static function tokenDir(): string
    {
        return dirname(__DIR__, 2) . '/storage/db_signon_tokens';
    }

    private static function pruneStale(string $dir): void
    {
        foreach ((glob($dir . '/*.json') ?: []) as $stale) {
            $mtime = @filemtime($stale);
            if ($mtime !== false && $mtime < time() - 300) {
                @unlink($stale);
            }
        }
    }
}
