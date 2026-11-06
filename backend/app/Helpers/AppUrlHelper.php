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
 * The seeded demo host (featherpanel.mythical.systems) is treated as "unset" so installs
 * that never changed APP_URL still get links on the request host (phpMyAdmin, OAuth, etc.).
 */
class AppUrlHelper
{
    public const PLACEHOLDER_HOST = 'featherpanel.mythical.systems';

    /**
     * True when APP_URL is empty or still the demo/placeholder value from PublicConfig.
     */
    public static function isUnsetOrPlaceholder(?string $url): bool
    {
        $url = trim((string) $url);
        if ($url === '') {
            return true;
        }

        $normalized = preg_match('#^https?://#i', $url) ? $url : 'https://' . ltrim($url, '/');
        $host = parse_url($normalized, PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            return true;
        }

        return strcasecmp($host, self::PLACEHOLDER_HOST) === 0;
    }

    public static function baseUrl(): string
    {
        $configured = trim((string) (App::getInstance(true)->getConfig()->getSetting(
            ConfigInterface::APP_URL,
            ''
        ) ?? ''));

        if (!self::isUnsetOrPlaceholder($configured)) {
            if (!preg_match('#^https?://#i', $configured)) {
                $configured = 'https://' . ltrim($configured, '/');
            }

            return rtrim($configured, '/');
        }

        // Prefer the inbound request host over the demo placeholder so browser-facing
        // links (phpMyAdmin, OAuth returns, attachments) never bounce users to
        // featherpanel.mythical.systems when APP_URL is still the seeded default.
        try {
            $fromRequest = rtrim(App::getInstance(true)->getBaseUrl(), '/');
        } catch (\Throwable $e) {
            $fromRequest = '';
        }

        if ($fromRequest !== '' && !self::isUnsetOrPlaceholder($fromRequest)) {
            return $fromRequest;
        }

        return 'https://' . self::PLACEHOLDER_HOST;
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
