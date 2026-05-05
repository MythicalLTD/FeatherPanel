<?php

declare(strict_types=1);

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

use App\Cache\Cache;

/**
 * Parses game server console output to extract player join/leave events.
 *
 * Maintains a player list in Redis by processing log lines and matching
 * them against game-type-specific regex patterns for join, leave, and
 * server stop events.
 */
class LogParser
{
    /**
     * Default cache TTL in minutes for player lists.
     */
    private const CACHE_TTL_MINUTES = 5;

    /**
     * Get the regex patterns for detecting player events for a given game type.
     *
     * @param string $gameType The game type identifier (e.g., 'minecraft', 'cs2')
     *
     * @return array Associative array with keys 'join', 'leave', 'stop' containing regex patterns
     */
    public static function getPatterns(string $gameType): array
    {
        $patterns = [
            'minecraft' => [
                'join' => '/\[.*\]: (\w+) joined the game/',
                'leave' => '/\[.*\]: (\w+) left the game/',
                'stop' => '/\[.*\]: Stopping the server/',
            ],
            'minecraftbe' => [
                'join' => '/\[.*\]: (\w+) joined the game/',
                'leave' => '/\[.*\]: (\w+) left the game/',
                'stop' => '/\[.*\]: Stopping the server/',
            ],
            'cs2' => [
                'join' => '/"(.+?)<\d+>".*connected/',
                'leave' => '/"(.+?)<\d+>".*disconnected/',
                'stop' => '/Log file closed/',
            ],
            'garrysmod' => [
                'join' => '/"(.+?)<\d+>".*connected/',
                'leave' => '/"(.+?)<\d+>".*disconnected/',
                'stop' => '/Log file closed/',
            ],
            'tf2' => [
                'join' => '/"(.+?)<\d+>".*connected/',
                'leave' => '/"(.+?)<\d+>".*disconnected/',
                'stop' => '/Log file closed/',
            ],
            'rust' => [
                'join' => '/"(.+?)<\d+>".*connected/',
                'leave' => '/"(.+?)<\d+>".*disconnected/',
                'stop' => '/Log file closed/',
            ],
            'arkse' => [
                'join' => '/"(.+?)<\d+>".*connected/',
                'leave' => '/"(.+?)<\d+>".*disconnected/',
                'stop' => '/Log file closed/',
            ],
            'fivem' => [
                'join' => '/"(.+?)<\d+>".*connected/',
                'leave' => '/"(.+?)<\d+>".*disconnected/',
                'stop' => '/Log file closed/',
            ],
        ];

        return $patterns[$gameType] ?? [
            'join' => '/"(.+?)<\d+>".*connected/',
            'leave' => '/"(.+?)<\d+>".*disconnected/',
            'stop' => '/Log file closed/',
        ];
    }

    /**
     * Parse a single log line to detect a player event.
     *
     * @param string $line The log line to parse
     * @param string $gameType The game type identifier
     *
     * @return array|null Returns ['event' => 'join'|'leave'|'stop', 'player' => '...'] or null if no match
     */
    public static function parseLogLine(string $line, string $gameType): ?array
    {
        $patterns = self::getPatterns($gameType);

        // Check for stop event first (no player name needed)
        if (isset($patterns['stop']) && preg_match($patterns['stop'], $line)) {
            return ['event' => 'stop', 'player' => ''];
        }

        // Check for join event
        if (isset($patterns['join']) && preg_match($patterns['join'], $line, $matches)) {
            $player = $matches[1] ?? '';
            if ($player !== '') {
                return ['event' => 'join', 'player' => $player];
            }
        }

        // Check for leave event
        if (isset($patterns['leave']) && preg_match($patterns['leave'], $line, $matches)) {
            $player = $matches[1] ?? '';
            if ($player !== '') {
                return ['event' => 'leave', 'player' => $player];
            }
        }

        return null;
    }

    /**
     * Process a log line and update the player list in Redis.
     *
     * On join: adds the player to the list (no duplicates).
     * On leave: removes the player from the list.
     * On stop: clears the entire player list.
     *
     * @param string $serverUuid The server UUID used as the cache key identifier
     * @param string $line The log line to process
     * @param string $gameType The game type identifier
     */
    public static function processLogLine(string $serverUuid, string $line, string $gameType): void
    {
        $parsed = self::parseLogLine($line, $gameType);

        if ($parsed === null) {
            return;
        }

        switch ($parsed['event']) {
            case 'join':
                $players = self::getPlayerList($serverUuid);
                if (!\in_array($parsed['player'], $players, true)) {
                    $players[] = $parsed['player'];
                }
                Cache::put("player_list:{$serverUuid}", $players, self::CACHE_TTL_MINUTES);
                break;

            case 'leave':
                $players = self::getPlayerList($serverUuid);
                $players = array_values(array_filter($players, function (string $name) use ($parsed): bool {
                    return $name !== $parsed['player'];
                }));
                Cache::put("player_list:{$serverUuid}", $players, self::CACHE_TTL_MINUTES);
                break;

            case 'stop':
                self::clearPlayerList($serverUuid);
                break;
        }
    }

    /**
     * Get the current player list for a server from Redis cache.
     *
     * @param string $serverUuid The server UUID
     *
     * @return array List of player names currently online
     */
    public static function getPlayerList(string $serverUuid): array
    {
        $players = Cache::get("player_list:{$serverUuid}");

        if ($players === null || !\is_array($players)) {
            return [];
        }

        return $players;
    }

    /**
     * Clear the player list for a server (e.g., on server stop/restart).
     *
     * @param string $serverUuid The server UUID
     */
    public static function clearPlayerList(string $serverUuid): void
    {
        Cache::forget("player_list:{$serverUuid}");
    }
}
