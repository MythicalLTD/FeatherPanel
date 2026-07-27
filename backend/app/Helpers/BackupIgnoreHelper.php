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
 * Normalizes backup ignore/exclude patterns between panel storage and Wings API.
 *
 * Panel stores ignored_files as a JSON array string; Wings expects a newline-separated
 * glob list (same format as .featherpanelignore / gitignore).
 */
class BackupIgnoreHelper
{
    /**
     * Parse ignore input into a list of non-empty glob patterns.
     *
     * @return list<string>
     */
    public static function parsePatterns(mixed $input): array
    {
        if ($input === null || $input === '') {
            return [];
        }

        if (is_array($input)) {
            return self::filterPatterns($input);
        }

        if (!is_string($input)) {
            return [];
        }

        $input = trim($input);
        if ($input === '' || $input === '[]') {
            return [];
        }

        $json = json_decode($input, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($json)) {
            return self::filterPatterns($json);
        }

        $parts = preg_split('/[\r\n,]+/', $input) ?: [];

        return self::filterPatterns($parts);
    }

    /**
     * Normalize ignore input for database storage (JSON array string).
     */
    public static function normalizeForStorage(mixed $input): string
    {
        return json_encode(self::parsePatterns($input));
    }

    /**
     * Format ignore patterns for the Wings backup API.
     */
    public static function formatForWings(mixed $input): string
    {
        return implode("\n", self::parsePatterns($input));
    }

    /**
     * @param array<int, mixed> $patterns
     *
     * @return list<string>
     */
    private static function filterPatterns(array $patterns): array
    {
        return array_values(array_filter(
            array_map(static fn ($pattern) => is_string($pattern) ? trim($pattern) : '', $patterns),
            static fn ($pattern) => $pattern !== ''
        ));
    }
}
