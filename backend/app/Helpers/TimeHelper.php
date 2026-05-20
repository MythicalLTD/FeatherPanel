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
 * Helpers for normalising datetime values that are exposed through the API.
 *
 * All datetime columns in the database are stored as UTC (the PDO connection
 * forces `SET time_zone = '+00:00'`). API responses must therefore tag every
 * datetime value with an explicit UTC offset (`Z`) so the frontend can render
 * it in the user's preferred timezone unambiguously.
 *
 * Without this normalisation, MySQL returns naive datetime strings like
 * `2026-05-17 19:00:00` which `new Date(...)` in JavaScript interprets as
 * **local browser time**, causing a wall-clock offset bug equal to the user's
 * timezone offset (the source of the historical "times are 2 hours behind"
 * reports for Europe/Paris users).
 */
class TimeHelper
{
    /**
     * Convert a MySQL-formatted datetime string (assumed UTC) to ISO-8601 with
     * an explicit `Z` suffix so JavaScript parses it as UTC.
     *
     * Accepted inputs include:
     *  - `Y-m-d H:i:s`        (e.g. `2026-05-17 19:00:00`)
     *  - `Y-m-d\TH:i:s`       (e.g. `2026-05-17T19:00:00`)
     *  - Anything else `DateTime` can parse (treated as UTC if no offset).
     *
     * Returns `null` for null/empty input and the original value (unchanged)
     * if it cannot be parsed, so misformatted historical data does not blow
     * up the request.
     */
    public static function toIso8601(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '' || $trimmed === '0000-00-00 00:00:00') {
            return null;
        }

        try {
            $dt = new \DateTimeImmutable($trimmed, new \DateTimeZone('UTC'));
        } catch (\Exception $e) {
            return $trimmed;
        }

        // setTimezone(UTC) is a no-op when input was naive (DateTimeImmutable
        // honours the constructor TZ), but normalises any value that already
        // carried an explicit offset.
        return $dt->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
    }

    /**
     * Normalise the standard `created_at` / `updated_at` (and any caller-supplied
     * additional keys) on an associative row in place, returning the new array.
     *
     * @param array<string, mixed> $row
     * @param string[] $extraKeys additional datetime keys to normalise
     *
     * @return array<string, mixed>
     */
    public static function normaliseRow(array $row, array $extraKeys = []): array
    {
        $keys = array_unique(array_merge(['created_at', 'updated_at'], $extraKeys));
        foreach ($keys as $key) {
            if (array_key_exists($key, $row)) {
                $row[$key] = self::toIso8601($row[$key]);
            }
        }

        return $row;
    }

    /**
     * Apply `normaliseRow` to a list of rows.
     *
     * @param array<int, array<string, mixed>> $rows
     * @param string[] $extraKeys
     *
     * @return array<int, array<string, mixed>>
     */
    public static function normaliseRows(array $rows, array $extraKeys = []): array
    {
        return array_map(static fn (array $row) => self::normaliseRow($row, $extraKeys), $rows);
    }

    /**
     * Check whether a string looks like a valid IANA timezone identifier
     * (e.g. `Europe/Paris`, `America/Los_Angeles`, `UTC`).
     *
     * Uses PHP's built-in zone list rather than a custom regex so we accept
     * exactly the same set of zones that PHP itself can render with.
     */
    public static function isValidTimezone(string $timezone): bool
    {
        $trimmed = trim($timezone);
        if ($trimmed === '') {
            return false;
        }

        try {
            new \DateTimeZone($trimmed);

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
