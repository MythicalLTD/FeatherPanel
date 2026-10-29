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
 * Masks secrets (passwords, tokens, keys) before data is written to the panel log.
 */
class LogRedactor
{
    private const PATTERN = '/pass(word)?|secret|token|api[_-]?key|private[_-]?key|credential|authorization/i';

    /**
     * @param array<mixed> $data
     *
     * @return array<mixed>
     */
    public static function redact(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($key) && preg_match(self::PATTERN, $key) === 1) {
                $data[$key] = ($value === null || $value === '') ? $value : '[redacted]';
            } elseif (is_array($value)) {
                $data[$key] = self::redact($value);
            }
        }

        return $data;
    }

    /**
     * JSON for a log line, with secrets masked.
     *
     * @param array<mixed> $data
     */
    public static function json(array $data): string
    {
        return (string) json_encode(self::redact($data), JSON_UNESCAPED_SLASHES);
    }
}
