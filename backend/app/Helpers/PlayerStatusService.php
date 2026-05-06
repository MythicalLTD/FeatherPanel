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
use App\Chat\Database;

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
     * @param array $server Server array with keys: uuid_short, uuid, name, status, ip, port, spell, realm, node_fqdn, node_public_ip
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

        // Resolve the actual query IP — if allocation IP is 0.0.0.0, use node public IP or FQDN
        $queryIp = self::resolveQueryIp($ip, $server);
        $displayAddress = $queryIp . ':' . $port;

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
                'address' => $displayAddress,
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

        // Query the game server using the resolved IP
        $queryResult = null;

        try {
            $queryResult = GameServerQuery::query($gameType, $queryIp, $port);
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

            // No cached data — return a basic response so the widget knows the game type
            $data = [
                'player_count' => 0,
                'max_players' => 0,
                'players' => [],
                'game_type' => $gameType,
                'last_updated' => gmdate('Y-m-d\TH:i:s\Z'),
                'is_stale' => true,
                'server_name' => $serverName,
                'address' => $displayAddress,
            ];

            $pollingInterval = self::getEffectivePollingInterval(null);
            $cacheKey = self::buildCacheKey($uuidShort);
            $cacheTtl = self::getCacheTtl($pollingInterval);
            Cache::put($cacheKey, $data, $cacheTtl);

            return $data;
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
            'server_name' => !empty($queryResult['name']) ? $queryResult['name'] : $serverName,
            'address' => $displayAddress,
            'version' => $queryResult['version'] ?? null,
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

        // Cache miss — fetch server data from DB and trigger a fresh query
        $server = self::fetchServerData($uuidShort);

        if ($server === null) {
            return null;
        }

        return self::queryServer($server);
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

    /**
     * Fetch server data from the database by uuidShort.
     *
     * @param string $uuidShort The server's short UUID
     *
     * @return array|null Server data array or null if not found
     */
    private static function fetchServerData(string $uuidShort): ?array
    {
        try {
            $pdo = Database::getPdoConnection();
            $row = null;

            // Try the full query first (with all optional columns)
            $queries = [
                // Full query with gamedig_type and public_ip_v4
                'SELECT
                    s.uuidShort AS uuid_short,
                    s.uuid,
                    s.name,
                    s.status,
                    a.ip,
                    a.port,
                    sp.name AS spell_name,
                    sp.gamedig_type,
                    r.name AS realm_name,
                    n.fqdn AS node_fqdn,
                    n.public_ip_v4 AS node_public_ip
                FROM featherpanel_servers s
                INNER JOIN featherpanel_allocations a ON a.id = s.allocation_id
                INNER JOIN featherpanel_spells sp ON sp.id = s.spell_id
                INNER JOIN featherpanel_realms r ON r.id = s.realms_id
                INNER JOIN featherpanel_nodes n ON n.id = s.node_id
                WHERE s.uuidShort = :uuidShort
                LIMIT 1',
                // Without public_ip_v4
                'SELECT
                    s.uuidShort AS uuid_short,
                    s.uuid,
                    s.name,
                    s.status,
                    a.ip,
                    a.port,
                    sp.name AS spell_name,
                    sp.gamedig_type,
                    r.name AS realm_name,
                    n.fqdn AS node_fqdn
                FROM featherpanel_servers s
                INNER JOIN featherpanel_allocations a ON a.id = s.allocation_id
                INNER JOIN featherpanel_spells sp ON sp.id = s.spell_id
                INNER JOIN featherpanel_realms r ON r.id = s.realms_id
                INNER JOIN featherpanel_nodes n ON n.id = s.node_id
                WHERE s.uuidShort = :uuidShort
                LIMIT 1',
                // Without gamedig_type and public_ip_v4
                'SELECT
                    s.uuidShort AS uuid_short,
                    s.uuid,
                    s.name,
                    s.status,
                    a.ip,
                    a.port,
                    sp.name AS spell_name,
                    r.name AS realm_name,
                    n.fqdn AS node_fqdn
                FROM featherpanel_servers s
                INNER JOIN featherpanel_allocations a ON a.id = s.allocation_id
                INNER JOIN featherpanel_spells sp ON sp.id = s.spell_id
                INNER JOIN featherpanel_realms r ON r.id = s.realms_id
                INNER JOIN featherpanel_nodes n ON n.id = s.node_id
                WHERE s.uuidShort = :uuidShort
                LIMIT 1',
            ];

            foreach ($queries as $sql) {
                try {
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute(['uuidShort' => $uuidShort]);
                    $row = $stmt->fetch(\PDO::FETCH_ASSOC);
                    break; // Query succeeded
                } catch (\Throwable) {
                    continue; // Try next query
                }
            }

            if (!$row) {
                return null;
            }

            return [
                'uuid_short' => $row['uuid_short'],
                'uuid' => $row['uuid'],
                'name' => $row['name'],
                'status' => $row['status'],
                'ip' => $row['ip'],
                'port' => $row['port'],
                'spell' => [
                    'name' => $row['spell_name'],
                    'gamedig_type' => $row['gamedig_type'] ?? null,
                ],
                'realm' => [
                    'name' => $row['realm_name'],
                ],
                'node_fqdn' => $row['node_fqdn'] ?? null,
                'node_public_ip' => $row['node_public_ip'] ?? null,
            ];
        } catch (\Throwable $e) {
            // Log the error so we can debug
            try {
                \App\App::getInstance(false, true)->getLogger()->error('PlayerStatusService::fetchServerData failed: ' . $e->getMessage());
            } catch (\Throwable) {
                // Ignore logging failures
            }

            return null;
        }
    }

    /**
     * Resolve the actual IP to use for querying the game server.
     *
     * If the allocation IP is 0.0.0.0 (wildcard), use the node's public IP or FQDN instead.
     *
     * @param string $allocationIp The allocation IP from the database
     * @param array $server The server data array (may contain node_fqdn, node_public_ip)
     *
     * @return string The resolved IP/hostname to query
     */
    private static function resolveQueryIp(string $allocationIp, array $server): string
    {
        // If the IP is not a wildcard, use it directly
        if ($allocationIp !== '0.0.0.0' && $allocationIp !== '') {
            return $allocationIp;
        }

        // Try node public IPv4 first
        $nodePublicIp = $server['node_public_ip'] ?? null;
        if (!empty($nodePublicIp)) {
            return $nodePublicIp;
        }

        // Fall back to node FQDN
        $nodeFqdn = $server['node_fqdn'] ?? null;
        if (!empty($nodeFqdn)) {
            return $nodeFqdn;
        }

        // Last resort — return the original IP (will likely fail but at least won't crash)
        return $allocationIp;
    }
}
