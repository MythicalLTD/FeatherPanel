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
 * Central place to set/clear the `remember_token` session cookie with secure
 * flags. Previously every call site used the legacy 4-argument setcookie()
 * signature (name, value, expire, path), which sets none of HttpOnly,
 * Secure, or SameSite - leaving the session cookie readable by JavaScript
 * (XSS -> session hijack) and sendable cross-site (CSRF exposure).
 */
class SessionCookieHelper
{
    private const COOKIE_NAME = 'remember_token';

    /**
     * Set the remember_token cookie with secure flags.
     *
     * @param string $token The session token value
     * @param int $expire Unix timestamp when the cookie should expire
     */
    public static function set(string $token, int $expire): void
    {
        setcookie(self::COOKIE_NAME, $token, [
            'expires' => $expire,
            'path' => '/',
            'secure' => self::isHttps(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    /**
     * Clear the remember_token cookie (logout / account deletion / etc).
     */
    public static function clear(): void
    {
        setcookie(self::COOKIE_NAME, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'secure' => self::isHttps(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    private static function isHttps(): bool
    {
        if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
            return true;
        }

        // Reverse proxy (nginx/Cloudflare) terminates TLS in front of the app.
        if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower((string) $_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') {
            return true;
        }

        return false;
    }
}
