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

use App\App;

/**
 * Small TTL key store for security counters and flags.
 *
 * Redis is used when the panel has a working connection; otherwise the
 * file-backed {@see FileCounterStore} keeps the same semantics so limits and
 * short-lived flags keep working during a Redis outage or on installs without
 * Redis. Every key expires on its own; nothing here is meant to be durable.
 */
class SecurityStore
{
    private const PREFIX = 'fp:sec:';

    /** @var \Redis|false|null test hook: false forces the file store */
    public static $redisOverride;

    /**
     * Increment a fixed-window counter. The TTL is only set when the window starts.
     *
     * @return array{count: int, ttl: int} counter value after the hit and seconds left in the window
     */
    public static function hit(string $key, int $windowSeconds): array
    {
        $windowSeconds = max(1, $windowSeconds);
        $redis = self::redis();
        if ($redis !== null) {
            try {
                $script = "local c = redis.call('INCR', KEYS[1]) if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end local t = redis.call('TTL', KEYS[1]) if t < 0 then redis.call('EXPIRE', KEYS[1], ARGV[1]) t = tonumber(ARGV[1]) end return {c, t}";
                $result = $redis->eval($script, [self::PREFIX . $key, (string) $windowSeconds], 1);
                if (is_array($result) && count($result) === 2) {
                    return ['count' => (int) $result[0], 'ttl' => max(1, (int) $result[1])];
                }
            } catch (\Throwable $e) {
                self::logFailure($e);
            }
        }

        if (!FileCounterStore::available()) {
            // No store at all: callers treat this as "not limited".
            return ['count' => 0, 'ttl' => $windowSeconds];
        }
        $count = FileCounterStore::increment($key, $windowSeconds);

        return ['count' => $count, 'ttl' => max(1, FileCounterStore::ttl($key))];
    }

    /** Current counter value (0 when missing or expired). */
    public static function count(string $key): int
    {
        $redis = self::redis();
        if ($redis !== null) {
            try {
                return (int) $redis->get(self::PREFIX . $key);
            } catch (\Throwable $e) {
                self::logFailure($e);
            }
        }

        return FileCounterStore::get($key);
    }

    /** Set a flag that expires after the given number of seconds. */
    public static function flag(string $key, int $ttlSeconds): bool
    {
        $ttlSeconds = max(1, $ttlSeconds);
        $redis = self::redis();
        if ($redis !== null) {
            try {
                return (bool) $redis->setex(self::PREFIX . $key, $ttlSeconds, '1');
            } catch (\Throwable $e) {
                self::logFailure($e);
            }
        }
        if (!FileCounterStore::available()) {
            return false;
        }
        FileCounterStore::setEx($key, $ttlSeconds);

        return true;
    }

    /** Seconds left on a key, 0 when it does not exist. */
    public static function ttl(string $key): int
    {
        $redis = self::redis();
        if ($redis !== null) {
            try {
                $ttl = (int) $redis->ttl(self::PREFIX . $key);

                return $ttl > 0 ? $ttl : 0;
            } catch (\Throwable $e) {
                self::logFailure($e);
            }
        }

        return FileCounterStore::ttl($key);
    }

    public static function exists(string $key): bool
    {
        return self::ttl($key) > 0;
    }

    /**
     * @param string|list<string> $keys
     */
    public static function delete(string | array $keys): void
    {
        $keys = array_values(array_map('strval', (array) $keys));
        if ($keys === []) {
            return;
        }
        $redis = self::redis();
        if ($redis !== null) {
            try {
                $redis->del(array_map(static fn (string $k): string => self::PREFIX . $k, $keys));
            } catch (\Throwable $e) {
                self::logFailure($e);
            }
        }
        // Always clear the file copy too, so a key written during a Redis outage cannot linger.
        FileCounterStore::delete($keys);
    }

    private static function redis(): ?\Redis
    {
        if (self::$redisOverride === false) {
            return null;
        }
        if (self::$redisOverride instanceof \Redis) {
            return self::$redisOverride;
        }
        try {
            $app = App::getInstance(true);

            return $app->isRedisEnabled() ? $app->getRedisConnection() : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private static function logFailure(\Throwable $e): void
    {
        try {
            App::getInstance(true)->getLogger()->warning('Security store Redis error, using file store: ' . $e->getMessage());
        } catch (\Throwable) {
        }
    }
}
