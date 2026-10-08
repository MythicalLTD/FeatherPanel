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
 * Short-lived proof that password (or equivalent) authentication succeeded
 * before TOTP verification. Prevents unauthenticated email+code brute-force
 * against TwoFactorController::post().
 *
 * Fails closed if Redis is unavailable (2FA cannot be proven without the challenge store).
 */
class TwoFactorChallengeHelper
{
    private const TTL_SECONDS = 600; // 10 minutes

    /**
     * Issue a challenge token bound to the user UUID after primary auth succeeds.
     *
     * @return string|null Token to return to the client, or null if Redis is down
     */
    public static function issue(string $userUuid): ?string
    {
        try {
            $redis = self::getRedis();
            if ($redis === null) {
                return null;
            }

            $token = bin2hex(random_bytes(32));
            $redis->setex(self::tokenKey($token), self::TTL_SECONDS, $userUuid);

            return $token;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Validate that $token proves primary auth for $userUuid.
     * When Redis is unavailable, returns false (fail closed).
     */
    public static function validate(string $token, string $userUuid): bool
    {
        try {
            $redis = self::getRedis();
            if ($redis === null) {
                return false;
            }

            if ($token === '') {
                return false;
            }

            $stored = $redis->get(self::tokenKey($token));

            return is_string($stored) && hash_equals($stored, $userUuid);
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Invalidate the challenge after successful 2FA (or logout of the step).
     */
    public static function clear(string $token): void
    {
        try {
            $redis = self::getRedis();
            if ($redis === null || $token === '') {
                return;
            }

            $redis->del([self::tokenKey($token)]);
        } catch (\Throwable $e) {
            // Fail open.
        }
    }

    private static function tokenKey(string $token): string
    {
        return '2fa_challenge:' . $token;
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
