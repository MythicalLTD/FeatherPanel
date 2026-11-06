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

use App\App;
use App\Config\ConfigInterface;
use App\Helpers\LogRedactor;

/**
 * Explains console / crash errors and optionally suggests a file edit.
 * Suggestions are returned to the client for confirmation; this service never writes files.
 */
class AiEditorHelperService
{
    private const MAX_CONSOLE_CHARS = 12000;
    private const MAX_FILE_CHARS = 40000;
    private const MAX_QUESTION_CHARS = 2000;

    private App $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function isEnabled(): bool
    {
        $config = $this->app->getConfig();
        if ($config->getSetting(ConfigInterface::CHATBOT_ENABLED, 'false') !== 'true') {
            return false;
        }

        return $config->getSetting(ConfigInterface::CHATBOT_EDITOR_HELPER_ENABLED, 'true') === 'true';
    }

    /**
     * @param array{
     *   console_log?: string,
     *   file_path?: string,
     *   file_content?: string,
     *   question?: string
     * } $input
     * @param array<string, mixed> $user
     *
     * @return array{
     *   explanation: string,
     *   file_path: ?string,
     *   suggested_content: ?string,
     *   unified_diff: ?string,
     *   model: string,
     *   redacted: bool
     * }
     */
    public function explain(array $input, array $user): array
    {
        if (!$this->isEnabled()) {
            throw new \RuntimeException('The AI editor helper is disabled.', 403);
        }

        $console = $this->truncateTail((string) ($input['console_log'] ?? ''), self::MAX_CONSOLE_CHARS);
        $filePath = trim((string) ($input['file_path'] ?? ''));
        $fileContent = $this->truncateHead((string) ($input['file_content'] ?? ''), self::MAX_FILE_CHARS);
        $question = $this->truncateHead(trim((string) ($input['question'] ?? '')), self::MAX_QUESTION_CHARS);

        if ($console === '' && $fileContent === '' && $question === '') {
            throw new \InvalidArgumentException('Provide console output, file content, or a question.');
        }

        $redactedConsole = LogRedactor::redactText($console);
        $redactedFile = LogRedactor::redactText($fileContent);
        $redactedQuestion = LogRedactor::redactText($question);
        $wasRedacted = $redactedConsole !== $console || $redactedFile !== $fileContent || $redactedQuestion !== $question;

        $system = <<<'PROMPT'
You are FeatherPanel's optional AI helper for game-server console errors and config/code files.
Your job:
1) Explain what went wrong in plain language.
2) When a file is provided and a fix is clear, suggest a full corrected file body.
3) Never invent API keys, passwords, tokens, or database credentials. Keep any [redacted] markers.
4) Never claim you already wrote the file. The panel only shows your suggestion; the user must confirm apply.
5) Prefer minimal, safe fixes. Do not add telemetry, reverse shells, or unrelated refactors.
6) Respond with ONLY a single JSON object (no markdown fences) using this schema:
{"explanation":"string","file_path":"string or null","suggested_content":"full file string or null","unified_diff":"unified diff string or null"}
If you cannot safely suggest a file change, set suggested_content and unified_diff to null.
PROMPT;

        $userParts = [];
        if ($redactedQuestion !== '') {
            $userParts[] = "## User question\n{$redactedQuestion}";
        }
        if ($redactedConsole !== '') {
            $userParts[] = "## Console / crash output\n```\n{$redactedConsole}\n```";
        }
        if ($filePath !== '' || $redactedFile !== '') {
            $label = $filePath !== '' ? $filePath : '(unsaved buffer)';
            $userParts[] = "## File: {$label}\n```\n{$redactedFile}\n```";
        }
        $userParts[] = 'Return the JSON object now.';
        $userMessage = implode("\n\n", $userParts);

        $chatbot = new ChatbotService();
        $result = $chatbot->completeOnce($system, $userMessage, $user, 0.2, 4096);
        $parsed = $this->parseJsonResponse((string) $result['response']);

        $suggested = $parsed['suggested_content'] ?? null;
        if (is_string($suggested) && $suggested === $fileContent) {
            $suggested = null;
        }

        $unified = $parsed['unified_diff'] ?? null;
        if (!is_string($unified) || trim($unified) === '') {
            $unified = null;
        }
        if ($suggested === null) {
            $unified = null;
        } elseif ($unified === null && $fileContent !== '' && is_string($suggested)) {
            $unified = $this->buildUnifiedDiff($filePath !== '' ? $filePath : 'file', $fileContent, $suggested);
        }

        $outPath = $parsed['file_path'] ?? null;
        if (!is_string($outPath) || trim($outPath) === '') {
            $outPath = $filePath !== '' ? $filePath : null;
        }

        return [
            'explanation' => is_string($parsed['explanation'] ?? null) && $parsed['explanation'] !== ''
                ? $parsed['explanation']
                : trim((string) $result['response']),
            'file_path' => $outPath,
            'suggested_content' => is_string($suggested) ? $suggested : null,
            'unified_diff' => $unified,
            'model' => (string) ($result['model'] ?? 'FeatherPanel AI'),
            'redacted' => $wasRedacted,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function parseJsonResponse(string $raw): array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return ['explanation' => 'The AI returned an empty response.'];
        }

        if (preg_match('/```(?:json)?\s*(\{.*?\})\s*```/s', $raw, $m) === 1) {
            $raw = $m[1];
        } elseif ($raw[0] !== '{') {
            $start = strpos($raw, '{');
            $end = strrpos($raw, '}');
            if ($start !== false && $end !== false && $end > $start) {
                $raw = substr($raw, $start, $end - $start + 1);
            }
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return ['explanation' => trim($raw), 'suggested_content' => null, 'unified_diff' => null, 'file_path' => null];
        }

        return $decoded;
    }

    private function buildUnifiedDiff(string $path, string $before, string $after): string
    {
        $a = preg_split("/\r\n|\n|\r/", $before) ?: [];
        $b = preg_split("/\r\n|\n|\r/", $after) ?: [];
        $lines = ["--- a/{$path}", "+++ b/{$path}", '@@'];
        $max = max(count($a), count($b));
        for ($i = 0; $i < $max; ++$i) {
            $left = $a[$i] ?? null;
            $right = $b[$i] ?? null;
            if ($left === $right) {
                $lines[] = ' ' . ($left ?? '');
            } else {
                if ($left !== null) {
                    $lines[] = '-' . $left;
                }
                if ($right !== null) {
                    $lines[] = '+' . $right;
                }
            }
        }

        return implode("\n", $lines);
    }

    private function truncateHead(string $value, int $limit): string
    {
        if (strlen($value) <= $limit) {
            return $value;
        }

        return substr($value, 0, $limit) . "
/* …truncated… */";
    }

    private function truncateTail(string $value, int $limit): string
    {
        if (strlen($value) <= $limit) {
            return $value;
        }

        return "/* …truncated… */
" . substr($value, -$limit);
    }
}
