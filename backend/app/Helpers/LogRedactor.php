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

    /**
     * Mask secrets inside free-form console logs or file contents before they leave the panel
     * (for example when sent to an AI provider). Never invent credentials; only redact.
     */
    public static function redactText(string $text): string
    {
        if ($text === '') {
            return $text;
        }

        $patterns = [
            // KEY=value / KEY: value style (API keys, passwords, tokens). Authorization headers use Bearer/Basic below.
            '/(?i)\b((?:api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|client[_-]?secret|secret[_-]?key|private[_-]?key|password|passwd|pwd|database_password|db_password|mysql_password|redis_password|aws_secret_access_key)\s*[=:]\s*)([^\s\'\"#,;]+)/',
            // JSON-ish "password":"..."
            '/(?i)("(?:password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|authorization)"\s*:\s*")([^"\\\\]*(?:\\\\.[^"\\\\]*)*)(")/',
            // URI userinfo scheme://user:pass@host
            '#(?i)\b([a-z][a-z0-9+.-]*://[^:/\\s]+:)([^@\\s/]+)(@)#',
            // Bearer / Basic tokens
            '/(?i)\b(Bearer\s+)([A-Za-z0-9\-._~+\/=]{8,})/',
            '/(?i)\b(Basic\s+)([A-Za-z0-9+\/=]{8,})/',
            // Long JWT-looking blobs
            '/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/',
            // sk-/rk-/xox- style opaque keys
            '/\b(?:sk|rk|pk|xox[baprs]|ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{16,}\b/',
        ];

        $replacements = [
            '$1[redacted]',
            '$1[redacted]$3',
            '$1[redacted]$3',
            '$1[redacted]',
            '$1[redacted]',
            '[redacted-jwt]',
            '[redacted-key]',
        ];

        $out = preg_replace($patterns, $replacements, $text);
        return is_string($out) ? $out : $text;
    }

}
