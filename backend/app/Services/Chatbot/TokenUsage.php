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

class TokenUsage
{
    public static function estimate(string $input = '', string $output = ''): array
    {
        $inputTokens = self::estimateTextTokens($input);
        $outputTokens = self::estimateTextTokens($output);

        return [
            'input_tokens'  => $inputTokens,
            'output_tokens' => $outputTokens,
            'total_tokens'  => $inputTokens + $outputTokens,
            'source'        => 'estimated',
        ];
    }

    public static function estimateTextTokens(string $text): int
    {
        $text = trim($text);
        if ($text === '') {
            return 0;
        }

        // Roughly matches common tokenizer averages without adding a heavy tokenizer dependency.
        return max(1, (int) ceil(mb_strlen($text) / 4));
    }

    public static function fromOpenAiUsage(?array $usage, string $input = '', string $output = ''): array
    {
        if (!$usage) {
            return self::estimate($input, $output);
        }

        $inputTokens = (int) ($usage['prompt_tokens'] ?? $usage['input_tokens'] ?? 0);
        $outputTokens = (int) ($usage['completion_tokens'] ?? $usage['output_tokens'] ?? 0);
        $totalTokens = (int) ($usage['total_tokens'] ?? ($inputTokens + $outputTokens));

        return [
            'input_tokens'  => $inputTokens,
            'output_tokens' => $outputTokens,
            'total_tokens'  => $totalTokens,
            'source'        => 'provider',
            'raw'           => self::compactRaw($usage),
        ];
    }

    public static function fromGeminiUsage(?array $usage, string $input = '', string $output = ''): array
    {
        if (!$usage) {
            return self::estimate($input, $output);
        }

        $inputTokens = (int) ($usage['promptTokenCount'] ?? 0);
        $outputTokens = (int) ($usage['candidatesTokenCount'] ?? 0);
        $totalTokens = (int) ($usage['totalTokenCount'] ?? ($inputTokens + $outputTokens));

        return [
            'input_tokens'  => $inputTokens,
            'output_tokens' => $outputTokens,
            'total_tokens'  => $totalTokens,
            'source'        => 'provider',
            'raw'           => self::compactRaw($usage),
        ];
    }

    public static function aggregate(array $items): array
    {
        $input = 0;
        $output = 0;
        $total = 0;
        $source = 'unknown';
        $raw = [];

        foreach ($items as $usage) {
            if (!is_array($usage)) {
                continue;
            }

            $input += (int) ($usage['input_tokens'] ?? 0);
            $output += (int) ($usage['output_tokens'] ?? 0);
            $total += (int) ($usage['total_tokens'] ?? 0);
            if (($usage['source'] ?? '') === 'provider') {
                $source = 'provider';
            } elseif ($source === 'unknown' && ($usage['source'] ?? '') === 'estimated') {
                $source = 'estimated';
            }
            if (isset($usage['raw'])) {
                $raw[] = $usage['raw'];
            }
        }

        return [
            'input_tokens'  => $input,
            'output_tokens' => $output,
            'total_tokens'  => $total > 0 ? $total : $input + $output,
            'source'        => $source,
            'raw'           => $raw,
        ];
    }

    private static function compactRaw(array $raw): array
    {
        $encoded = json_encode($raw);
        if ($encoded === false || strlen($encoded) <= 2000) {
            return $raw;
        }

        return ['truncated' => true];
    }
}
