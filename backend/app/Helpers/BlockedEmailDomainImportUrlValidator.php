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

/**
 * Basic SSRF hardening for server-side fetching of plain-text domain lists.
 */
final class BlockedEmailDomainImportUrlValidator
{
    /**
     * @throws \InvalidArgumentException
     */
    public static function assertFetchablePublicUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            throw new \InvalidArgumentException('URL is required');
        }
        if (strlen($url) > 2048) {
            throw new \InvalidArgumentException('URL is too long');
        }
        $parts = parse_url($url);
        if ($parts === false || !isset($parts['scheme'], $parts['host'])) {
            throw new \InvalidArgumentException('Invalid URL');
        }
        $scheme = strtolower((string) $parts['scheme']);
        if (!in_array($scheme, ['http', 'https'], true)) {
            throw new \InvalidArgumentException('Only http and https URLs are allowed');
        }
        $host = strtolower((string) $parts['host']);
        if ($host === '') {
            throw new \InvalidArgumentException('Invalid host');
        }
        if (str_starts_with($host, '[')) {
            $end = strpos($host, ']');
            if ($end !== false) {
                $host = substr($host, 1, $end - 1);
            }
        }

        static::rejectBlockedHost($host);

        return $url;
    }

    private static function rejectBlockedHost(string $host): void
    {
        if (str_ends_with($host, '.local') || str_ends_with($host, '.localhost') || str_ends_with($host, '.internal')) {
            throw new \InvalidArgumentException('This hostname is not allowed');
        }

        $denyExact = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
        foreach ($denyExact as $d) {
            if ($host === strtolower($d)) {
                throw new \InvalidArgumentException('This hostname is not allowed');
            }
        }

        if (preg_match('/^metadata\.google\.internal$/', $host) === 1) {
            throw new \InvalidArgumentException('This hostname is not allowed');
        }

        if (filter_var($host, \FILTER_VALIDATE_IP)) {
            if (filter_var($host, \FILTER_VALIDATE_IP, \FILTER_FLAG_NO_PRIV_RANGE | \FILTER_FLAG_NO_RES_RANGE) === false) {
                throw new \InvalidArgumentException('Private or reserved IPs are not allowed');
            }
        }
    }
}
