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

use App\Cache\Cache;
use App\Chat\Database;
use App\Config\ConfigFactory;
use App\Helpers\RateLimitConfig;
use App\Helpers\PermissionHelper;
use App\Telemetry\SentryTelemetry;

/**
 * Hooks that run around every HTTP request.
 *
 * Under FrankenPHP worker mode the PHP process (and every static property)
 * survives between requests. reset() clears request-scoped state before a
 * request is handled and terminate() cleans up after the response was sent.
 * Both are cheap no-ops in classic mode, where every request starts fresh.
 *
 * Plugins that keep request-scoped static state can register their own reset
 * callback with onReset().
 */
final class RequestLifecycle
{
    /** @var array<string, callable(): void> */
    private static array $resetters = [];

    private static ?int $bootTimeLimit = null;

    /**
     * Register a callback that runs at the start of every request.
     *
     * @param string $name unique name, registering the same name again replaces the callback
     * @param callable(): void $resetter
     */
    public static function onReset(string $name, callable $resetter): void
    {
        self::$resetters[$name] = $resetter;
    }

    /**
     * Remove a callback registered with onReset().
     */
    public static function removeReset(string $name): void
    {
        unset(self::$resetters[$name]);
    }

    /**
     * Clear request-scoped state before a request is handled.
     */
    public static function reset(): void
    {
        if (self::$bootTimeLimit === null) {
            self::$bootTimeLimit = (int) ini_get('max_execution_time');
        }

        // Runtime settings changed by a previous request stay in effect in a worker.
        ignore_user_abort(false);
        @set_time_limit(self::$bootTimeLimit);
        date_default_timezone_set('UTC');

        PermissionHelper::resetRequestCache();
        ConfigFactory::resetRequestCache();
        RateLimitConfig::refreshIfChanged();
        Cache::resetForRequest();
        SentryTelemetry::resetRequestScope();

        foreach (self::$resetters as $name => $resetter) {
            try {
                $resetter();
            } catch (\Throwable $e) {
                error_log('Request reset hook "' . $name . '" failed: ' . $e->getMessage());
            }
        }
    }

    /**
     * Clean up after the response was sent.
     *
     * @param int $statusCode the HTTP status code of the response
     */
    public static function terminate(int $statusCode): void
    {
        // A request that died half-way through a transaction must not keep its
        // row locks (or leak its uncommitted writes) into the next request.
        Database::rollBackOpenTransactions();
        Database::markRequestFinished($statusCode >= 500);
    }
}
