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

use App\Chat\UserDevice;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;

class UserDeviceTracker
{
    public const CLIENT_COOKIE_NAME = '_fp_ui_sid';

    public const CLIENT_HEADER_SYNC = 'X-FP-UI-Sync';

    public const CLIENT_HEADER_META = 'X-FP-UI-Meta';

    public static function trackFromRequest(Request $request, array $user): void
    {
        $clientToken = self::extractClientToken($request);
        if ($clientToken === null) {
            return;
        }

        UserDevice::trackVisit(
            $user['uuid'],
            $clientToken,
            self::extractSignals($request),
            CloudFlareRealIP::getRealIP(),
            $request->headers->get('User-Agent'),
        );
    }

    public static function extractClientToken(Request $request): ?string
    {
        $header = trim((string) $request->headers->get(self::CLIENT_HEADER_SYNC, ''));
        if ($header !== '' && preg_match('/^[a-f0-9\-]{16,64}$/i', $header)) {
            return $header;
        }

        $cookie = trim((string) ($request->cookies->get(self::CLIENT_COOKIE_NAME) ?? ''));
        if ($cookie !== '' && preg_match('/^[a-f0-9\-]{16,64}$/i', $cookie)) {
            return $cookie;
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function extractSignals(Request $request): ?array
    {
        $metaHeader = trim((string) $request->headers->get(self::CLIENT_HEADER_META, ''));
        if ($metaHeader === '') {
            return null;
        }

        $decoded = base64_decode(strtr($metaHeader, '-_', '+/'), true);
        if ($decoded === false) {
            return null;
        }

        $signals = json_decode($decoded, true);
        if (!is_array($signals) || empty($signals)) {
            return null;
        }

        $allowed = ['tz', 'lang', 'sw', 'sh', 'cd', 'dm', 'hc'];
        $filtered = [];
        foreach ($allowed as $key) {
            if (!array_key_exists($key, $signals)) {
                continue;
            }
            $value = $signals[$key];
            if (is_string($value) || is_int($value) || is_float($value) || is_bool($value)) {
                $filtered[$key] = $value;
            }
        }

        return empty($filtered) ? null : $filtered;
    }

    public static function trackFromGlobals(array $user): void
    {
        $clientToken = null;
        $header = trim((string) ($_SERVER['HTTP_X_FP_UI_SYNC'] ?? ''));
        if ($header !== '' && preg_match('/^[a-f0-9\-]{16,64}$/i', $header)) {
            $clientToken = $header;
        } else {
            $cookie = trim((string) ($_COOKIE[self::CLIENT_COOKIE_NAME] ?? ''));
            if ($cookie !== '' && preg_match('/^[a-f0-9\-]{16,64}$/i', $cookie)) {
                $clientToken = $cookie;
            }
        }

        if ($clientToken === null) {
            return;
        }

        $signals = null;
        $metaHeader = trim((string) ($_SERVER['HTTP_X_FP_UI_META'] ?? ''));
        if ($metaHeader !== '') {
            $decoded = base64_decode(strtr($metaHeader, '-_', '+/'), true);
            if ($decoded !== false) {
                $parsed = json_decode($decoded, true);
                if (is_array($parsed) && !empty($parsed)) {
                    $signals = $parsed;
                }
            }
        }

        UserDevice::trackVisit(
            $user['uuid'],
            $clientToken,
            is_array($signals) ? $signals : null,
            CloudFlareRealIP::getRealIP(),
            $_SERVER['HTTP_USER_AGENT'] ?? null,
        );
    }
}
