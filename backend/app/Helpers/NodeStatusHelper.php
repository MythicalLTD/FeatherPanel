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

use App\Chat\Server;
use App\Services\Wings\Wings;
use GuzzleHttp\Promise\Utils;
use App\Services\Wings\Services\SystemService;
use App\Services\Wings\Exceptions\WingsRequestException;

class NodeStatusHelper
{
    /**
     * Default timeout (seconds) for status-page Wings probes.
     */
    public const STATUS_PROBE_TIMEOUT = 3;

    /**
     * Build a lightweight server list for node status displays.
     *
     * Player counts are read from Redis cache only so a cache miss cannot
     * block the status HTTP request with live GameQ queries.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function buildServersForNode(int $nodeId, bool $includePlayerCount = false): array
    {
        if ($nodeId <= 0) {
            return [];
        }

        $servers = Server::getServersByNodeId($nodeId);
        $result = [];

        foreach ($servers as $server) {
            $entry = [
                'id' => (int) $server['id'],
                'name' => $server['name'],
                'uuid_short' => $server['uuidShort'] ?? '',
                'status' => $server['status'] ?? 'offline',
            ];

            if ($includePlayerCount) {
                $uuidShort = $server['uuidShort'] ?? '';
                if ($uuidShort !== '') {
                    $playerStatus = PlayerStatusService::getCachedPlayerStatus($uuidShort);
                    if ($playerStatus !== null) {
                        $entry['player_count'] = (int) ($playerStatus['player_count'] ?? 0);
                    }
                }
            }

            $result[] = $entry;
        }

        usort($result, static fn (array $a, array $b): int => strcasecmp($a['name'], $b['name']));

        return $result;
    }

    /**
     * Probe utilization for many nodes in parallel (fail-fast, no retries).
     *
     * Worst-case latency is approximately STATUS_PROBE_TIMEOUT seconds even
     * when several nodes are offline, rather than timeout × node count.
     *
     * @param array<int, array<string, mixed>> $nodes Node database rows
     * @param int $timeout Per-request timeout in seconds
     *
     * @return array<int, array{status: string, utilization: ?array, error: ?string}>
     */
    public static function probeNodesUtilization(array $nodes, int $timeout = self::STATUS_PROBE_TIMEOUT): array
    {
        $results = [];
        $promises = [];
        $clients = [];

        foreach ($nodes as $node) {
            $nodeId = (int) ($node['id'] ?? 0);
            if ($nodeId <= 0) {
                continue;
            }

            $results[$nodeId] = [
                'status' => 'unhealthy',
                'utilization' => null,
                'error' => null,
            ];

            try {
                $wings = Wings::fromNode($node, $timeout);
                $clients[$nodeId] = $wings;
                $promises[$nodeId] = $wings->getConnection()->getAsync('/api/system/utilization');
            } catch (\Throwable $e) {
                $results[$nodeId]['error'] = $e->getMessage();
            }
        }

        if ($promises === []) {
            return $results;
        }

        $settled = Utils::settle($promises)->wait();
        $fallbackPromises = [];

        foreach ($settled as $nodeId => $outcome) {
            $nodeId = (int) $nodeId;

            if (($outcome['state'] ?? '') === 'fulfilled') {
                $utilization = $outcome['value'] ?? null;
                if (is_array($utilization) && $utilization !== []) {
                    $results[$nodeId]['status'] = 'healthy';
                    $results[$nodeId]['utilization'] = $utilization;
                } else {
                    $results[$nodeId]['error'] = 'Failed to fetch utilization data';
                }
                continue;
            }

            $reason = $outcome['reason'] ?? null;

            // FeatherWings /utilization may be missing — try Calagopus /stats first.
            if ($reason instanceof WingsRequestException && (int) $reason->getCode() === 404 && isset($clients[$nodeId])) {
                $fallbackPromises[$nodeId] = $clients[$nodeId]->getConnection()->getAsync('/api/system/stats');
                continue;
            }

            $results[$nodeId]['error'] = $reason instanceof \Throwable
                ? $reason->getMessage()
                : 'Failed to fetch utilization data';
        }

        if ($fallbackPromises !== []) {
            $fallbackSettled = Utils::settle($fallbackPromises)->wait();
            $systemFallbackPromises = [];

            foreach ($fallbackSettled as $nodeId => $outcome) {
                $nodeId = (int) $nodeId;

                if (($outcome['state'] ?? '') === 'fulfilled' && is_array($outcome['value'] ?? null)) {
                    $results[$nodeId]['status'] = 'healthy';
                    $results[$nodeId]['utilization'] = SystemService::utilizationFromCalagopusStats($outcome['value']);
                    $results[$nodeId]['error'] = null;
                    continue;
                }

                $reason = $outcome['reason'] ?? null;

                // Stats missing too (stock Pterodactyl Wings) — last resort /api/system?v=2.
                // Only escalate on a 404 (endpoint missing); other errors should stop here
                // to avoid burning an extra timeout window on a probe that won't help.
                if ($reason instanceof WingsRequestException && (int) $reason->getCode() === 404 && isset($clients[$nodeId])) {
                    $systemFallbackPromises[$nodeId] = $clients[$nodeId]->getConnection()->getAsync('/api/system?v=2');
                    continue;
                }

                $results[$nodeId]['error'] = $reason instanceof \Throwable
                    ? $reason->getMessage()
                    : 'Failed to fetch utilization data';
            }

            if ($systemFallbackPromises !== []) {
                $systemSettled = Utils::settle($systemFallbackPromises)->wait();

                foreach ($systemSettled as $nodeId => $outcome) {
                    $nodeId = (int) $nodeId;

                    if (($outcome['state'] ?? '') === 'fulfilled' && is_array($outcome['value'] ?? null)) {
                        $results[$nodeId]['status'] = 'healthy';
                        $results[$nodeId]['utilization'] = SystemService::utilizationFromSystemInfo($outcome['value']);
                        $results[$nodeId]['error'] = null;
                    } else {
                        $reason = $outcome['reason'] ?? null;
                        $results[$nodeId]['error'] = $reason instanceof \Throwable
                            ? $reason->getMessage()
                            : 'Failed to fetch utilization data';
                    }
                }
            }
        }

        return $results;
    }

    /**
     * Sum player_count fields from a server list built by buildServersForNode.
     *
     * @param array<int, array<string, mixed>> $servers
     */
    public static function sumPlayerCounts(array $servers): int
    {
        $total = 0;
        foreach ($servers as $serverEntry) {
            $total += (int) ($serverEntry['player_count'] ?? 0);
        }

        return $total;
    }
}
