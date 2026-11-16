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

namespace App\Observability;

use App\App;

/**
 * phpredis connection for observability counters and the Loki queue.
 *
 * Reuses the application's connection when it has one (HTTP and cron boots) and
 * opens a short-lived connection of its own otherwise (CLI). Returns null when
 * Redis is unavailable so callers can degrade instead of failing.
 */
final class ObservabilityRedis
{
    private static ?\Redis $own = null;

    private static float $retryAt = 0.0;

    public static function connection(): ?\Redis
    {
        try {
            $app = App::getInstance(true);
            if ($app->isRedisEnabled()) {
                return $app->getRedisConnection();
            }
        } catch (\Throwable) {
        }

        if (!class_exists(\Redis::class)) {
            return null;
        }
        if (self::$own !== null) {
            return self::$own;
        }
        if (microtime(true) < self::$retryAt) {
            return null;
        }

        try {
            $host = (string) App::env('REDIS_HOST', '127.0.0.1');
            $port = (int) App::env('REDIS_PORT', '6379');
            $password = App::env('REDIS_PASSWORD', null);
            $redis = new \Redis();
            if (!$redis->connect($host, $port, 1.0)) {
                throw new \RuntimeException('connect failed');
            }
            if ($password !== null && $password !== '' && $redis->auth($password) === false) {
                throw new \RuntimeException('auth failed');
            }

            return self::$own = $redis;
        } catch (\Throwable) {
            self::$retryAt = microtime(true) + 30.0;

            return null;
        }
    }
}
