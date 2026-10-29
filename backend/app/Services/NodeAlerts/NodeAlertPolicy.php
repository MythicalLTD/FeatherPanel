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

namespace App\Services\NodeAlerts;

use App\App;

/**
 * Node alert settings (thresholds and delivery channels), stored as one JSON setting
 * so new options do not need a migration. The webhook secret never leaves the backend.
 */
class NodeAlertPolicy
{
    public const SETTING_KEY = 'node_alerts_policy';

    private static ?array $cache = null;

    public static function defaults(): array
    {
        return [
            'enabled' => true,
            'node_down_enabled' => true,
            'node_down_after_checks' => 3,
            'disk_enabled' => true,
            'disk_warning_percent' => 90,
            'backup_failed_enabled' => true,
            'cooldown_minutes' => 60,
            'notify_resolved' => true,
            'channel_inbox' => true,
            'channel_email' => false,
            'channel_webhook' => false,
            'webhook_url' => '',
            'webhook_secret' => '',
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
        $bool = static fn (string $k): bool => (bool) ($input[$k] ?? $d[$k]);

        return [
            'enabled' => $bool('enabled'),
            'node_down_enabled' => $bool('node_down_enabled'),
            'node_down_after_checks' => max(1, min(30, (int) ($input['node_down_after_checks'] ?? $d['node_down_after_checks']))),
            'disk_enabled' => $bool('disk_enabled'),
            'disk_warning_percent' => max(50, min(99, (int) ($input['disk_warning_percent'] ?? $d['disk_warning_percent']))),
            'backup_failed_enabled' => $bool('backup_failed_enabled'),
            'cooldown_minutes' => max(5, min(10080, (int) ($input['cooldown_minutes'] ?? $d['cooldown_minutes']))),
            'notify_resolved' => $bool('notify_resolved'),
            'channel_inbox' => $bool('channel_inbox'),
            'channel_email' => $bool('channel_email'),
            'channel_webhook' => $bool('channel_webhook'),
            'webhook_url' => mb_substr(trim((string) ($input['webhook_url'] ?? '')), 0, 500),
            'webhook_secret' => mb_substr((string) ($input['webhook_secret'] ?? ''), 0, 200),
        ];
    }

    /** Settings for the admin UI: the secret is replaced by a flag. */
    public static function forDisplay(): array
    {
        $p = self::get();
        $p['webhook_secret_set'] = $p['webhook_secret'] !== '';
        unset($p['webhook_secret']);

        return $p;
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
