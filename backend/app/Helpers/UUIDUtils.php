<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
        $timeHex = str_pad(dechex((int) $time), 16, '0', STR_PAD_LEFT);
        $node = bin2hex(random_bytes(6));
        $clockSeq = random_bytes(2);

        // Set variant bits (10xxxxxx in the first byte of clock_seq)
        $clockSeq[0] = chr((ord($clockSeq[0]) & 0x3F) | 0x80);
        $clockSeqHex = bin2hex($clockSeq);

        // Format: time_low-time_mid-time_hi_and_version-clock_seq_hi_and_reserved-clock_seq_low-node
        return sprintf(
            '%08s-%04s-1%03s-%04s-%012s',
            substr($timeHex, 8, 8),  // time_low (last 32 bits)
            substr($timeHex, 4, 4),  // time_mid
            substr($timeHex, 1, 3),  // time_hi
            $clockSeqHex,             // clock_seq (with variant bits)
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
