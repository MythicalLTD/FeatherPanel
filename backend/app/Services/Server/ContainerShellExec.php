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

namespace App\Services\Server;

/**
 * Pure (database/network free) rules shared by every feature that runs a command inside a
 * server container through the daemon's exec endpoint (`sh -c <command>`): lifecycle hook
 * Container Shell steps and schedule Container Shell tasks.
 */
final class ContainerShellExec
{
    public const COMMAND_MAX_LENGTH = 4096;
    public const TIMEOUT_DEFAULT = 30;
    public const TIMEOUT_MIN = 1;
    public const TIMEOUT_MAX = 120;

    /** Max characters of stdout / stderr kept per stream for logs and results. */
    public const MAX_OUTPUT_CHARS = 2000;

    /** Max characters of output appended to an error message. */
    public const MAX_ERROR_DETAIL_CHARS = 500;

    /**
     * Clamp a timeout to the allowed range; missing / invalid values fall back to the default.
     */
    public static function normalizeTimeout(mixed $raw): int
    {
        if ($raw === null || is_bool($raw) || is_array($raw) || is_object($raw)) {
            return self::TIMEOUT_DEFAULT;
        }

        $timeout = (int) $raw;
        if ($timeout < self::TIMEOUT_MIN) {
            return self::TIMEOUT_DEFAULT;
        }

        return min($timeout, self::TIMEOUT_MAX);
    }

    public static function truncateOutput(string $output): string
    {
        $output = trim($output);
        if (mb_strlen($output) <= self::MAX_OUTPUT_CHARS) {
            return $output;
        }

        return mb_substr($output, 0, self::MAX_OUTPUT_CHARS) . '… [truncated]';
    }

    /**
     * Normalize the daemon's exec response into a bounded summary.
     *
     * `error` is null on success (exit code 0, no timeout) and otherwise a human readable reason.
     *
     * @param array<string, mixed> $data daemon response
     *
     * @return array{exit_code: int, timed_out: bool, duration_ms: int, stdout: string, stderr: string, error: string|null}
     */
    public static function summarize(array $data, int $timeout): array
    {
        $stdout = self::truncateOutput((string) ($data['stdout'] ?? ''));
        $stderr = self::truncateOutput((string) ($data['stderr'] ?? ''));
        $exitCode = (int) ($data['exit_code'] ?? -1);
        $timedOut = !empty($data['timed_out']);

        $error = null;
        if ($timedOut) {
            $error = 'Container shell command timed out after ' . $timeout . ' seconds';
        } elseif ($exitCode !== 0) {
            $detail = $stderr !== '' ? $stderr : $stdout;
            $error = 'Container shell command exited with code ' . $exitCode;
            if ($detail !== '') {
                $error .= ': ' . mb_substr($detail, 0, self::MAX_ERROR_DETAIL_CHARS);
            }
        }

        return [
            'exit_code' => $exitCode,
            'timed_out' => $timedOut,
            'duration_ms' => max(0, (int) ($data['duration_ms'] ?? 0)),
            'stdout' => $stdout,
            'stderr' => $stderr,
            'error' => $error,
        ];
    }
}
