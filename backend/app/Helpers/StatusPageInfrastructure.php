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

use App\App;
use App\Chat\Node;
use App\Cache\Cache;
use App\Chat\VmNode;
use App\Chat\WebNode;
use App\Chat\Database;
use App\Chat\Location;
use App\Services\Vm\VmInstanceUtil;

/**
 * Public-safe web/VDS health, incidents and map points for the status page.
 */
final class StatusPageInfrastructure
{
    private const CACHE_MINUTES = 1;

    /**
     * @param list<array<string, mixed>> $gameNodes Public game node DTOs (may include lat/lng)
     *
     * @return array{
     *   web_nodes?: array<string, mixed>,
     *   vds_nodes?: array<string, mixed>,
     *   incidents?: list<array<string, mixed>>,
     *   map_nodes?: list<array<string, mixed>>
     * }
     */
    public static function build(
        bool $showWeb,
        bool $showVds,
        bool $showIncidents,
        bool $showMap,
        bool $showIndividual,
        array $gameNodes = [],
    ): array {
        $out = [];

        if ($showWeb && ModuleGate::isEnabled(ModuleGate::WEB)) {
            $out['web_nodes'] = self::probeWebNodes($showIndividual || $showMap);
        }

        if ($showVds && ModuleGate::isEnabled(ModuleGate::VDS)) {
            $out['vds_nodes'] = self::probeVdsNodes($showIndividual || $showMap);
        }

        if ($showIncidents) {
            $out['incidents'] = self::publicIncidents();
        }

        if ($showMap) {
            $out['map_nodes'] = self::mapNodes(
                $gameNodes,
                $out['web_nodes']['nodes'] ?? [],
                $out['vds_nodes']['nodes'] ?? [],
            );
        }

        return $out;
    }

    /**
     * @return array{total:int,healthy:int,unhealthy:int,nodes?:list<array<string,mixed>>}
     */
    private static function probeWebNodes(bool $includeNodes): array
    {
        $cached = Cache::get('status_page:web_nodes');
        if (is_array($cached)) {
            return $includeNodes ? $cached : self::stripNodes($cached);
        }

        $nodes = WebNode::getAllWebNodes();
        $locations = self::locationsFor($nodes);
        $rows = [];
        $healthy = 0;
        $unhealthy = 0;

        foreach ($nodes as $node) {
            $started = microtime(true);
            $probe = FeatherQuilldProbe::probeHealth($node, 3);
            $latency = (int) round((microtime(true) - $started) * 1000);
            $status = $probe['status'] === 'healthy' ? 'healthy' : 'unhealthy';
            if ($status === 'healthy') {
                ++$healthy;
            } else {
                ++$unhealthy;
            }
            $locationId = (int) ($node['location_id'] ?? 0);
            $location = $locations[$locationId] ?? null;
            $rows[] = self::publicNodeDto(
                (int) ($node['id'] ?? 0),
                (string) ($node['name'] ?? 'Web node'),
                $status,
                $location,
                $status === 'healthy' ? $latency : null,
            );
        }

        $payload = [
            'total' => count($nodes),
            'healthy' => $healthy,
            'unhealthy' => $unhealthy,
            'nodes' => $rows,
        ];
        Cache::put('status_page:web_nodes', $payload, self::CACHE_MINUTES);

        return $includeNodes ? $payload : self::stripNodes($payload);
    }

    /**
     * @return array{total:int,healthy:int,unhealthy:int,nodes?:list<array<string,mixed>>}
     */
    private static function probeVdsNodes(bool $includeNodes): array
    {
        $cached = Cache::get('status_page:vds_nodes');
        if (is_array($cached)) {
            return $includeNodes ? $cached : self::stripNodes($cached);
        }

        $nodes = VmNode::getAllVmNodes();
        $locations = self::locationsFor($nodes);
        $rows = [];
        $healthy = 0;
        $unhealthy = 0;

        foreach ($nodes as $node) {
            $status = 'unhealthy';
            $latency = null;
            try {
                $client = VmInstanceUtil::buildProxmoxClientForNode($node);
                $started = microtime(true);
                $result = $client->testConnection();
                $latency = (int) round((microtime(true) - $started) * 1000);
                if (!empty($result['ok'])) {
                    $status = 'healthy';
                    if (isset($result['latency_ms'])) {
                        $latency = (int) $result['latency_ms'];
                    }
                }
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->debug('Status page VDS probe failed: ' . $e->getMessage());
            }

            if ($status === 'healthy') {
                ++$healthy;
            } else {
                ++$unhealthy;
            }

            $locationId = (int) ($node['location_id'] ?? 0);
            $rows[] = self::publicNodeDto(
                (int) ($node['id'] ?? 0),
                (string) ($node['name'] ?? 'VDS node'),
                $status,
                $locations[$locationId] ?? null,
                $status === 'healthy' ? $latency : null,
            );
        }

        $payload = [
            'total' => count($nodes),
            'healthy' => $healthy,
            'unhealthy' => $unhealthy,
            'nodes' => $rows,
        ];
        Cache::put('status_page:vds_nodes', $payload, self::CACHE_MINUTES);

        return $includeNodes ? $payload : self::stripNodes($payload);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function publicIncidents(): array
    {
        $cached = Cache::get('status_page:incidents');
        if (is_array($cached)) {
            return $cached;
        }

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->query(
                "SELECT a.id, a.type, a.severity, a.message, a.created_at, n.name AS node_name
                 FROM featherpanel_node_alerts a
                 LEFT JOIN featherpanel_nodes n ON n.id = a.node_id
                 WHERE a.status = 'open' AND a.type IN ('node_down', 'disk_full')
                 ORDER BY a.created_at DESC
                 LIMIT 25"
            );
            $rows = $stmt ? ($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []) : [];
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->debug('Status page incidents query failed: ' . $e->getMessage());
            $rows = [];
        }

        $incidents = [];
        foreach ($rows as $row) {
            $incidents[] = [
                'id' => (int) ($row['id'] ?? 0),
                'component' => 'game',
                'node_name' => $row['node_name'] ?? 'Unknown node',
                'type' => $row['type'] ?? 'node_down',
                'severity' => $row['severity'] ?? 'warning',
                'message' => (string) ($row['message'] ?? ''),
                'started_at' => $row['created_at'] ?? null,
            ];
        }

        Cache::put('status_page:incidents', $incidents, self::CACHE_MINUTES);

        return $incidents;
    }

    /**
     * @param list<array<string, mixed>> $gameNodes
     * @param list<array<string, mixed>> $webNodes
     * @param list<array<string, mixed>> $vdsNodes
     *
     * @return list<array<string, mixed>>
     */
    private static function mapNodes(array $gameNodes, array $webNodes, array $vdsNodes): array
    {
        $points = [];

        // Game nodes on the public status payload may lack lat/lng; enrich from locations.
        $gameAll = Node::getAllNodes();
        $gameLocations = self::locationsFor($gameAll);
        $byId = [];
        foreach ($gameAll as $node) {
            $byId[(int) ($node['id'] ?? 0)] = $node;
        }

        foreach ($gameNodes as $node) {
            $id = (int) ($node['id'] ?? 0);
            $raw = $byId[$id] ?? null;
            $location = $raw ? ($gameLocations[(int) ($raw['location_id'] ?? 0)] ?? null) : null;
            $point = self::mapPoint('game', $node['name'] ?? 'Game node', $node['status'] ?? 'unhealthy', $location, $node);
            if ($point !== null) {
                $points[] = $point;
            }
        }

        foreach ($webNodes as $node) {
            $point = self::mapPoint('web', $node['name'] ?? 'Web node', $node['status'] ?? 'unhealthy', [
                'name' => $node['location_name'] ?? null,
                'flag_code' => $node['flag_code'] ?? null,
                'latitude' => $node['latitude'] ?? null,
                'longitude' => $node['longitude'] ?? null,
            ], $node);
            if ($point !== null) {
                $points[] = $point;
            }
        }

        foreach ($vdsNodes as $node) {
            $point = self::mapPoint('vds', $node['name'] ?? 'VDS node', $node['status'] ?? 'unhealthy', [
                'name' => $node['location_name'] ?? null,
                'flag_code' => $node['flag_code'] ?? null,
                'latitude' => $node['latitude'] ?? null,
                'longitude' => $node['longitude'] ?? null,
            ], $node);
            if ($point !== null) {
                $points[] = $point;
            }
        }

        return $points;
    }

    /**
     * @param array<string, mixed>|null $location
     * @param array<string, mixed> $fallback
     *
     * @return array<string, mixed>|null
     */
    private static function mapPoint(string $kind, string $name, string $status, ?array $location, array $fallback): ?array
    {
        $lat = $fallback['latitude'] ?? $location['latitude'] ?? null;
        $lng = $fallback['longitude'] ?? $location['longitude'] ?? null;
        if ($lat === null || $lng === null || $lat === '' || $lng === '') {
            return null;
        }

        return [
            'kind' => $kind,
            'name' => $name,
            'status' => $status === 'healthy' ? 'healthy' : ($status === 'unknown' ? 'unknown' : 'unhealthy'),
            'latitude' => (float) $lat,
            'longitude' => (float) $lng,
            'flag_code' => $fallback['flag_code'] ?? $location['flag_code'] ?? null,
            'location_name' => $fallback['location_name'] ?? $location['name'] ?? null,
        ];
    }

    /**
     * @param list<array<string, mixed>> $nodes
     *
     * @return array<int, array<string, mixed>>
     */
    private static function locationsFor(array $nodes): array
    {
        $ids = [];
        foreach ($nodes as $node) {
            $id = (int) ($node['location_id'] ?? 0);
            if ($id > 0) {
                $ids[] = $id;
            }
        }
        if ($ids === []) {
            return [];
        }

        $rows = Location::getByIds(array_values(array_unique($ids)));
        $map = [];
        foreach ($rows as $row) {
            $map[(int) ($row['id'] ?? 0)] = $row;
        }

        return $map;
    }

    /**
     * @param array<string, mixed>|null $location
     *
     * @return array<string, mixed>
     */
    private static function publicNodeDto(int $id, string $name, string $status, ?array $location, ?int $latencyMs): array
    {
        $lat = $location['latitude'] ?? null;
        $lng = $location['longitude'] ?? null;

        return [
            'id' => $id,
            'name' => $name,
            'status' => $status,
            'location_name' => $location['name'] ?? null,
            'flag_code' => $location['flag_code'] ?? null,
            'latitude' => ($lat !== null && $lat !== '') ? (float) $lat : null,
            'longitude' => ($lng !== null && $lng !== '') ? (float) $lng : null,
            'latency_ms' => $latencyMs,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return array<string, mixed>
     */
    private static function stripNodes(array $payload): array
    {
        unset($payload['nodes']);

        return $payload;
    }
}
