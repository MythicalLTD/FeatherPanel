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

namespace App\Controllers\Admin;

use App\Chat\Node;
use App\Chat\Location;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\NodeStatusHelper;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class NodeStatusController
{
    #[OA\Get(
        path: '/api/admin/nodes/status/global',
        summary: 'Get global node status and utilization',
        description: 'Retrieve aggregated utilization and status information from all nodes including CPU, memory, disk usage, and health status.',
        tags: ['Admin - Nodes'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Global node status retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'global', type: 'object', properties: [
                            new OA\Property(property: 'total_nodes', type: 'integer', description: 'Total number of nodes'),
                            new OA\Property(property: 'healthy_nodes', type: 'integer', description: 'Number of healthy nodes'),
                            new OA\Property(property: 'unhealthy_nodes', type: 'integer', description: 'Number of unhealthy nodes'),
                            new OA\Property(property: 'total_memory', type: 'integer', description: 'Total memory across all nodes (bytes)'),
                            new OA\Property(property: 'used_memory', type: 'integer', description: 'Used memory across all nodes (bytes)'),
                            new OA\Property(property: 'total_disk', type: 'integer', description: 'Total disk across all nodes (bytes)'),
                            new OA\Property(property: 'used_disk', type: 'integer', description: 'Used disk across all nodes (bytes)'),
                            new OA\Property(property: 'avg_cpu_percent', type: 'number', description: 'Average CPU usage across all nodes (%)'),
                        ]),
                        new OA\Property(property: 'nodes', type: 'array', items: new OA\Items(
                            properties: [
                                new OA\Property(property: 'id', type: 'integer'),
                                new OA\Property(property: 'name', type: 'string'),
                                new OA\Property(property: 'fqdn', type: 'string'),
                                new OA\Property(property: 'status', type: 'string', enum: ['healthy', 'unhealthy']),
                                new OA\Property(property: 'server_count', type: 'integer', description: 'Number of servers on this node'),
                                new OA\Property(property: 'total_players', type: 'integer', description: 'Total connected players across servers on this node'),
                                new OA\Property(property: 'utilization', type: 'object', nullable: true),
                            ]
                        )),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getGlobalStatus(Request $request): Response
    {
        $allNodes = Node::getAllNodes();
        $probes = NodeStatusHelper::probeNodesUtilization($allNodes);
        $locations = Location::getByIds(array_map(
            static fn (array $node): int => (int) ($node['location_id'] ?? 0),
            $allNodes
        ));

        $globalStats = [
            'total_nodes' => count($allNodes),
            'healthy_nodes' => 0,
            'unhealthy_nodes' => 0,
            'total_memory' => 0,
            'used_memory' => 0,
            'total_disk' => 0,
            'used_disk' => 0,
            'avg_cpu_percent' => 0.0,
            'total_cpu_percent' => 0.0,
            'avg_latency_ms' => null,
        ];

        $nodesWithStatus = [];
        $healthyNodeCount = 0;
        $latencySum = 0;
        $latencyCount = 0;

        foreach ($allNodes as $node) {
            $nodeId = (int) $node['id'];
            $probe = $probes[$nodeId] ?? [
                'status' => 'unhealthy',
                'utilization' => null,
                'error' => 'Probe result missing',
                'latency_ms' => null,
            ];

            $servers = NodeStatusHelper::buildServersForNode($nodeId, true);
            $locationId = (int) ($node['location_id'] ?? 0);
            $location = $locations[$locationId] ?? null;
            $latitude = isset($location['latitude']) && $location['latitude'] !== null && $location['latitude'] !== ''
                ? (float) $location['latitude']
                : null;
            $longitude = isset($location['longitude']) && $location['longitude'] !== null && $location['longitude'] !== ''
                ? (float) $location['longitude']
                : null;
            $latencyMs = isset($probe['latency_ms']) && $probe['latency_ms'] !== null
                ? (int) $probe['latency_ms']
                : null;
            if ($latencyMs !== null) {
                $latencySum += $latencyMs;
                ++$latencyCount;
            }

            $nodeData = [
                'id' => $nodeId,
                'uuid' => $node['uuid'],
                'name' => $node['name'],
                'fqdn' => $node['fqdn'],
                'location_id' => $locationId,
                'location_name' => $location['name'] ?? null,
                'flag_code' => $location['flag_code'] ?? null,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'latency_ms' => $latencyMs,
                'status' => $probe['status'],
                'utilization' => $probe['utilization'],
                'error' => $probe['error'],
                'servers' => $servers,
                'server_count' => count($servers),
                'total_players' => NodeStatusHelper::sumPlayerCounts($servers),
            ];

            if ($probe['status'] === 'healthy' && is_array($probe['utilization']) && $probe['utilization'] !== []) {
                ++$globalStats['healthy_nodes'];
                ++$healthyNodeCount;

                $utilization = $probe['utilization'];

                if (isset($utilization['memory_total'])) {
                    $globalStats['total_memory'] += $utilization['memory_total'];
                    $globalStats['used_memory'] += $utilization['memory_used'] ?? 0;
                }

                if (isset($utilization['disk_total'])) {
                    $globalStats['total_disk'] += $utilization['disk_total'];
                    $globalStats['used_disk'] += $utilization['disk_used'] ?? 0;
                }

                if (isset($utilization['cpu_percent'])) {
                    $globalStats['total_cpu_percent'] += $utilization['cpu_percent'];
                }
            } else {
                ++$globalStats['unhealthy_nodes'];
                if ($nodeData['error'] === null) {
                    $nodeData['error'] = 'Failed to fetch utilization data';
                }
                $nodeData['status'] = 'unhealthy';
                $nodeData['utilization'] = null;
            }

            $nodesWithStatus[] = $nodeData;
        }

        if ($healthyNodeCount > 0) {
            $globalStats['avg_cpu_percent'] = round($globalStats['total_cpu_percent'] / $healthyNodeCount, 2);
        }

        if ($latencyCount > 0) {
            $globalStats['avg_latency_ms'] = (int) round($latencySum / $latencyCount);
        }

        unset($globalStats['total_cpu_percent']);

        return ApiResponse::success([
            'global' => $globalStats,
            'nodes' => $nodesWithStatus,
        ], 'Global node status retrieved successfully', 200);
    }
}
