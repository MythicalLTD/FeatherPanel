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

use App\Chat\BlockedIp;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks new panel account registration from admin-banned IPs.
 */
class PanelIpBlockGuard
{
    public const ERROR_CODE = 'IP_BANNED';

    /**
     * @return array{id: int|string, ip: string, reason: ?string, expires_at: ?string}|null
     */
    public static function findBlock(?string $ip = null): ?array
    {
        $ip = trim((string) ($ip ?? CloudFlareRealIP::getRealIP()));
        if ($ip === '') {
            return null;
        }

        $row = BlockedIp::findActiveMatch($ip);
        if ($row === null) {
            return null;
        }

        return [
            'id' => $row['id'],
            'ip' => (string) $row['ip'],
            'reason' => isset($row['reason']) && $row['reason'] !== '' ? (string) $row['reason'] : null,
            'expires_at' => isset($row['expires_at']) && $row['expires_at'] !== '' ? (string) $row['expires_at'] : null,
        ];
    }

    public static function isBlocked(?string $ip = null): bool
    {
        return self::findBlock($ip) !== null;
    }

    /**
     * Return a 403 response when the IP is banned; otherwise null.
     */
    public static function assertRegistrationAllowed(?string $ip = null): ?Response
    {
        $block = self::findBlock($ip);
        if ($block === null) {
            return null;
        }

        $message = 'Registration is not allowed from this IP address';
        if ($block['reason'] !== null) {
            $message .= ': ' . $block['reason'];
        }

        return ApiResponse::error($message, self::ERROR_CODE, 403, [
            'blocked_ip' => $block['ip'],
            'expires_at' => $block['expires_at'],
            'reason' => $block['reason'],
        ]);
    }
}
