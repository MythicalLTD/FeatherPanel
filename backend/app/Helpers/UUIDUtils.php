<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Helpers;

/**
 * Advanced UUID utility class for generating, validating, and working with UUIDs (v1, v4, etc).
 */
class UUIDUtils
{
    /**
     * Generate a UUID v4 string (random-based).
     */
    public static function generateV4(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0F) | 0x40); // version 4
        $data[8] = chr((ord($data[8]) & 0x3F) | 0x80); // variant 10

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    /**
     * Generate a UUID v1 string (time-based, best effort, not guaranteed to be globally unique).
     */
    public static function generateV1(): string
    {
        $time = microtime(true) * 10000;
        $timeHex = str_pad(dechex($time), 12, '0', STR_PAD_LEFT);
        $node = bin2hex(random_bytes(6));
        $clockSeq = bin2hex(random_bytes(2));

        // Format: time_low-time_mid-time_hi_and_version-clock_seq_hi_and_reserved-clock_seq_low-node
        return sprintf(
            '%08s-%04s-1%03s-%02s%02s-%012s',
            substr($timeHex, 0, 8),
            substr($timeHex, 8, 4),
            substr($timeHex, 12, 3),
            substr($clockSeq, 0, 2),
            substr($clockSeq, 2, 2),
            $node
        );
    }

    /**
     * Validate a UUID string (optionally for a specific version).
     */
    public static function isValid(string $uuid, ?int $version = null): bool
    {
        $uuid = strtolower($uuid);
        $pattern = '/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/';
        if (!preg_match($pattern, $uuid)) {
            return false;
        }
        if ($version !== null) {
            $ver = self::getVersion($uuid);

            return $ver === $version;
        }

        return true;
    }

    /**
     * Get the version of a UUID (1-5) or null if invalid.
     */
    public static function getVersion(string $uuid): ?int
    {
        $uuid = strtolower($uuid);
        if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-([1-5])[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/', $uuid, $matches)) {
            return null;
        }

        return (int) $matches[1];
    }

    /**
     * Format a UUID string to standard form (lowercase, with dashes).
     *
     * @return string|null Returns formatted UUID or null if invalid
     */
    public static function format(string $uuid): ?string
    {
        $uuid = strtolower(str_replace(['{', '}', '(', ')'], '', $uuid));
        $uuid = preg_replace('/[^a-f0-9]/', '', $uuid);
        if (strlen($uuid) !== 32) {
            return null;
        }
        $formatted = sprintf(
            '%s-%s-%s-%s-%s',
            substr($uuid, 0, 8),
            substr($uuid, 8, 4),
            substr($uuid, 12, 4),
            substr($uuid, 16, 4),
            substr($uuid, 20, 12)
        );

        return self::isValid($formatted) ? $formatted : null;
    }
}
