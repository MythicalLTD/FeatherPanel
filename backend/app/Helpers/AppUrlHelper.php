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
use App\Config\ConfigInterface;

/**
 * Builds public panel URLs from APP_URL instead of the inbound request host.
 *
 * Required for Wings/daemon clients behind reverse proxies where PHP may see localhost.
 */
class AppUrlHelper
{
    public static function baseUrl(): string
    {
        $appUrl = App::getInstance(true)->getConfig()->getSetting(
            ConfigInterface::APP_URL,
            'https://featherpanel.mythical.systems'
        );

        return rtrim((string) $appUrl, '/');
    }

    /**
     * Base URL Wings should call for panel APIs (SFTP auth, remote config, etc.).
     * Prefer WINGS_REMOTE_URL when set so daemon traffic can bypass Cloudflare browser challenges.
     */
    public static function wingsRemoteUrl(): string
    {
        $configured = trim((string) (App::getInstance(true)->getConfig()->getSetting(
            ConfigInterface::WINGS_REMOTE_URL,
            ''
        ) ?? ''));

        if ($configured !== '') {
            return rtrim($configured, '/');
        }

        return self::baseUrl();
    }

    public static function apiUrl(string $path): string
    {
        $path = '/' . ltrim($path, '/');
        if (!str_starts_with($path, '/api/')) {
            $path = '/api' . $path;
        }

        return self::baseUrl() . $path;
    }
}
