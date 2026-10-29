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

use App\Chat\Database;
use PragmaRX\Google2FA\Google2FA;

/**
 * Verifies a TOTP code and rejects reuse of a code (or an older one) that was already accepted.
 * The last accepted timestep is claimed atomically per user, so two parallel requests with
 * the same code cannot both pass.
 */
class TotpVerifier
{
    /** @var (callable(int,int):bool)|null test hook: claim timestep for user */
    public static $claimer;

    public static function verify(array $user, string $code): bool
    {
        $secret = (string) ($user['two_fa_key'] ?? '');
        $code = preg_replace('/\D/', '', $code) ?? '';
        if ($secret === '' || $code === '') {
            return false;
        }
        $last = isset($user['two_fa_last_timestep']) && $user['two_fa_last_timestep'] !== null
            ? (int) $user['two_fa_last_timestep'] : null;
        try {
            $ts = (new Google2FA())->verifyKeyNewer($secret, $code, $last ?? 0);
        } catch (\Throwable) {
            return false;
        }
        if ($ts === false || $ts === true) {
            return false;
        }

        return self::claim((int) ($user['id'] ?? 0), (int) $ts);
    }

    private static function claim(int $userId, int $timestep): bool
    {
        if (self::$claimer !== null) {
            return (bool) (self::$claimer)($userId, $timestep);
        }
        if ($userId <= 0) {
            return false;
        }
        try {
            $stmt = Database::getPdoConnection()->prepare(
                'UPDATE featherpanel_users SET two_fa_last_timestep = :ts WHERE id = :id AND (two_fa_last_timestep IS NULL OR two_fa_last_timestep < :ts2)'
            );
            $stmt->execute(['ts' => $timestep, 'id' => $userId, 'ts2' => $timestep]);

            return $stmt->rowCount() === 1;
        } catch (\Throwable $e) {
            // Column missing (migration not run yet): fall back to plain verification.
            return str_contains($e->getMessage(), 'two_fa_last_timestep');
        }
    }
}
