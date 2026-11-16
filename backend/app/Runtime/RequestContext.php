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

namespace App\Runtime;

/**
 * Per-request identity (request id, start time).
 *
 * Constants such as REQUEST_ID and APP_START are fixed for the lifetime of the
 * PHP process, which is one request under php-fpm or FrankenPHP classic mode
 * but many requests under FrankenPHP worker mode. Core code reads the values
 * from here instead so they are correct in both modes.
 */
final class RequestContext
{
    private static ?string $id = null;
    private static ?float $startTime = null;
    private static int $generation = 0;
    private static ?string $impersonatorUuid = null;
    private static ?string $impersonatorUsername = null;
    private static ?string $effectiveUserUuid = null;
    private static ?string $effectiveUsername = null;
    private static ?string $route = null;
    private static ?string $userUuid = null;

    /**
     * Start a new HTTP request with a fresh id and start time.
     *
     * @param string|null $incomingId an X-Request-Id sent by a trusted upstream (load balancer,
     *                                reverse proxy, tracing gateway); kept when it looks like an id,
     *                                otherwise a fresh one is generated
     */
    public static function begin(?float $startTime = null, ?string $incomingId = null): void
    {
        self::$id = self::sanitizeIncomingId($incomingId) ?? bin2hex(random_bytes(16));
        self::$startTime = $startTime ?? microtime(true);
        self::$route = null;
        self::$userUuid = null;
        ++self::$generation;
        self::$impersonatorUuid = null;
        self::$impersonatorUsername = null;
        self::$effectiveUserUuid = null;
        self::$effectiveUsername = null;
    }

    /**
     * Remember that this request is an admin acting as another user.
     *
     * @param array<string, mixed> $admin
     * @param array<string, mixed> $target
     */
    public static function setImpersonation(array $admin, array $target): void
    {
        self::$impersonatorUuid = isset($admin['uuid']) ? (string) $admin['uuid'] : null;
        self::$impersonatorUsername = isset($admin['username']) ? (string) $admin['username'] : null;
        self::$effectiveUserUuid = isset($target['uuid']) ? (string) $target['uuid'] : null;
        self::$effectiveUsername = isset($target['username']) ? (string) $target['username'] : null;
    }

    /**
     * A request id from a client header, or null when it is missing or does not look like one.
     * Only short ids made of safe characters are kept so they can go into logs and headers as-is.
     */
    public static function sanitizeIncomingId(?string $incomingId): ?string
    {
        if ($incomingId === null) {
            return null;
        }
        $incomingId = trim($incomingId);
        if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._:\-]{7,127}$/', $incomingId) !== 1) {
            return null;
        }

        return $incomingId;
    }

    /**
     * Remember the matched route template (e.g. /api/user/servers/{uuidShort}) for metrics and logs.
     */
    public static function setRoute(?string $route): void
    {
        self::$route = $route;
    }

    public static function route(): ?string
    {
        return self::$route;
    }

    /**
     * Remember the authenticated user of this request for logs.
     */
    public static function setUserUuid(?string $userUuid): void
    {
        self::$userUuid = $userUuid;
    }

    public static function userUuid(): ?string
    {
        return self::$userUuid;
    }

    public static function impersonatorUuid(): ?string
    {
        return self::$impersonatorUuid;
    }

    public static function impersonatorUsername(): ?string
    {
        return self::$impersonatorUsername;
    }

    public static function effectiveUserUuid(): ?string
    {
        return self::$effectiveUserUuid;
    }

    public static function effectiveUsername(): ?string
    {
        return self::$effectiveUsername;
    }

    public static function isImpersonating(): bool
    {
        return self::$impersonatorUuid !== null && self::$effectiveUserUuid !== null
            && self::$impersonatorUuid !== self::$effectiveUserUuid;
    }

    /**
     * The id of the current request (falls back to the REQUEST_ID constant
     * for CLI and cron bootstraps, which never call begin()).
     */
    public static function id(): string
    {
        if (self::$id !== null) {
            return self::$id;
        }

        if (defined('REQUEST_ID')) {
            return (string) constant('REQUEST_ID');
        }

        self::$id = bin2hex(random_bytes(16));

        return self::$id;
    }

    /**
     * The microtime(true) timestamp at which the current request started.
     */
    public static function startTime(): float
    {
        if (self::$startTime !== null) {
            return self::$startTime;
        }

        if (defined('APP_START')) {
            return (float) constant('APP_START');
        }

        return self::$startTime = microtime(true);
    }

    /**
     * Number of requests started in this process. Request-scoped caches use it
     * to notice that a new request began.
     */
    public static function generation(): int
    {
        return self::$generation;
    }
}
