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
 * Parse and match client IPs against allow-lists (single IPs and CIDR ranges).
 */
class IpAddressMatcher
{
    public const MAX_ALLOWED_IPS_LENGTH = 8000;

    public const MAX_ALLOWED_IPS_ENTRIES = 64;

    /**
     * Whether the client IP matches any rule in the normalized allowed list.
     * Empty or null $allowedIpsRaw means no restriction (always allowed).
     */
    public static function clientMatchesAllowedList(string $clientIp, ?string $allowedIpsRaw): bool
    {
        if ($allowedIpsRaw === null || trim($allowedIpsRaw) === '') {
            return true;
        }
        if (!filter_var($clientIp, FILTER_VALIDATE_IP)) {
            return false;
        }
        foreach (self::parseRuleList($allowedIpsRaw) as $rule) {
            if (self::matchesRule($clientIp, $rule)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Split user input into unique non-empty rules (order preserved).
     *
     * @return list<string>
     */
    public static function parseRuleList(string $raw): array
    {
        $parts = preg_split('/[\s,;]+/', $raw, -1, PREG_SPLIT_NO_EMPTY);
        if ($parts === false) {
            return [];
        }
        $out = [];
        foreach ($parts as $p) {
            $p = trim($p);
            if ($p !== '' && !in_array($p, $out, true)) {
                $out[] = $p;
            }
        }

        return $out;
    }

    /**
     * Normalize multi-line / comma-separated input into one rule per line for storage.
     */
    public static function normalizeAllowedIpsInput(?string $raw): string
    {
        if ($raw === null || trim($raw) === '') {
            return '';
        }

        return implode("\n", self::parseRuleList($raw));
    }

    /**
     * @return string|null Error message, or null if valid
     */
    public static function validateAllowedIpsInput(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }
        if (strlen($raw) > self::MAX_ALLOWED_IPS_LENGTH) {
            return 'Allowed IPs list is too long';
        }
        $rules = self::parseRuleList($raw);
        if (count($rules) > self::MAX_ALLOWED_IPS_ENTRIES) {
            return 'Too many allowed IP entries (maximum ' . self::MAX_ALLOWED_IPS_ENTRIES . ')';
        }
        foreach ($rules as $rule) {
            if (!self::isValidIpOrCidr($rule)) {
                return 'Invalid IP address or CIDR: ' . $rule;
            }
        }

        return null;
    }

    public static function matchesRule(string $clientIp, string $rule): bool
    {
        if (str_contains($rule, '/')) {
            return self::ipMatchesCidr($clientIp, $rule);
        }

        $a = @inet_pton($clientIp);
        $b = @inet_pton($rule);

        return $a !== false && $b !== false && $a === $b;
    }

    public static function isValidIpOrCidr(string $ipOrCidr): bool
    {
        if (str_contains($ipOrCidr, '/')) {
            [$ip, $prefixLength] = explode('/', $ipOrCidr, 2);
            if (!is_numeric($prefixLength)) {
                return false;
            }
            $prefixLength = (int) $prefixLength;
            $isIpv4 = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false;
            $isIpv6 = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
            if (!$isIpv4 && !$isIpv6) {
                return false;
            }
            if ($isIpv4) {
                return $prefixLength >= 0 && $prefixLength <= 32;
            }

            return $prefixLength >= 0 && $prefixLength <= 128;
        }

        return filter_var($ipOrCidr, FILTER_VALIDATE_IP) !== false;
    }

    private static function ipMatchesCidr(string $ip, string $cidr): bool
    {
        [$subnet, $maskStr] = explode('/', $cidr, 2);
        $mask = (int) $maskStr;
        $ipIsV4 = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false;
        $subIsV4 = filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false;
        $ipIsV6 = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
        $subIsV6 = filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;

        if ($ipIsV4 && $subIsV4) {
            if ($mask < 0 || $mask > 32) {
                return false;
            }

            $ipBin = inet_pton($ip);
            $subBin = inet_pton($subnet);

            return self::addressInCidrBinary($ipBin, $subBin, $mask);
        }

        if ($ipIsV6 && $subIsV6) {
            if ($mask < 0 || $mask > 128) {
                return false;
            }
            $ipBin = inet_pton($ip);
            $subBin = inet_pton($subnet);

            return self::addressInCidrBinary($ipBin, $subBin, $mask);
        }

        return false;
    }

    private static function addressInCidrBinary(string | false $ipBin, string | false $subBin, int $prefix): bool
    {
        if ($ipBin === false || $subBin === false) {
            return false;
        }
        $len = strlen($ipBin);
        if ($len !== strlen($subBin)) {
            return false;
        }
        $bytes = intdiv($prefix, 8);
        $bits = $prefix % 8;
        if ($bytes > 0) {
            if (substr($ipBin, 0, $bytes) !== substr($subBin, 0, $bytes)) {
                return false;
            }
        }
        if ($bits === 0) {
            return true;
        }
        if ($bytes >= $len) {
            return false;
        }
        $maskByte = ((255 << (8 - $bits)) & 255);

        return (ord($ipBin[$bytes]) & $maskByte) === (ord($subBin[$bytes]) & $maskByte);
    }
}
