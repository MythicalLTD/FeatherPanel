<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Controllers\Admin;

use App\Chat\Node;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
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
        ];

        $nodesWithStatus = [];
        $healthyNodeCount = 0;

        foreach ($allNodes as $node) {
            $nodeData = [
                'id' => $node['id'],
                'uuid' => $node['uuid'],
                'name' => $node['name'],
                'fqdn' => $node['fqdn'],
                'location_id' => $node['location_id'],
                'status' => 'unhealthy',
                'utilization' => null,
                'error' => null,
            ];

            try {
                $wings = new Wings(
                    $node['fqdn'],
                    $node['daemonListen'],
                    $node['scheme'],
                    $node['daemon_token'],
                    10 // Short timeout for status checks
                );

                $utilization = $wings->getSystem()->getSystemUtilization();

                if (is_array($utilization) && !empty($utilization)) {
                    $nodeData['status'] = 'healthy';
                    $nodeData['utilization'] = $utilization;

                    // Aggregate stats
                    ++$globalStats['healthy_nodes'];
                    ++$healthyNodeCount;

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
                    $nodeData['error'] = 'Failed to fetch utilization data';
                }
            } catch (\Exception $e) {
                ++$globalStats['unhealthy_nodes'];
                $nodeData['error'] = $e->getMessage();
            }

            $nodesWithStatus[] = $nodeData;
        }

        // Calculate average CPU
        if ($healthyNodeCount > 0) {
            $globalStats['avg_cpu_percent'] = round($globalStats['total_cpu_percent'] / $healthyNodeCount, 2);
        }

        // Remove total_cpu_percent from response (internal calculation only)
        unset($globalStats['total_cpu_percent']);

        return ApiResponse::success([
            'global' => $globalStats,
            'nodes' => $nodesWithStatus,
        ], 'Global node status retrieved successfully', 200);
    }
}
