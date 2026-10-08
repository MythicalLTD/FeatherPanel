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

namespace App\Controllers\User;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Helpers\NodeStatusHelper;
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

        // Public API path can be disabled independently from authenticated status access.
        if (str_starts_with($request->getPathInfo(), '/api/status')) {
            $publicEnabled = $config->getSetting(ConfigInterface::STATUS_PAGE_PUBLIC_ENABLED, 'true') === 'true';
            if (!$publicEnabled) {
                return ApiResponse::error('Public status page is disabled', 'STATUS_PAGE_PUBLIC_DISABLED', 403);
            }
        }

        $showNodeStatus = $config->getSetting(ConfigInterface::STATUS_PAGE_SHOW_NODE_STATUS, 'true') === 'true';
        $showLoadUsage = $config->getSetting(ConfigInterface::STATUS_PAGE_SHOW_LOAD_USAGE, 'true') === 'true';
        $showTotalServers = $config->getSetting(ConfigInterface::STATUS_PAGE_SHOW_TOTAL_SERVERS, 'true') === 'true';
        $showIndividualNodes = $config->getSetting(ConfigInterface::STATUS_PAGE_SHOW_INDIVIDUAL_NODES, 'false') === 'true';
        $allowIframe = $config->getSetting(ConfigInterface::STATUS_PAGE_ALLOW_IFRAME, 'false') === 'true';
        $showRawValues = $config->getSetting(ConfigInterface::STATUS_PAGE_SHOW_RAW_VALUES, 'false') === 'true';
        $showPlayerCount = $config->getSetting(ConfigInterface::STATUS_PAGE_SHOW_PLAYER_COUNT, 'false') === 'true';
        $showPoweredBy = $config->getSetting(ConfigInterface::BRANDING_SHOW_POWERED_BY, 'true') === 'true';

        $responseData = [
            'enabled' => true,
            'allow_iframe' => $allowIframe,
            'show_raw_values' => $showRawValues,
            'show_player_count' => $showPlayerCount,
            'powered_by' => [
                'show' => $showPoweredBy,
                'label' => 'FeatherPanel',
                'url' => 'https://featherpanel.com',
            ],
        ];

        // Get node status if enabled
        if ($showNodeStatus || $showLoadUsage || $showIndividualNodes) {
            $allNodes = Node::getAllNodes();
            $probes = NodeStatusHelper::probeNodesUtilization($allNodes);

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
                $nodeId = (int) $node['id'];
                $probe = $probes[$nodeId] ?? [
                    'status' => 'unhealthy',
                    'utilization' => null,
                    'error' => null,
                ];

                $nodeData = [
                    'id' => $nodeId,
                    'name' => $node['name'],
                    'status' => $probe['status'] === 'healthy' ? 'healthy' : 'unhealthy',
                ];

                if ($showIndividualNodes) {
                    $nodeData['fqdn'] = $node['fqdn'];
                    $nodeData['servers'] = NodeStatusHelper::buildServersForNode(
                        $nodeId,
                        $showPlayerCount,
                        true
                    );
                    $nodeData['server_count'] = count($nodeData['servers']);

                    if ($showPlayerCount) {
                        $nodeData['total_players'] = NodeStatusHelper::sumPlayerCounts($nodeData['servers']);
                    }
                }

                if ($showLoadUsage || $showIndividualNodes) {
                    $nodeData['utilization'] = null;
                }

                if ($probe['status'] === 'healthy' && is_array($probe['utilization']) && $probe['utilization'] !== []) {
                    $nodeData['status'] = 'healthy';
                    ++$globalStats['healthy_nodes'];
                    ++$healthyNodeCount;

                    if ($showLoadUsage || $showIndividualNodes) {
                        $nodeData['utilization'] = $probe['utilization'];

                        if ($showRawValues) {
                            // Add CPU core count from Wings system info
                            try {
                                $wings = Wings::fromNode($node, NodeStatusHelper::STATUS_PROBE_TIMEOUT);
                                $nodeData['cpu_count'] = $wings->getSystem()->getCpuCount();
                            } catch (\Exception $e) {
                                $nodeData['cpu_count'] = null;
                            }
                        }

                        if ($showLoadUsage) {
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
                        }
                    }
                } else {
                    ++$globalStats['unhealthy_nodes'];
                }

                if ($showIndividualNodes) {
                    $nodesWithStatus[] = $nodeData;
                }
            }

            if ($showLoadUsage && $healthyNodeCount > 0) {
                $globalStats['avg_cpu_percent'] = round($globalStats['total_cpu_percent'] / $healthyNodeCount, 2);
            }

            if (isset($globalStats['total_cpu_percent'])) {
                unset($globalStats['total_cpu_percent']);
            }

            if ($showNodeStatus || $showLoadUsage) {
                $responseData['data']['global'] = $globalStats;
            }

            if ($showIndividualNodes) {
                $responseData['data']['nodes'] = $nodesWithStatus;
            }
        }

        // Get total servers if enabled (only count servers visible on the status page)
        if ($showTotalServers) {
            $totalServers = Server::getStatusPageVisibleCount();
            if (!isset($responseData['data'])) {
                $responseData['data'] = [];
            }
            $responseData['data']['total_servers'] = $totalServers;
        }

        return ApiResponse::success($responseData, 'Status data retrieved successfully', 200);
    }
}
