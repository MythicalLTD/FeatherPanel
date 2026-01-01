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
use App\Plugins\Events\Events\FeatherZeroTrustEvent;
use App\Services\FeatherZeroTrust\SuspensionService;
use App\Services\FeatherZeroTrust\SuspiciousFileHashService;

class FeatherZeroTrustController
{
    #[OA\Get(
        path: '/api/admin/featherzerotrust/config',
        summary: 'Get FeatherZeroTrust configuration',
        description: 'Retrieve current FeatherZeroTrust configuration.',
        tags: ['Admin - FeatherZeroTrust'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Configuration retrieved successfully'
            ),
        ],
    )]
    public function getConfig(Request $request): Response
    {
        try {
            $config = new Configuration();
            $configData = $config->getAll();

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    FeatherZeroTrustEvent::onFeatherZeroTrustConfigRetrieved(),
                    [
                        'config' => $configData,
                    ]
                );
            }

            return ApiResponse::success($configData, 'Configuration retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve configuration: ' . $e->getMessage(), 'CONFIG_ERROR', 500);
        }
    }

    #[OA\Put(
        path: '/api/admin/featherzerotrust/config',
        summary: 'Update FeatherZeroTrust configuration',
        description: 'Update FeatherZeroTrust configuration settings.',
        tags: ['Admin - FeatherZeroTrust'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Configuration updated successfully'
            ),
        ],
    )]
    public function updateConfig(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!is_array($data)) {
                return ApiResponse::error('Invalid configuration data', 'INVALID_DATA', 400);
            }

            $config = new Configuration();
            $oldConfig = $config->getAll();
            $success = $config->update($data);

            if (!$success) {
                return ApiResponse::error('Failed to update configuration', 'UPDATE_ERROR', 500);
            }

            $newConfig = $config->getAll();

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    FeatherZeroTrustEvent::onFeatherZeroTrustConfigUpdated(),
                    [
                        'old_config' => $oldConfig,
                        'new_config' => $newConfig,
                        'updated_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success($newConfig, 'Configuration updated successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to update configuration: ' . $e->getMessage(), 'CONFIG_UPDATE_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/featherzerotrust/scan',
        summary: 'Scan a server',
        description: 'Scan a server for suspicious files using FeatherZeroTrust.',
        tags: ['Admin - FeatherZeroTrust'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server scan completed successfully'
            ),
        ],
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

            // Emit scan started event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    FeatherZeroTrustEvent::onFeatherZeroTrustScanStarted(),
                    [
                        'server_uuid' => $serverUuid,
                        'directory' => $directory,
                        'max_depth' => $maxDepth,
                        'started_by' => $request->get('user'),
                    ]
                );
            }

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

            // Emit scan completed event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    FeatherZeroTrustEvent::onFeatherZeroTrustScanCompleted(),
                    [
                        'server_uuid' => $serverUuid,
                        'scan_results' => $results,
                        'detections_count' => $detectionsCount,
                    ]
                );
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
        responses: [
            new OA\Response(
                response: 200,
                description: 'Batch scan completed'
            ),
        ],
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
        responses: [
            new OA\Response(
                response: 200,
                description: 'Cron logs retrieved successfully'
            ),
        ],
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
        responses: [
            new OA\Response(
                response: 200,
                description: 'Execution log retrieved successfully'
            ),
        ],
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

    #[OA\Get(
        path: '/api/admin/featherzerotrust/hashes',
        summary: 'Get suspicious file hashes',
        description: 'Retrieve suspicious file hashes from the database.',
        tags: ['Admin - FeatherZeroTrust'],
        parameters: [
            new OA\Parameter(
                name: 'confirmed_only',
                in: 'query',
                description: 'Only return confirmed malicious hashes',
                required: false,
                schema: new OA\Schema(type: 'boolean')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Hashes retrieved successfully'
            ),
        ],
    )]
    public function getHashes(Request $request): Response
    {
        try {
            $confirmedOnly = $request->query->get('confirmed_only') === 'true' || $request->query->get('confirmed_only') === '1';

            $hashes = SuspiciousFileHashService::getHashes($confirmedOnly);

            return ApiResponse::success($hashes, 'Hashes retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve hashes: ' . $e->getMessage(), 'HASHES_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/featherzerotrust/hashes/stats',
        summary: 'Get hash statistics',
        description: 'Retrieve statistics about suspicious file hashes in the database.',
        tags: ['Admin - FeatherZeroTrust'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Hash statistics retrieved successfully'
            ),
        ],
    )]
    public function getHashStats(Request $request): Response
    {
        try {
            $stats = SuspiciousFileHashService::getStats();

            return ApiResponse::success($stats, 'Hash statistics retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to retrieve hash statistics: ' . $e->getMessage(), 'STATS_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/featherzerotrust/hashes/check',
        summary: 'Check hashes against database',
        description: 'Check multiple hashes against the suspicious file hash database.',
        tags: ['Admin - FeatherZeroTrust'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Hashes checked successfully'
            ),
        ],
    )]
    public function checkHashes(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!isset($data['hashes']) || !is_array($data['hashes'])) {
                return ApiResponse::error('Missing or invalid hashes array', 'INVALID_HASHES', 400);
            }

            $hashes = $data['hashes'];
            $confirmedOnly = $data['confirmed_only'] ?? false;

            if (count($hashes) > 1000) {
                return ApiResponse::error('Maximum 1000 hashes per request', 'TOO_MANY_HASHES', 400);
            }

            $matches = SuspiciousFileHashService::checkHashes($hashes, $confirmedOnly);

            return ApiResponse::success([
                'matches' => $matches,
                'totalChecked' => count($hashes),
                'matchesFound' => count($matches),
            ], 'Hashes checked successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to check hashes: ' . $e->getMessage(), 'CHECK_HASHES_ERROR', 500);
        }
    }

    #[OA\Put(
        path: '/api/admin/featherzerotrust/hashes/{hash}/confirm',
        summary: 'Confirm hash as malicious',
        description: 'Mark a hash as confirmed malicious.',
        tags: ['Admin - FeatherZeroTrust'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Hash confirmed as malicious'
            ),
        ],
    )]
    public function confirmHash(Request $request, string $hash): Response
    {
        try {
            $success = SuspiciousFileHashService::confirmMalicious($hash);

            if (!$success) {
                return ApiResponse::error('Failed to confirm hash', 'CONFIRM_ERROR', 500);
            }

            return ApiResponse::success(['hash' => $hash], 'Hash confirmed as malicious');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to confirm hash: ' . $e->getMessage(), 'CONFIRM_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/featherzerotrust/hashes',
        summary: 'Add hash manually',
        description: 'Manually add a suspicious file hash to the database.',
        tags: ['Admin - FeatherZeroTrust'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Hash added successfully'
            ),
        ],
    )]
    public function addHash(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!isset($data['hash']) || empty($data['hash'])) {
                return ApiResponse::error('Missing hash field', 'MISSING_HASH', 400);
            }

            if (!isset($data['file_name']) || empty($data['file_name'])) {
                return ApiResponse::error('Missing file_name field', 'MISSING_FILE_NAME', 400);
            }

            if (!isset($data['detection_type']) || empty($data['detection_type'])) {
                return ApiResponse::error('Missing detection_type field', 'MISSING_DETECTION_TYPE', 400);
            }

            // Validate hash format (should be SHA-256, 64 hex characters)
            $hash = trim($data['hash']);
            if (!preg_match('/^[a-f0-9]{64}$/i', $hash)) {
                return ApiResponse::error('Invalid hash format. Must be a valid SHA-256 hash (64 hexadecimal characters)', 'INVALID_HASH_FORMAT', 400);
            }

            $metadata = [
                'file_path' => $data['file_path'] ?? null,
                'file_size' => isset($data['file_size']) ? (int) $data['file_size'] : null,
                'server_name' => $data['server_name'] ?? null,
                'node_id' => isset($data['node_id']) ? (int) $data['node_id'] : null,
                'added_by' => 'manual',
                'added_at' => time(),
            ];

            $success = SuspiciousFileHashService::submitHash(
                $hash,
                $data['file_name'],
                $data['detection_type'],
                $data['server_uuid'] ?? null,
                $metadata
            );

            if (!$success) {
                return ApiResponse::error('Failed to add hash', 'ADD_ERROR', 500);
            }

            // If confirmed_malicious is set, mark it as confirmed
            if (isset($data['confirmed_malicious']) && $data['confirmed_malicious'] === true) {
                SuspiciousFileHashService::confirmMalicious($hash);
            }

            return ApiResponse::success(['hash' => $hash], 'Hash added successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to add hash: ' . $e->getMessage(), 'ADD_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/featherzerotrust/hashes/bulk/confirm',
        summary: 'Confirm multiple hashes as malicious',
        description: 'Mark multiple hashes as confirmed malicious.',
        tags: ['Admin - FeatherZeroTrust'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Bulk hash confirmation completed'
            ),
        ],
    )]
    public function bulkConfirmHashes(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!isset($data['hashes']) || !is_array($data['hashes'])) {
                return ApiResponse::error('Missing or invalid hashes array', 'INVALID_HASHES', 400);
            }

            $hashes = $data['hashes'];
            $confirmed = 0;
            $failed = [];

            foreach ($hashes as $hash) {
                if (!is_string($hash) || empty($hash)) {
                    continue;
                }

                $success = SuspiciousFileHashService::confirmMalicious($hash);
                if ($success) {
                    ++$confirmed;
                } else {
                    $failed[] = $hash;
                }
            }

            return ApiResponse::success([
                'confirmed' => $confirmed,
                'failed' => $failed,
                'total' => count($hashes),
            ], "Confirmed {$confirmed} out of " . count($hashes) . ' hashes');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to confirm hashes: ' . $e->getMessage(), 'BULK_CONFIRM_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/featherzerust/hashes/bulk/delete',
        summary: 'Delete multiple hashes',
        description: 'Delete multiple hashes from the database.',
        tags: ['Admin - FeatherZeroTrust'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Bulk hash deletion completed'
            ),
        ],
    )]
    public function bulkDeleteHashes(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!isset($data['hashes']) || !is_array($data['hashes'])) {
                return ApiResponse::error('Missing or invalid hashes array', 'INVALID_HASHES', 400);
            }

            $hashes = $data['hashes'];
            $deleted = 0;
            $failed = [];

            foreach ($hashes as $hash) {
                if (!is_string($hash) || empty($hash)) {
                    continue;
                }

                $success = SuspiciousFileHashService::deleteHash($hash);
                if ($success) {
                    ++$deleted;
                } else {
                    $failed[] = $hash;
                }
            }

            return ApiResponse::success([
                'deleted' => $deleted,
                'failed' => $failed,
                'total' => count($hashes),
            ], "Deleted {$deleted} out of " . count($hashes) . ' hashes');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to delete hashes: ' . $e->getMessage(), 'BULK_DELETE_ERROR', 500);
        }
    }

    #[OA\Delete(
        path: '/api/admin/featherzerotrust/hashes/{hash}',
        summary: 'Delete hash',
        description: 'Delete a hash from the database.',
        tags: ['Admin - FeatherZeroTrust'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Hash deleted successfully'
            ),
        ],
    )]
    public function deleteHash(Request $request, string $hash): Response
    {
        try {
            $success = SuspiciousFileHashService::deleteHash($hash);

            if (!$success) {
                return ApiResponse::error('Failed to delete hash', 'DELETE_ERROR', 500);
            }

            return ApiResponse::success(['hash' => $hash], 'Hash deleted successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to delete hash: ' . $e->getMessage(), 'DELETE_ERROR', 500);
        }
    }
}
