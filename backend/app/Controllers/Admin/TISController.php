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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Node;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class TISController
{
    #[OA\Get(
        path: '/api/admin/tis/stats',
        summary: 'Get TIS statistics',
        description: 'Retrieve statistics about the TIS database from all nodes.',
        tags: ['Admin - TIS'],
    )]
    public function getStats(Request $request): Response
    {
        try {
            $nodes = Node::getAllNodes();
            $allStats = [];
            $totalStats = [
                'totalHashes' => 0,
                'totalServers' => 0,
                'unconfirmedHashes' => 0,
                'recentDetections' => 0,
                'topDetectionTypes' => [],
            ];

            foreach ($nodes as $node) {
                try {
                    $wings = new Wings(
                        $node['fqdn'],
                        $node['daemonListen'],
                        $node['scheme'],
                        $node['daemon_token'],
                        30
                    );

                    $response = $wings->getTIS()->getStats();

                    if ($response->isSuccessful()) {
                        $stats = $response->getData();
                        $stats['node_id'] = $node['id'];
                        $stats['node_name'] = $node['name'];
                        $allStats[] = $stats;

                        // Aggregate totals
                        if (isset($stats['totalHashes'])) {
                            $totalStats['totalHashes'] += (int) $stats['totalHashes'];
                        }
                        if (isset($stats['totalServers'])) {
                            $totalStats['totalServers'] += (int) $stats['totalServers'];
                        }
                        if (isset($stats['unconfirmedHashes'])) {
                            $totalStats['unconfirmedHashes'] += (int) $stats['unconfirmedHashes'];
                        }
                        if (isset($stats['recentDetections'])) {
                            $totalStats['recentDetections'] += (int) $stats['recentDetections'];
                        }
                    }
                } catch (\Exception $e) {
                    App::getInstance(true)->getLogger()->error("Failed to get TIS stats from node {$node['id']}: " . $e->getMessage());
                }
            }

            return ApiResponse::success([
                'nodes' => $allStats,
                'totals' => $totalStats,
            ], 'TIS statistics retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve TIS statistics: ' . $e->getMessage(), 'TIS_STATS_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/tis/hashes',
        summary: 'Get confirmed malicious hashes',
        description: 'Retrieve confirmed malicious hashes from TIS.',
        tags: ['Admin - TIS'],
        parameters: [
            new OA\Parameter(
                name: 'node_id',
                in: 'query',
                description: 'Node ID to query (optional, queries all nodes if not specified)',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
    )]
    public function getHashes(Request $request): Response
    {
        try {
            $nodeId = $request->query->get('node_id');

            if ($nodeId) {
                $node = Node::getNodeById((int) $nodeId);

                if (!$node) {
                    return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
                }

                $wings = new Wings(
                    $node['fqdn'],
                    $node['daemonListen'],
                    $node['scheme'],
                    $node['daemon_token'],
                    30
                );

                $response = $wings->getTIS()->getHashes();

                if (!$response->isSuccessful()) {
                    return ApiResponse::error('Failed to retrieve hashes from node', 'TIS_ERROR', 500);
                }

                return ApiResponse::success($response->getData(), 'Hashes retrieved successfully');
            }

            // Query all nodes
            $nodes = Node::getAllNodes();
            $allHashes = [];

            foreach ($nodes as $node) {
                try {
                    $wings = new Wings(
                        $node['fqdn'],
                        $node['daemonListen'],
                        $node['scheme'],
                        $node['daemon_token'],
                        30
                    );

                    $response = $wings->getTIS()->getHashes();

                    if ($response->isSuccessful()) {
                        $hashes = $response->getData();

                        if (is_array($hashes)) {
                            foreach ($hashes as $hash) {
                                $hash['node_id'] = $node['id'];
                                $hash['node_name'] = $node['name'];
                                $allHashes[] = $hash;
                            }
                        }
                    }
                } catch (\Exception $e) {
                    App::getInstance(true)->getLogger()->error("Failed to get hashes from node {$node['id']}: " . $e->getMessage());
                }
            }

            return ApiResponse::success($allHashes, 'Hashes retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve hashes: ' . $e->getMessage(), 'TIS_HASHES_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/tis/servers/{serverUuid}',
        summary: 'Check server status',
        description: 'Check if a server has been flagged in TIS.',
        tags: ['Admin - TIS'],
        parameters: [
            new OA\Parameter(
                name: 'serverUuid',
                in: 'path',
                description: 'Server UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'node_id',
                in: 'query',
                description: 'Node ID where the server is located',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
    )]
    public function checkServer(Request $request, string $serverUuid): Response
    {
        try {
            $nodeId = $request->query->get('node_id');

            if (!$nodeId || !is_numeric($nodeId)) {
                return ApiResponse::error('Missing or invalid node_id parameter', 'INVALID_NODE_ID', 400);
            }

            $node = Node::getNodeById((int) $nodeId);

            if (!$node) {
                return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
            }

            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = $wings->getTIS()->checkServer($serverUuid);

            if (!$response->isSuccessful()) {
                return ApiResponse::error('Failed to check server status', 'TIS_ERROR', 500);
            }

            return ApiResponse::success($response->getData(), 'Server status retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to check server status: ' . $e->getMessage(), 'TIS_CHECK_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/tis/check/hashes',
        summary: 'Check hashes against TIS',
        description: 'Check multiple hashes against the confirmed malicious hash database.',
        tags: ['Admin - TIS'],
    )]
    public function checkHashes(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!isset($data['hashes']) || !is_array($data['hashes'])) {
                return ApiResponse::error('Missing or invalid hashes array', 'INVALID_HASHES', 400);
            }

            $hashes = $data['hashes'];
            $nodeId = $data['node_id'] ?? null;

            if ($nodeId) {
                $node = Node::getNodeById((int) $nodeId);

                if (!$node) {
                    return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
                }

                $wings = new Wings(
                    $node['fqdn'],
                    $node['daemonListen'],
                    $node['scheme'],
                    $node['daemon_token'],
                    30
                );

                $response = $wings->getTIS()->checkHashes($hashes);

                if (!$response->isSuccessful()) {
                    return ApiResponse::error('Failed to check hashes', 'TIS_ERROR', 500);
                }

                return ApiResponse::success($response->getData(), 'Hashes checked successfully');
            }

            // Check against all nodes
            $nodes = Node::getAllNodes();
            $allMatches = [];

            foreach ($nodes as $node) {
                try {
                    $wings = new Wings(
                        $node['fqdn'],
                        $node['daemonListen'],
                        $node['scheme'],
                        $node['daemon_token'],
                        30
                    );

                    $response = $wings->getTIS()->checkHashes($hashes);

                    if ($response->isSuccessful()) {
                        $result = $response->getData();

                        if (isset($result['matches']) && is_array($result['matches'])) {
                            foreach ($result['matches'] as $match) {
                                $match['node_id'] = $node['id'];
                                $match['node_name'] = $node['name'];
                                $allMatches[] = $match;
                            }
                        }
                    }
                } catch (\Exception $e) {
                    App::getInstance(true)->getLogger()->error("Failed to check hashes on node {$node['id']}: " . $e->getMessage());
                }
            }

            return ApiResponse::success([
                'matches' => $allMatches,
                'totalChecked' => count($hashes),
            ], 'Hashes checked successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to check hashes: ' . $e->getMessage(), 'TIS_CHECK_HASHES_ERROR', 500);
        }
    }
}
