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
 * Orchestrates game server player status queries, caching, and fallback logic.
 *
 * Coordinates between GameServerQuery, GameTypeResolver, LogParser, and the
 * Redis cache layer to provide player status data for game servers.
 */
class PlayerStatusService
{
    /**
     * Default polling interval in seconds.
     */
    private const DEFAULT_POLLING_INTERVAL = 30;

    /**
     * Minimum allowed polling interval in seconds.
     */
    private const MIN_POLLING_INTERVAL = 10;

    /**
     * Maximum allowed polling interval in seconds.
     */
    private const MAX_POLLING_INTERVAL = 300;

    /**
     * Query a game server for player status and cache the result.
     *
     * Resolves the game type, queries the server via GameServerQuery,
     * falls back to LogParser for player names if GameQ returns empty names,
     * and caches the result in Redis.
     *
     * @param array $server Server array with keys: uuid_short, uuid, name, status, ip, port, spell, realm
     *
     * @return array|null Player status data or null if the server is unsupported
     */
    public static function queryServer(array $server): ?array
    {
        $uuidShort = $server['uuid_short'] ?? '';
        $serverUuid = $server['uuid'] ?? '';
        $serverName = $server['name'] ?? '';
        $status = $server['status'] ?? '';
        $ip = $server['ip'] ?? '';
        $port = (int) ($server['port'] ?? 0);

        // When server is not running, return zero players
        if ($status !== 'running') {
            $data = [
                'player_count' => 0,
                'max_players' => 0,
                'players' => [],
                'game_type' => GameTypeResolver::resolve($server),
                'last_updated' => gmdate('Y-m-d\TH:i:s\Z'),
                'is_stale' => false,
                'server_name' => $serverName,
                'address' => $ip . ':' . $port,
            ];

            $pollingInterval = self::getEffectivePollingInterval(null);
            $cacheKey = self::buildCacheKey($uuidShort);
            $cacheTtl = self::getCacheTtl($pollingInterval);
            Cache::put($cacheKey, $data, $cacheTtl);

            return $data;
        }

        // Resolve game type
        $gameType = GameTypeResolver::resolve($server);

        if ($gameType === null) {
            // Server game type is unsupported
            return null;
        }

        // Query the game server
        $queryResult = null;

        try {
            $queryResult = GameServerQuery::query($gameType, $ip, $port);
        } catch (\Throwable) {
            // Query failed, will fall back to cached data below
        }

        // On query failure, return last cached data with is_stale = true
        if ($queryResult === null) {
            $cacheKey = self::buildCacheKey($uuidShort);
            $cached = Cache::get($cacheKey);

            if ($cached !== null && \is_array($cached)) {
                $cached['is_stale'] = true;

                return $cached;
            }

            // No cached data available either
            return null;
        }

        // Build player list — fall back to LogParser if GameQ returns empty names
        $players = $queryResult['players'] ?? [];

        if (empty($players) && ($queryResult['player_count'] ?? 0) > 0) {
            $players = LogParser::getPlayerList($serverUuid);
        }

        // Build the response
        $data = [
            'player_count' => $queryResult['player_count'] ?? 0,
            'max_players' => $queryResult['max_players'] ?? 0,
            'players' => $players,
            'game_type' => $gameType,
            'last_updated' => gmdate('Y-m-d\TH:i:s\Z'),
            'is_stale' => false,
            'server_name' => $serverName,
            'address' => $ip . ':' . $port,
        ];

        // Cache the result
        $pollingInterval = self::getEffectivePollingInterval(null);
        $cacheKey = self::buildCacheKey($uuidShort);
        $cacheTtl = self::getCacheTtl($pollingInterval);
        Cache::put($cacheKey, $data, $cacheTtl);

        return $data;
    }

    /**
     * Get the player status for a server from cache, or trigger a fresh query on cache miss.
     *
     * @param string $uuidShort The server's short UUID
     *
     * @return array|null Cached player status data or null if unavailable
     */
    public static function getPlayerStatus(string $uuidShort): ?array
    {
        $cacheKey = self::buildCacheKey($uuidShort);
        $cached = Cache::get($cacheKey);

        if ($cached !== null && \is_array($cached)) {
            return $cached;
        }

        // Cache miss — cannot trigger a fresh query without server data
        return null;
    }

    /**
     * Get the effective polling interval, clamped to [10, 300] seconds.
     *
     * @param int|null $configured The configured polling interval in seconds, or null for default
     *
     * @return int Effective polling interval in seconds
     */
    public static function getEffectivePollingInterval(?int $configured): int
    {
        if ($configured === null) {
            return self::DEFAULT_POLLING_INTERVAL;
        }

        return max(self::MIN_POLLING_INTERVAL, min(self::MAX_POLLING_INTERVAL, $configured));
    }

    /**
     * Build the Redis cache key for a server's player status.
     *
     * @param string $uuidShort The server's short UUID
     *
     * @return string Cache key in the format `player_status:{uuidShort}`
     */
    public static function buildCacheKey(string $uuidShort): string
    {
        return "player_status:{$uuidShort}";
    }

    /**
     * Get the cache TTL in minutes for Cache::put().
     *
     * The TTL is 2 × the polling interval, converted from seconds to minutes.
     *
     * @param int $pollingInterval The effective polling interval in seconds
     *
     * @return int Cache TTL in minutes
     */
    public static function getCacheTtl(int $pollingInterval): int
    {
        $ttlMinutes = (int) ((2 * $pollingInterval) / 60);

        // Ensure at least 1 minute TTL
        return max(1, $ttlMinutes);
    }
}
