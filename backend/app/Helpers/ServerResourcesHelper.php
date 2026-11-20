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

use App\Services\Wings\Wings;
use GuzzleHttp\Promise\Utils;

/**
 * Live per-server resource usage for admin lists.
 *
 * One GET /api/servers per node (in parallel) returns the usage of every server
 * on that node, so a page of servers costs one request per node, not one per server.
 */
class ServerResourcesHelper
{
    public const PROBE_TIMEOUT = 3;

    /**
     * @param array<int, array<string, mixed>> $nodes Node rows (with daemon token)
     * @param callable|null $fetcher Test seam: fn(array $nodes, int $timeout): array<int, array{data: ?array, error: ?string}>
     *
     * @return array<int, array{online: bool, error: ?string, servers: array<string, array<string, mixed>>}>
     */
    public static function probeNodes(array $nodes, int $timeout = self::PROBE_TIMEOUT, ?callable $fetcher = null): array
    {
        $raw = $fetcher !== null ? $fetcher($nodes, $timeout) : self::fetch($nodes, $timeout);

        $results = [];
        foreach ($nodes as $node) {
            $nodeId = (int) ($node['id'] ?? 0);
            if ($nodeId <= 0) {
                continue;
            }
            $entry = $raw[$nodeId] ?? ['data' => null, 'error' => 'No response'];
            $data = $entry['data'] ?? null;
            if (!is_array($data)) {
                $results[$nodeId] = [
                    'online' => false,
                    'error' => $entry['error'] ?? 'Failed to fetch server resources',
                    'servers' => [],
                ];
                continue;
            }

            $results[$nodeId] = [
                'online' => true,
                'error' => null,
                'servers' => self::parseServerList($data),
            ];
        }

        return $results;
    }

    /**
     * Turn a daemon /api/servers payload into uuid => usage. Only usage fields are kept:
     * the payload also carries each server's configuration (environment variables included),
     * which must never reach the browser.
     *
     * @param array<mixed> $payload
     *
     * @return array<string, array<string, mixed>>
     */
    public static function parseServerList(array $payload): array
    {
        // Some daemons wrap the list ({"data": [...]} or {"servers": [...]}).
        if (isset($payload['data']) && is_array($payload['data'])) {
            $payload = $payload['data'];
        } elseif (isset($payload['servers']) && is_array($payload['servers'])) {
            $payload = $payload['servers'];
        }

        $out = [];
        foreach ($payload as $item) {
            if (!is_array($item)) {
                continue;
            }
            $config = is_array($item['configuration'] ?? null) ? $item['configuration'] : [];
            $uuid = $config['uuid'] ?? ($item['uuid'] ?? null);
            if (!is_string($uuid) || $uuid === '') {
                continue;
            }
            $util = is_array($item['utilization'] ?? null) ? $item['utilization'] : [];
            $network = is_array($util['network'] ?? null) ? $util['network'] : [];

            $state = $item['state'] ?? ($util['state'] ?? null);

            $out[strtolower($uuid)] = [
                'state' => is_string($state) && $state !== '' ? $state : 'offline',
                'is_suspended' => (bool) ($item['is_suspended'] ?? false),
                'cpu_absolute' => self::num($util['cpu_absolute'] ?? null),
                'memory_bytes' => (int) self::num($util['memory_bytes'] ?? null),
                'memory_limit_bytes' => (int) self::num($util['memory_limit_bytes'] ?? null),
                'disk_bytes' => (int) self::num($util['disk_bytes'] ?? null),
                'network_rx_bytes' => (int) self::num($network['rx_bytes'] ?? null),
                'network_tx_bytes' => (int) self::num($network['tx_bytes'] ?? null),
                'uptime' => (int) self::num($util['uptime'] ?? null),
            ];
        }

        return $out;
    }

    /**
     * @param array<int, array<string, mixed>> $nodes
     *
     * @return array<int, array{data: ?array, error: ?string}>
     */
    private static function fetch(array $nodes, int $timeout): array
    {
        $results = [];
        $promises = [];
        foreach ($nodes as $node) {
            $nodeId = (int) ($node['id'] ?? 0);
            if ($nodeId <= 0) {
                continue;
            }
            try {
                $promises[$nodeId] = Wings::fromNode($node, $timeout)->getConnection()->getAsync('/api/servers');
            } catch (\Throwable $e) {
                $results[$nodeId] = ['data' => null, 'error' => $e->getMessage()];
            }
        }

        if ($promises === []) {
            return $results;
        }

        foreach (Utils::settle($promises)->wait() as $nodeId => $outcome) {
            if (($outcome['state'] ?? '') === 'fulfilled' && is_array($outcome['value'] ?? null)) {
                $results[(int) $nodeId] = ['data' => $outcome['value'], 'error' => null];
                continue;
            }
            $reason = $outcome['reason'] ?? null;
            $results[(int) $nodeId] = [
                'data' => null,
                'error' => $reason instanceof \Throwable ? $reason->getMessage() : 'Failed to fetch server resources',
            ];
        }

        return $results;
    }

    private static function num(mixed $value): float
    {
        return is_numeric($value) ? (float) $value : 0.0;
    }
}
