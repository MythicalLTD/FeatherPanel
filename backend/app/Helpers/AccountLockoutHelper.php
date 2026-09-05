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
 * Per-account failed authentication tracking, independent of the existing
 * per-IP rate limiter. This closes the gap where an attacker can rotate IPs
 * (proxy/botnet) to bypass IP-based rate limiting and still brute-force a
 * single known account (login password or 2FA code).
 *
 * Fails open (does not block login) if Redis is unavailable, matching the
 * behavior of RateLimitMiddleware, so a Redis outage never locks everyone out.
 */
class AccountLockoutHelper
{
    /** Failed attempts allowed before lockout kicks in. */
    private const MAX_ATTEMPTS = 10;

    /** Lockout duration in seconds once MAX_ATTEMPTS is reached. */
    private const LOCKOUT_SECONDS = 900; // 15 minutes

    /** Window in seconds during which failed attempts are counted. */
    private const ATTEMPT_WINDOW_SECONDS = 900; // 15 minutes

    /**
     * Returns the remaining lockout time in seconds, or 0 if the identifier
     * (e.g. "login:<user_uuid>" or "2fa:<user_uuid>") is not currently locked.
     */
    public static function getLockoutRemaining(string $identifier): int
    {
        $redis = self::getRedis();
        if ($redis === null) {
            return 0;
        }

        $ttl = $redis->ttl(self::lockKey($identifier));

        return $ttl > 0 ? $ttl : 0;
    }

    /**
     * Record a failed attempt for the identifier. If this pushes the count
     * over $maxAttempts within the attempt window, the account is locked for
     * $lockoutSeconds.
     */
    public static function recordFailure(string $identifier, ?int $maxAttempts = null, ?int $lockoutSeconds = null): void
    {
        $redis = self::getRedis();
        if ($redis === null) {
            return;
        }

        $maxAttempts ??= self::MAX_ATTEMPTS;
        $lockoutSeconds ??= self::LOCKOUT_SECONDS;

        $countKey = self::countKey($identifier);
        $count = $redis->incr($countKey);
        if ($count === 1) {
            $redis->expire($countKey, self::ATTEMPT_WINDOW_SECONDS);
        }

        if ($count >= $maxAttempts) {
            $redis->setex(self::lockKey($identifier), $lockoutSeconds, '1');
        }
    }

    /**
     * Clear failure tracking for the identifier (call on successful auth).
     */
    public static function clear(string $identifier): void
    {
        $redis = self::getRedis();
        if ($redis === null) {
            return;
        }

        $redis->del([self::countKey($identifier), self::lockKey($identifier)]);
    }

    private static function countKey(string $identifier): string
    {
        return 'account_lockout:count:' . $identifier;
    }

    private static function lockKey(string $identifier): string
    {
        return 'account_lockout:locked:' . $identifier;
    }

    private static function getRedis(): ?\Redis
    {
        try {
            $app = App::getInstance(true);

            return $app->getRedisConnection();
        } catch (\Throwable $e) {
            return null;
        }
    }
}
