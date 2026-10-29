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
 * Strict validation for WAF deny lists. Values end up inside generated
 * reverse proxy configs, so only plain IP/CIDR and safe URL paths pass.
 */
class WebSpaceWafRules
{
    public const PATH_PATTERN = '#^/[A-Za-z0-9._~\-/%*+@=]{0,255}$#';

    public static function isValidIp(string $value): bool
    {
        if ($value === '' || strlen($value) > 64 || preg_match('/[^0-9A-Fa-f:.\/]/', $value)) {
            return false;
        }
        $parts = explode('/', $value);
        if (count($parts) > 2) {
            return false;
        }
        $ip = $parts[0];
        $isV4 = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false;
        $isV6 = !$isV4 && filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
        if (!$isV4 && !$isV6) {
            return false;
        }
        if (count($parts) === 2) {
            if (!preg_match('/^\d{1,3}$/', $parts[1])) {
                return false;
            }
            $prefix = (int) $parts[1];

            return $prefix >= 0 && $prefix <= ($isV4 ? 32 : 128);
        }

        return true;
    }

    public static function isValidPath(string $value): bool
    {
        return preg_match(self::PATH_PATTERN, $value) === 1
            && !str_contains($value, '..')
            && !str_starts_with(strtolower($value), '/.well-known');
    }

    /**
     * @return list<string>
     */
    public static function toList(mixed $raw): array
    {
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $raw = $decoded;
            } else {
                $parts = preg_split('/[\s,]+/', $raw);
                $raw = $parts === false ? [] : $parts;
            }
        }
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        foreach ($raw as $item) {
            if (!is_scalar($item)) {
                continue;
            }
            $value = trim((string) $item);
            if ($value !== '') {
                $out[] = $value;
            }
        }

        return $out;
    }

    /**
     * Returns the first invalid entry, or null when every entry is valid.
     */
    public static function firstInvalidIp(mixed $raw): ?string
    {
        if (!is_array($raw) && !is_string($raw) && $raw !== null) {
            return '(invalid list)';
        }
        foreach (self::toList($raw) as $value) {
            if (!self::isValidIp($value)) {
                return $value;
            }
        }

        return null;
    }

    public static function firstInvalidPath(mixed $raw): ?string
    {
        if (!is_array($raw) && !is_string($raw) && $raw !== null) {
            return '(invalid list)';
        }
        foreach (self::toList($raw) as $value) {
            $path = str_starts_with($value, '/') ? $value : '/' . $value;
            if (!self::isValidPath($path)) {
                return $value;
            }
        }

        return null;
    }
}
