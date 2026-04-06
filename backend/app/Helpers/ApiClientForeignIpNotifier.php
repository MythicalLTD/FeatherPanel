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
use App\Cache\Cache;
use App\Config\ConfigInterface;
use App\Mail\templates\ApiClientIpBlocked;

/**
 * Notify API key owners when a blocked request used a non-allowed IP (optional per key).
 */
class ApiClientForeignIpNotifier
{
    private const CACHE_KEY_PREFIX = 'api_client_foreign_ip_notify:';

    private const THROTTLE_MINUTES = 30;

    public static function notifyIfEnabled(array $apiClient, array $user, string $seenIp): void
    {
        if (($apiClient['notify_foreign_ip'] ?? 'false') !== 'true') {
            return;
        }

        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::SMTP_ENABLED, 'false') !== 'true') {
            return;
        }

        $clientId = (int) ($apiClient['id'] ?? 0);
        if ($clientId <= 0) {
            return;
        }

        $cacheKey = self::CACHE_KEY_PREFIX . $clientId;
        if (Cache::get($cacheKey) !== null) {
            return;
        }

        Cache::put($cacheKey, '1', self::THROTTLE_MINUTES);

        $appUrl = $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems');
        if (!preg_match('#^https?://#i', $appUrl)) {
            $appUrl = 'https://' . ltrim($appUrl, '/');
        }

        ApiClientIpBlocked::send([
            'email' => $user['email'],
            'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
            'app_url' => $appUrl,
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'username' => $user['username'],
            'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
            'uuid' => $user['uuid'],
            'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
            'api_client_name' => (string) ($apiClient['name'] ?? ''),
            'api_client_id' => (string) $clientId,
            'blocked_ip' => $seenIp,
        ]);
    }
}
