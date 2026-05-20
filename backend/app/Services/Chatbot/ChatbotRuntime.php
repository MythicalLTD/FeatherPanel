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

namespace App\Services\Chatbot;

class ChatbotRuntime
{
    public static function emit(?callable $emit, string $type, array $payload = []): void
    {
        if ($emit === null) {
            return;
        }

        $emit($type, $payload);
    }

    public static function toolActivity(array $toolCall, array $toolResult, int $iteration): array
    {
        return [
            'tool'      => $toolCall['tool'] ?? 'unknown',
            'params'    => self::sanitizeValue($toolCall['params'] ?? []),
            'success'   => (bool) ($toolResult['success'] ?? false),
            'error'     => $toolResult['error'] ?? null,
            'summary'   => self::summarizeResult($toolResult),
            'iteration' => $iteration,
        ];
    }

    public static function summarizeResult(array $toolResult): string
    {
        if (!($toolResult['success'] ?? false)) {
            return (string) ($toolResult['error'] ?? 'Tool failed.');
        }

        $data = $toolResult['data'] ?? null;
        if (is_array($data)) {
            if (isset($data['message'])) {
                return self::truncate((string) $data['message'], 240);
            }

            if (isset($data['success'])) {
                return ((bool) $data['success']) ? 'Tool completed successfully.' : 'Tool returned an unsuccessful result.';
            }

            return self::truncate(json_encode(self::sanitizeValue($data), JSON_UNESCAPED_SLASHES) ?: 'Tool completed.', 240);
        }

        return self::truncate((string) $data, 240);
    }

    public static function sanitizeValue(mixed $value): mixed
    {
        if (is_array($value)) {
            $sanitized = [];
            foreach ($value as $key => $item) {
                $keyString = (string) $key;
                if (preg_match('/password|token|secret|key|credential/i', $keyString)) {
                    $sanitized[$key] = '[redacted]';
                    continue;
                }

                $sanitized[$key] = self::sanitizeValue($item);
            }

            return $sanitized;
        }

        if (is_string($value)) {
            return self::truncate($value, 500);
        }

        return $value;
    }

    public static function truncate(string $value, int $limit): string
    {
        if (strlen($value) <= $limit) {
            return $value;
        }

        return rtrim(substr($value, 0, $limit - 3)) . '...';
    }
}
