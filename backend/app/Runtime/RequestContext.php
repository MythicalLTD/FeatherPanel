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

    /**
     * Start a new HTTP request with a fresh id and start time.
     */
    public static function begin(?float $startTime = null): void
    {
        self::$id = bin2hex(random_bytes(16));
        self::$startTime = $startTime ?? microtime(true);
        ++self::$generation;
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
