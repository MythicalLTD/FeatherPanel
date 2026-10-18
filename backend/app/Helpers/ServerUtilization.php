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

use App\Chat\Node;
use App\Services\Wings\Wings;
use GuzzleHttp\Promise\Utils;

/**
 * Live utilization of many servers at once: one Wings /api/servers call per node, in parallel.
 * Unreachable nodes are skipped; their servers simply have no live data.
 */
class ServerUtilization
{
    /**
     * @param array<int, array> $servers server rows with at least uuid and node_id
     *
     * @return array<string, array{state: string, cpu: float, memory_bytes: int, disk_bytes: int, rx_bytes: int, tx_bytes: int, uptime_ms: int}>
     */
    public static function collect(array $servers, int $timeout = 3): array
    {
        $wanted = [];
        foreach ($servers as $server) {
            if (!empty($server['node_id']) && !empty($server['uuid'])) {
                $wanted[(int) $server['node_id']][(string) $server['uuid']] = true;
            }
        }
        if ($wanted === []) {
            return [];
        }

        $promises = [];
        foreach (Node::getNodesByIds(array_keys($wanted)) as $node) {
            $nodeId = (int) ($node['id'] ?? 0);
            if ($nodeId <= 0 || !isset($wanted[$nodeId])) {
                continue;
            }
            try {
                $promises[$nodeId] = Wings::fromNode($node, $timeout)->getConnection()->getAsync('/api/servers');
            } catch (\Throwable $e) {
                // Node misconfigured: no live data for its servers.
            }
        }
        if ($promises === []) {
            return [];
        }

        $live = [];
        foreach (Utils::settle($promises)->wait() as $nodeId => $outcome) {
            if (($outcome['state'] ?? '') !== 'fulfilled' || !is_array($outcome['value'] ?? null)) {
                continue;
            }
            foreach ($outcome['value'] as $entry) {
                if (!is_array($entry)) {
                    continue;
                }
                $uuid = (string) ($entry['configuration']['uuid'] ?? $entry['uuid'] ?? '');
                if ($uuid === '' || !isset($wanted[(int) $nodeId][$uuid])) {
                    continue; // Servers that were not asked for are never returned.
                }
                $util = is_array($entry['utilization'] ?? null) ? $entry['utilization'] : [];
                $live[$uuid] = [
                    'state' => (string) ($entry['state'] ?? $util['state'] ?? ''),
                    'cpu' => round((float) ($util['cpu_absolute'] ?? 0), 1),
                    'memory_bytes' => (int) ($util['memory_bytes'] ?? 0),
                    'disk_bytes' => (int) ($util['disk_bytes'] ?? 0),
                    'rx_bytes' => (int) ($util['network']['rx_bytes'] ?? 0),
                    'tx_bytes' => (int) ($util['network']['tx_bytes'] ?? 0),
                    'uptime_ms' => (int) ($util['uptime'] ?? 0),
                ];
            }
        }

        return $live;
    }
}
