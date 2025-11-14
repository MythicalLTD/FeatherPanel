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
use App\Chat\Server;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Chat\FeatherZeroTrustCronLog;
use App\Chat\FeatherZeroTrustScanLog;
use App\Services\FeatherZeroTrust\Scanner;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\FeatherZeroTrust\Configuration;
use App\Services\FeatherZeroTrust\WebhookService;
use App\Services\FeatherZeroTrust\SuspensionService;

class FeatherZeroTrustController
{
    #[OA\Get(
        path: '/api/admin/featherzerotrust/config',
        summary: 'Get FeatherZeroTrust configuration',
        description: 'Retrieve current FeatherZeroTrust configuration.',
        tags: ['Admin - FeatherZeroTrust'],
    )]
    public function getConfig(Request $request): Response
    {
        try {
            $config = new Configuration();

            return ApiResponse::success($config->getAll(), 'Configuration retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve configuration: ' . $e->getMessage(), 'CONFIG_ERROR', 500);
        }
    }

    #[OA\Put(
        path: '/api/admin/featherzerotrust/config',
        summary: 'Update FeatherZeroTrust configuration',
        description: 'Update FeatherZeroTrust configuration settings.',
        tags: ['Admin - FeatherZeroTrust'],
    )]
    public function updateConfig(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!is_array($data)) {
                return ApiResponse::error('Invalid configuration data', 'INVALID_DATA', 400);
            }

            $config = new Configuration();
            $success = $config->update($data);

            if (!$success) {
                return ApiResponse::error('Failed to update configuration', 'UPDATE_ERROR', 500);
            }

            return ApiResponse::success($config->getAll(), 'Configuration updated successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to update configuration: ' . $e->getMessage(), 'CONFIG_UPDATE_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/featherzerotrust/scan',
        summary: 'Scan a server',
        description: 'Scan a server for suspicious files using FeatherZeroTrust.',
        tags: ['Admin - FeatherZeroTrust'],
    )]
    public function scanServer(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!isset($data['server_uuid'])) {
                return ApiResponse::error('Missing server_uuid parameter', 'MISSING_SERVER_UUID', 400);
            }

            $serverUuid = $data['server_uuid'];
            $directory = $data['directory'] ?? '/';
            $maxDepth = isset($data['max_depth']) ? (int) $data['max_depth'] : null;

            // Get server information
            $server = Server::getServerByUuid($serverUuid);

            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            // Get node information
            $node = Node::getNodeById($server['node_id']);

            if (!$node) {
                return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
            }

            // Create Wings client
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            // Create configuration
            $config = new Configuration();
            $configData = $config->getAll();

            // Use provided maxDepth or config default
            if ($maxDepth === null) {
                $maxDepth = $configData['max_depth'];
            }

            // Create scanner
            $scanner = new Scanner($wings, $config);

            // Perform scan
            $results = $scanner->scanServer($serverUuid, $directory, $maxDepth);

            $detectionsCount = count($results['detections'] ?? []);

            // Auto-suspend server if enabled and detections found
            if ($detectionsCount > 0) {
                try {
                    SuspensionService::suspendIfNeeded($serverUuid, $detectionsCount, $config);
                } catch (\Exception $e) {
                    // Don't fail the request if auto-suspend fails
                    App::getInstance(true)->getLogger()->warning('Failed to auto-suspend server: ' . $e->getMessage());
                }
            }

            // Send webhook notification only if detections found
            if ($detectionsCount > 0) {
                try {
                    $webhookService = new WebhookService($config);
                    $webhookService->sendDetectionWebhook($serverUuid, $server['name'] ?? 'Unknown', $results['detections'] ?? [], $results['files_scanned'] ?? 0);
                } catch (\Exception $e) {
                    // Don't fail the request if webhook fails
                    App::getInstance(true)->getLogger()->warning('Failed to send FeatherZeroTrust webhook: ' . $e->getMessage());
                }
            }

            return ApiResponse::success($results, 'Server scan completed successfully');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('FeatherZeroTrust scan error: ' . $e->getMessage());

            return ApiResponse::error('Failed to scan server: ' . $e->getMessage(), 'SCAN_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/featherzerotrust/scan/batch',
        summary: 'Scan multiple servers',
        description: 'Scan multiple servers for suspicious files using FeatherZeroTrust.',
        tags: ['Admin - FeatherZeroTrust'],
    )]
    public function scanBatch(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!isset($data['server_uuids']) || !is_array($data['server_uuids'])) {
                return ApiResponse::error('Missing or invalid server_uuids array', 'INVALID_SERVER_UUIDS', 400);
            }

            $serverUuids = $data['server_uuids'];
            $directory = $data['directory'] ?? '/';
            $maxDepth = isset($data['max_depth']) ? (int) $data['max_depth'] : null;

            $config = new Configuration();
            $configData = $config->getAll();

            if ($maxDepth === null) {
                $maxDepth = $configData['max_depth'];
            }

            $results = [];

            foreach ($serverUuids as $serverUuid) {
                try {
                    // Get server information
                    $server = Server::getServerByUuid($serverUuid);

                    if (!$server) {
                        $results[] = [
                            'server_uuid' => $serverUuid,
                            'error' => 'Server not found',
                        ];

                        continue;
                    }

                    // Get node information
                    $node = Node::getNodeById($server['node_id']);

                    if (!$node) {
                        $results[] = [
                            'server_uuid' => $serverUuid,
                            'error' => 'Node not found',
                        ];

                        continue;
                    }

                    // Create Wings client
                    $wings = new Wings(
                        $node['fqdn'],
                        $node['daemonListen'],
                        $node['scheme'],
                        $node['daemon_token'],
                        30
                    );

                    // Create scanner
                    $scanner = new Scanner($wings, $config);

                    // Perform scan
                    $scanResult = $scanner->scanServer($serverUuid, $directory, $maxDepth);
                    $results[] = $scanResult;
                } catch (\Exception $e) {
                    App::getInstance(true)->getLogger()->error("FeatherZeroTrust batch scan error for server {$serverUuid}: " . $e->getMessage());

                    $results[] = [
                        'server_uuid' => $serverUuid,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            // Calculate totals and handle auto-suspend
            $totalScanned = count($results);
            $totalDetections = 0;
            foreach ($results as $result) {
                $detectionsCount = count($result['detections'] ?? []);
                $totalDetections += $detectionsCount;

                // Auto-suspend server if enabled and detections found
                if ($detectionsCount > 0 && isset($result['server_uuid'])) {
                    try {
                        SuspensionService::suspendIfNeeded($result['server_uuid'], $detectionsCount, $config);
                    } catch (\Exception $e) {
                        // Don't fail the batch scan if auto-suspend fails
                        App::getInstance(true)->getLogger()->warning('Failed to auto-suspend server in batch: ' . $e->getMessage());
                    }
                }
            }

            // Send batch webhook notification only if detections found
            if ($totalDetections > 0) {
                try {
                    $webhookService = new WebhookService($config);
                    $webhookService->sendBatchScanWebhook($results, $totalScanned, $totalDetections);
                } catch (\Exception $e) {
                    // Don't fail the request if webhook fails
                    App::getInstance(true)->getLogger()->warning('Failed to send FeatherZeroTrust batch webhook: ' . $e->getMessage());
                }
            }

            return ApiResponse::success([
                'results' => $results,
                'total_scanned' => $totalScanned,
            ], 'Batch scan completed');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('FeatherZeroTrust batch scan error: ' . $e->getMessage());

            return ApiResponse::error('Failed to perform batch scan: ' . $e->getMessage(), 'BATCH_SCAN_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/featherzerotrust/logs',
        summary: 'Get FeatherZeroTrust cron execution logs',
        description: 'Retrieve cron job execution logs with pagination.',
        tags: ['Admin - FeatherZeroTrust'],
    )]
    public function getCronLogs(Request $request): Response
    {
        try {
            $page = max(1, (int) $request->query->get('page', 1));
            $limit = max(1, min(100, (int) $request->query->get('limit', 25)));
            $status = $request->query->get('status');
            $offset = ($page - 1) * $limit;

            $logs = FeatherZeroTrustCronLog::getAll($limit, $offset, $status);
            $total = FeatherZeroTrustCronLog::getCount($status);

            return ApiResponse::success([
                'logs' => $logs,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total_records' => $total,
                    'total_pages' => (int) ceil($total / $limit),
                    'has_next' => ($page * $limit) < $total,
                    'has_prev' => $page > 1,
                    'from' => $offset + 1,
                    'to' => min($offset + $limit, $total),
                ],
            ], 'Cron logs retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve cron logs: ' . $e->getMessage(), 'LOGS_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/featherzerotrust/logs/{executionId}',
        summary: 'Get detailed cron execution log',
        description: 'Retrieve detailed information about a specific cron execution including server scan logs.',
        tags: ['Admin - FeatherZeroTrust'],
    )]
    public function getCronLogDetails(Request $request, string $executionId): Response
    {
        try {
            $cronLog = FeatherZeroTrustCronLog::getByExecutionId($executionId);

            if (!$cronLog) {
                return ApiResponse::error('Execution log not found', 'LOG_NOT_FOUND', 404);
            }

            $scanLogs = FeatherZeroTrustScanLog::getByExecutionId($executionId);

            return ApiResponse::success([
                'execution' => $cronLog,
                'scan_logs' => $scanLogs,
            ], 'Execution log retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve execution log: ' . $e->getMessage(), 'LOG_DETAILS_ERROR', 500);
        }
    }
}
