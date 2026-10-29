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

namespace App\Services\InactiveCleanup;

use App\App;

/**
 * Inactive server cleanup policy, stored as one JSON setting.
 * Off by default, and the default action only notifies. Suspend, archive and delete
 * run from the cron only after an admin confirmed that destructive action explicitly.
 */
class InactiveCleanupPolicy
{
    public const SETTING_KEY = 'inactive_cleanup_policy';

    public const ACTIONS = ['notify', 'suspend', 'archive', 'delete'];

    public const DESTRUCTIVE = ['suspend', 'archive', 'delete'];

    private static ?array $cache = null;

    public static function defaults(): array
    {
        return [
            'enabled' => false,
            'action' => 'notify',
            'inactive_days' => 90,
            'grace_days' => 14,
            'warn_owner' => true,
            'max_actions_per_run' => 10,
            // The destructive action an admin confirmed (null = none). Changing the action clears it.
            'confirmed_action' => null,
            'confirmed_at' => null,
        ];
    }

    public static function get(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }
        $raw = App::getInstance(true)->getConfig()->getSetting(self::SETTING_KEY, '');
        $decoded = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;

        return self::$cache = self::normalize(is_array($decoded) ? $decoded : []);
    }

    public static function normalize(array $input): array
    {
        $d = self::defaults();
        $action = in_array($input['action'] ?? null, self::ACTIONS, true) ? $input['action'] : $d['action'];
        $confirmed = in_array($input['confirmed_action'] ?? null, self::DESTRUCTIVE, true) ? $input['confirmed_action'] : null;

        return [
            'enabled' => (bool) ($input['enabled'] ?? $d['enabled']),
            'action' => $action,
            'inactive_days' => max(7, min(3650, (int) ($input['inactive_days'] ?? $d['inactive_days']))),
            'grace_days' => max(1, min(90, (int) ($input['grace_days'] ?? $d['grace_days']))),
            'warn_owner' => (bool) ($input['warn_owner'] ?? $d['warn_owner']),
            'max_actions_per_run' => max(1, min(100, (int) ($input['max_actions_per_run'] ?? $d['max_actions_per_run']))),
            'confirmed_action' => $confirmed === $action ? $confirmed : null,
            'confirmed_at' => $confirmed === $action ? ($input['confirmed_at'] ?? null) : null,
        ];
    }

    /** True when the cron may run the configured action (notify always may; the rest need a confirmation). */
    public static function actionArmed(array $policy): bool
    {
        return $policy['action'] === 'notify' || $policy['confirmed_action'] === $policy['action'];
    }

    public static function save(array $policy): bool
    {
        self::$cache = null;

        return App::getInstance(true)->getConfig()->setSetting(self::SETTING_KEY, (string) json_encode(self::normalize($policy)));
    }

    public static function flush(): void
    {
        self::$cache = null;
    }
}
