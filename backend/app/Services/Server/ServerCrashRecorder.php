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

use App\App;
use App\Chat\Server;
use App\Services\Wings\Wings;

/**
 * Keeps the console lines from just before a crash, so the server page can show why
 * it went down even after Wings restarted it (or when auto restart is turned off).
 */
class ServerCrashRecorder
{
    public const LOG_LINES = 50;

    private const WINGS_TIMEOUT = 4;

    public static function record(array $server, array $node): void
    {
        $lines = [];
        try {
            $response = Wings::fromNode($node, self::WINGS_TIMEOUT)->getServer()->getServerLogs((string) $server['uuid'], self::LOG_LINES);
            if ($response->isSuccessful()) {
                $data = $response->getData();
                $raw = is_array($data) ? ($data['data'] ?? $data) : $data;
                $lines = self::normalize($raw);
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning('Could not read crash logs for server ' . ($server['uuid'] ?? '?') . ': ' . $e->getMessage());
        }

        Server::updateServerById((int) $server['id'], [
            'last_crash_at' => date('Y-m-d H:i:s'),
            'last_crash_log' => json_encode(array_slice($lines, -self::LOG_LINES), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE),
        ]);
    }

    /** @return string[] */
    public static function decode(?string $stored): array
    {
        $lines = json_decode((string) $stored, true);

        return is_array($lines) ? array_values(array_filter($lines, 'is_string')) : [];
    }

    /** @return string[] */
    private static function normalize(mixed $raw): array
    {
        if (is_string($raw)) {
            $raw = preg_split('/\r?\n/', $raw) ?: [];
        }
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        foreach ($raw as $line) {
            if (!is_string($line)) {
                continue;
            }
            // Strip ANSI colour codes and cap very long lines.
            $line = (string) preg_replace('/\x1b\[[0-9;?]*[ -\/]*[@-~]/', '', $line);
            $out[] = mb_substr(rtrim($line), 0, 1000);
        }

        return $out;
    }
}
