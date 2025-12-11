<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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

namespace App\Controllers\User;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class NodeStatusController
{
    #[OA\Get(
        path: '/api/user/status',
        summary: 'Get public status page data',
        description: 'Retrieve status information based on configured visibility settings. Only returns data that is enabled in settings.',
        tags: ['User - Status'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Status data retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'enabled', type: 'boolean', description: 'Whether status page is enabled'),
                        new OA\Property(property: 'data', type: 'object', description: 'Status data based on settings'),
                    ]
                )
            ),
            new OA\Response(response: 403, description: 'Status page is disabled'),
        ]
    )]
    public function getStatus(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();

        // Check if status page is enabled
        $enabled = $config->getSetting(ConfigInterface::STATUS_PAGE_ENABLED, 'false') === 'true';
        if (!$enabled) {
            return ApiResponse::error('Status page is disabled', 'STATUS_PAGE_DISABLED', 403);
        }

        $showNodeStatus = $config->getSetting(ConfigInterface::STATUS_PAGE_SHOW_NODE_STATUS, 'true') === 'true';
        $showLoadUsage = $config->getSetting(ConfigInterface::STATUS_PAGE_SHOW_LOAD_USAGE, 'true') === 'true';
        $showTotalServers = $config->getSetting(ConfigInterface::STATUS_PAGE_SHOW_TOTAL_SERVERS, 'true') === 'true';
        $showIndividualNodes = $config->getSetting(ConfigInterface::STATUS_PAGE_SHOW_INDIVIDUAL_NODES, 'false') === 'true';

        $responseData = [
            'enabled' => true,
        ];

        // Get node status if enabled
        if ($showNodeStatus || $showLoadUsage || $showIndividualNodes) {
            $allNodes = Node::getAllNodes();

            $globalStats = [
                'total_nodes' => count($allNodes),
                'healthy_nodes' => 0,
                'unhealthy_nodes' => 0,
            ];

            if ($showLoadUsage) {
                $globalStats['total_memory'] = 0;
                $globalStats['used_memory'] = 0;
                $globalStats['total_disk'] = 0;
                $globalStats['used_disk'] = 0;
                $globalStats['avg_cpu_percent'] = 0.0;
                $globalStats['total_cpu_percent'] = 0.0;
            }

            $nodesWithStatus = [];
            $healthyNodeCount = 0;

            foreach ($allNodes as $node) {
                $nodeData = [
                    'id' => $node['id'],
                    'name' => $node['name'],
                    'status' => 'unhealthy',
                ];

                if ($showIndividualNodes) {
                    $nodeData['fqdn'] = $node['fqdn'];
                    // Get server count for this node
                    $nodeData['server_count'] = Server::getCount(nodeId: $node['id']);
                }

                if ($showLoadUsage || $showIndividualNodes) {
                    $nodeData['utilization'] = null;
                }

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
                        ++$globalStats['healthy_nodes'];
                        ++$healthyNodeCount;

                        if ($showLoadUsage || $showIndividualNodes) {
                            $nodeData['utilization'] = $utilization;

                            // Aggregate stats for global view
                            if ($showLoadUsage) {
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
                            }
                        }
                    } else {
                        ++$globalStats['unhealthy_nodes'];
                    }
                } catch (\Exception $e) {
                    ++$globalStats['unhealthy_nodes'];
                }

                // Only include individual nodes if enabled
                if ($showIndividualNodes) {
                    $nodesWithStatus[] = $nodeData;
                }
            }

            // Calculate average CPU if showing load usage
            if ($showLoadUsage && $healthyNodeCount > 0) {
                $globalStats['avg_cpu_percent'] = round($globalStats['total_cpu_percent'] / $healthyNodeCount, 2);
            }

            // Remove internal calculation field
            if (isset($globalStats['total_cpu_percent'])) {
                unset($globalStats['total_cpu_percent']);
            }

            // Build response based on what's enabled
            if ($showNodeStatus || $showLoadUsage) {
                $responseData['data']['global'] = $globalStats;
            }

            if ($showIndividualNodes) {
                $responseData['data']['nodes'] = $nodesWithStatus;
            }
        }

        // Get total servers if enabled
        if ($showTotalServers) {
            $totalServers = Server::getCount();
            if (!isset($responseData['data'])) {
                $responseData['data'] = [];
            }
            $responseData['data']['total_servers'] = $totalServers;
        }

        return ApiResponse::success($responseData, 'Status data retrieved successfully', 200);
    }
}

