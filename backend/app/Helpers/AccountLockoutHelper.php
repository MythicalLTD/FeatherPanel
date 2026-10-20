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
use App\Plugins\Events\Events\AuthEvent;

/**
 * Per-account failed authentication tracking, independent of the existing
 * per-IP rate limiter. This closes the gap where an attacker can rotate IPs
 * (proxy/botnet) to bypass IP-based rate limiting and still brute-force a
 * single known account (login password or 2FA code).
 *
 * Login uses escalating delays (does not deny the account owner). 2FA uses a
 * hard lockout because a 6-digit TOTP code has a much smaller keyspace.
 *
 * Redis is the primary counter store. When Redis is unreachable the same
 * counters/locks are kept in a small file-backed store instead of dropping the
 * protection entirely: a Redis outage is exactly the moment an attacker would
 * like to have no counters at all.
 */
class AccountLockoutHelper
{
    /** Failed attempts allowed before hard lockout kicks in (2FA path). */
    private const MAX_ATTEMPTS = 10;

    /** Lockout duration in seconds once MAX_ATTEMPTS is reached (2FA path). */
    private const LOCKOUT_SECONDS = 900; // 15 minutes

    /** Window in seconds during which failed attempts are counted. */
    private const ATTEMPT_WINDOW_SECONDS = 900; // 15 minutes

    /** Failed attempts before login begins applying an escalating delay. */
    private const LOGIN_DELAY_FREE_ATTEMPTS = 3;

    /** Cap for login escalating delay in seconds. */
    private const LOGIN_DELAY_MAX_SECONDS = 16;

    /**
     * Returns the remaining lockout time in seconds, or 0 if the identifier
     * (e.g. "2fa:<user_uuid>") is not currently locked.
     */
    public static function getLockoutRemaining(string $identifier): int
    {
        try {
            $redis = self::getRedis();
            if ($redis === null) {
                return FileCounterStore::ttl(self::lockKey($identifier));
            }

            try {
                $ttl = $redis->ttl(self::lockKey($identifier));
            } catch (\RedisException $e) {
                return 0;
            }

            return $ttl > 0 ? $ttl : 0;
        } catch (\Throwable $e) {
            return 0;
        }
    }

    /**
     * Escalating delay (seconds) for login throttling based on prior failures.
     * Does not block authentication: callers should sleep then still verify
     * the password so a legitimate owner can succeed during an attack.
     */
    public static function getEscalatingDelaySeconds(string $identifier): int
    {
        $count = self::getFailureCount($identifier);
        if ($count <= self::LOGIN_DELAY_FREE_ATTEMPTS) {
            return 0;
        }

        // 4→1s, 5→2s, 6→4s, 7→8s, 8+→16s
        return min(self::LOGIN_DELAY_MAX_SECONDS, 2 ** ($count - self::LOGIN_DELAY_FREE_ATTEMPTS - 1));
    }

    /**
     * Current failure count for the identifier within the attempt window.
     */
    public static function getFailureCount(string $identifier): int
    {
        try {
            $redis = self::getRedis();
            if ($redis === null) {
                return FileCounterStore::get(self::countKey($identifier));
            }

            $count = $redis->get(self::countKey($identifier));

            return max(0, (int) $count);
        } catch (\Throwable $e) {
            return 0;
        }
    }

    /**
     * Atomically reserve one hard-lock verification attempt (2FA).
     *
     * Increments the failure counter before the caller runs verifyKey so
     * concurrent requests cannot all slip past getLockoutRemaining() and exceed
     * $maxAttempts. Returns false when the account is locked or this reservation
     * would exceed the limit (caller must not verify). Returns true when the
     * caller may proceed; on success call clear(), on failure the counter
     * already reflects this attempt.
     *
     * Fails closed (returns false) when no counter store is usable - do not
     * allow unbounded 2FA verification attempts without a working counter store.
     */
    public static function reserveHardLockAttempt(
        string $identifier,
        ?int $maxAttempts = null,
        ?int $lockoutSeconds = null,
    ): bool {
        try {
            $maxAttempts ??= self::MAX_ATTEMPTS;
            $lockoutSeconds ??= self::LOCKOUT_SECONDS;

            $redis = self::getRedis();
            if ($redis === null) {
                if (!FileCounterStore::available()) {
                    return false;
                }

                return self::reserveHardLockAttemptViaFileStore($identifier, $maxAttempts, $lockoutSeconds);
            }

            $script = <<<'LUA'
if redis.call('EXISTS', KEYS[2]) == 1 then
  return -1
end
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
if count > tonumber(ARGV[2]) then
  redis.call('SETEX', KEYS[2], ARGV[3], '1')
  return -1
end
if count >= tonumber(ARGV[2]) then
  redis.call('SETEX', KEYS[2], ARGV[3], '1')
end
return count
LUA;

            $result = $redis->eval(
                $script,
                [
                    self::countKey($identifier),
                    self::lockKey($identifier),
                    (string) self::ATTEMPT_WINDOW_SECONDS,
                    (string) $maxAttempts,
                    (string) $lockoutSeconds,
                ],
                2
            );

            $allowed = is_numeric($result) && (int) $result > 0;
            if (is_numeric($result) && (int) $result >= ($maxAttempts ?? self::MAX_ATTEMPTS)) {
                self::emitAuthEvent(AuthEvent::onAuthAccountLocked(), [
                    'identifier' => $identifier,
                    'lockout_seconds' => $lockoutSeconds ?? self::LOCKOUT_SECONDS,
                    'attempts' => (int) $result,
                ]);
            } elseif ($result === -1 || $result === '-1') {
                self::emitAuthEvent(AuthEvent::onAuthAccountLocked(), [
                    'identifier' => $identifier,
                    'lockout_seconds' => $lockoutSeconds ?? self::LOCKOUT_SECONDS,
                    'already_locked' => true,
                ]);
            }

            return $allowed;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Record a failed attempt for the identifier.
     *
     * When $hardLock is true (default, used for 2FA), reaching $maxAttempts
     * within the attempt window sets a lock key for $lockoutSeconds.
     * When $hardLock is false (login), only the failure counter is updated so
     * callers can apply escalating delays without denying every client.
     *
     * Prefer reserveHardLockAttempt() for 2FA so the counter is reserved
     * before verification; use this for login soft-throttle and legacy paths.
     */
    public static function recordFailure(
        string $identifier,
        ?int $maxAttempts = null,
        ?int $lockoutSeconds = null,
        bool $hardLock = true,
    ): void {
        try {
            $maxAttempts ??= self::MAX_ATTEMPTS;
            $lockoutSeconds ??= self::LOCKOUT_SECONDS;

            $redis = self::getRedis();
            if ($redis === null) {
                if (!FileCounterStore::available()) {
                    return;
                }

                $count = FileCounterStore::increment(self::countKey($identifier), self::ATTEMPT_WINDOW_SECONDS);
                if ($hardLock && $count >= $maxAttempts) {
                    FileCounterStore::setEx(self::lockKey($identifier), $lockoutSeconds);
                    self::emitAuthEvent(AuthEvent::onAuthAccountLocked(), [
                        'identifier' => $identifier,
                        'lockout_seconds' => $lockoutSeconds,
                        'attempts' => $count,
                    ]);
                }

                return;
            }

            $count = self::incrementFailureCount($redis, $identifier);
            if ($count === null) {
                return;
            }

            if ($hardLock && $count >= $maxAttempts) {
                try {
                    $redis->setex(self::lockKey($identifier), $lockoutSeconds, '1');
                    self::emitAuthEvent(AuthEvent::onAuthAccountLocked(), [
                        'identifier' => $identifier,
                        'lockout_seconds' => $lockoutSeconds,
                        'attempts' => $count,
                    ]);
                } catch (\RedisException $e) {
                    return;
                }
            }
        } catch (\Throwable $e) {
            // Fail open: never let counter errors break authentication.
        }
    }

    /**
     * Clear failure tracking for the identifier (call on successful auth).
     */
    public static function clear(string $identifier): void
    {
        try {
            $redis = self::getRedis();
            if ($redis === null) {
                if (!FileCounterStore::available()) {
                    return;
                }

                $wasLocked = FileCounterStore::exists(self::lockKey($identifier));
                FileCounterStore::delete([self::countKey($identifier), self::lockKey($identifier)]);
                if ($wasLocked) {
                    self::emitAuthEvent(AuthEvent::onAuthAccountUnlocked(), [
                        'identifier' => $identifier,
                    ]);
                }

                return;
            }

            try {
                $wasLocked = (bool) $redis->exists(self::lockKey($identifier));
                $redis->del([self::countKey($identifier), self::lockKey($identifier)]);
                if ($wasLocked) {
                    self::emitAuthEvent(AuthEvent::onAuthAccountUnlocked(), [
                        'identifier' => $identifier,
                    ]);
                }
            } catch (\RedisException $e) {
                return;
            }
        } catch (\Throwable $e) {
            // Fail open.
        }
    }

    public static function isLocked(string $identifier): bool
    {
        try {
            $redis = self::getRedis();
            if ($redis === null) {
                return FileCounterStore::exists(self::lockKey($identifier));
            }

            return (bool) $redis->exists(self::lockKey($identifier));
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * File-backed equivalent of the Redis Lua reservation script: same order of
     * checks (locked first, counter second), same threshold semantics.
     */
    private static function reserveHardLockAttemptViaFileStore(string $identifier, int $maxAttempts, int $lockoutSeconds): bool
    {
        if (FileCounterStore::exists(self::lockKey($identifier))) {
            self::emitAuthEvent(AuthEvent::onAuthAccountLocked(), [
                'identifier' => $identifier,
                'lockout_seconds' => $lockoutSeconds,
                'already_locked' => true,
            ]);

            return false;
        }

        $count = FileCounterStore::increment(self::countKey($identifier), self::ATTEMPT_WINDOW_SECONDS);
        if ($count <= 0) {
            // Store not usable - fail closed like the Redis-less path did before.
            return false;
        }

        if ($count > $maxAttempts) {
            FileCounterStore::setEx(self::lockKey($identifier), $lockoutSeconds);

            return false;
        }

        if ($count >= $maxAttempts) {
            FileCounterStore::setEx(self::lockKey($identifier), $lockoutSeconds);
            self::emitAuthEvent(AuthEvent::onAuthAccountLocked(), [
                'identifier' => $identifier,
                'lockout_seconds' => $lockoutSeconds,
                'attempts' => $count,
            ]);
        }

        return true;
    }

    /**
     * Atomically INCR the failure counter and set ATTEMPT_WINDOW_SECONDS TTL
     * only on the first increment so later failures do not reset the window.
     */
    private static function incrementFailureCount(\Redis $redis, string $identifier): ?int
    {
        try {
            $script = <<<'LUA'
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
LUA;

            $count = $redis->eval($script, [self::countKey($identifier), (string) self::ATTEMPT_WINDOW_SECONDS], 1);

            return is_numeric($count) ? (int) $count : null;
        } catch (\RedisException $e) {
            return null;
        }
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

    private static function emitAuthEvent(string $event, array $payload): void
    {
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit($event, $payload);
        }
    }
}
