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

namespace App\Cron;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\TimedTask;
use App\Services\Wings\Wings;
use App\Chat\FeatherZeroTrustCronLog;
use App\Chat\FeatherZeroTrustScanLog;
use App\Services\FeatherZeroTrust\Scanner;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Services\FeatherZeroTrust\Configuration;
use App\Services\FeatherZeroTrust\WebhookService;
use App\Services\FeatherZeroTrust\SuspensionService;

/**
 * FeatherZeroTrustScanner - Cron task for scanning servers with FeatherZeroTrust.
 *
 * This cron job runs periodically and scans servers for suspicious files.
 * It uses the FeatherZeroTrust scanner to detect malicious files and stores suspicious hashes in the FeatherPanel database.
 */
class ZFeatherZeroTrustScanner implements TimeTask
{
    /**
     * Entry point for the cron job.
     */
    public function run(): void
    {
        $config = new Configuration();
        $configData = $config->getAll();

        // Check if FeatherZeroTrust is enabled
        if (!$configData['enabled']) {
            return;
        }

        $scanInterval = $configData['scan_interval'] . 'M';
        $cron = new Cron('featherzerotrust-scanner', $scanInterval);
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $this->performScan();
                TimedTask::markRun('featherzerotrust-scanner', true, 'FeatherZeroTrust scanner heartbeat');
            }, $force);
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to run FeatherZeroTrust scanner cron job: ' . $e->getMessage());
            TimedTask::markRun('featherzerotrust-scanner', false, $e->getMessage());
        }
    }

    /**
     * Perform the scanning task.
     */
    private function performScan(): void
    {
        $startTime = microtime(true);
        $executionId = 'fzt-' . time() . '-' . bin2hex(random_bytes(8));

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aStarting FeatherZeroTrust scanner...');

        $config = new Configuration();
        $configData = $config->getAll();

        // Create cron log entry
        FeatherZeroTrustCronLog::create([
            'execution_id' => $executionId,
            'started_at' => date('Y-m-d H:i:s'),
            'status' => 'running',
            'summary' => 'FeatherZeroTrust scanner started',
        ]);

        $nodes = Node::getAllNodes();
        $totalScanned = 0;
        $totalDetections = 0;
        $totalErrors = 0;
        $nodeDetails = [];
        $serverDetails = [];

        foreach ($nodes as $node) {
            try {
                MinecraftColorCodeSupport::sendOutputWithNewLine("&aScanning servers on node: {$node['name']}");

                // Get all servers on this node
                $servers = Server::getServersByNodeId($node['id']);

                if (empty($servers)) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine("&eNo servers found on node {$node['name']}");
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

                // Create scanner with configuration
                $scanner = new Scanner($wings, $config);

                $nodeScanned = 0;
                $nodeDetections = 0;
                $nodeErrors = 0;

                // Scan each server
                foreach ($servers as $server) {
                    try {
                        if ($server['skip_zerotrust']) {
                            MinecraftColorCodeSupport::sendOutputWithNewLine("&eSkipping zero trust checks for server {$server['name']}");
                            continue;
                        }

                        $serverStartTime = microtime(true);
                        MinecraftColorCodeSupport::sendOutputWithNewLine("&aScanning server: {$server['name']} ({$server['uuidShort']})");

                        $results = $scanner->scanServer($server['uuid'], '/', $configData['max_depth']);

                        $serverDuration = round(microtime(true) - $serverStartTime, 2);
                        ++$totalScanned;
                        ++$nodeScanned;
                        $detectionsCount = count($results['detections'] ?? []);
                        $totalDetections += $detectionsCount;
                        $nodeDetections += $detectionsCount;
                        $errorsCount = count($results['errors'] ?? []);
                        $totalErrors += $errorsCount;
                        $nodeErrors += $errorsCount;

                        // Log individual server scan
                        FeatherZeroTrustScanLog::create([
                            'execution_id' => $executionId,
                            'server_uuid' => $server['uuid'],
                            'server_name' => $server['name'],
                            'node_id' => $node['id'],
                            'node_name' => $node['name'],
                            'status' => 'completed',
                            'files_scanned' => $results['files_scanned'] ?? 0,
                            'detections_count' => $detectionsCount,
                            'errors_count' => $errorsCount,
                            'duration_seconds' => $serverDuration,
                            'detections' => $results['detections'] ?? [],
                        ]);

                        // Auto-suspend server if enabled and detections found
                        if ($detectionsCount > 0) {
                            try {
                                $suspended = SuspensionService::suspendIfNeeded($server['uuid'], $detectionsCount, $config);
                                if ($suspended) {
                                    MinecraftColorCodeSupport::sendOutputWithNewLine("&cAutomatically suspended server {$server['name']} due to {$detectionsCount} detection(s)");
                                }
                            } catch (\Exception $e) {
                                // Don't fail the scan if auto-suspend fails
                                App::getInstance(true)->getLogger()->warning('Failed to auto-suspend server: ' . $e->getMessage());
                            }
                        }

                        // Send webhook notification only if detections found
                        if ($detectionsCount > 0) {
                            try {
                                $webhookService = new WebhookService($config);
                                $webhookService->sendDetectionWebhook($server['uuid'], $server['name'], $results['detections'] ?? [], $results['files_scanned'] ?? 0);
                            } catch (\Exception $e) {
                                // Don't fail the scan if webhook fails
                                App::getInstance(true)->getLogger()->warning('Failed to send FeatherZeroTrust webhook: ' . $e->getMessage());
                            }
                        }

                        if ($detectionsCount > 0) {
                            MinecraftColorCodeSupport::sendOutputWithNewLine("&cFound {$detectionsCount} suspicious files on server {$server['name']}");
                            App::getInstance(true)->getLogger()->warning("FeatherZeroTrust detected {$detectionsCount} suspicious files on server {$server['uuid']}");
                        } else {
                            MinecraftColorCodeSupport::sendOutputWithNewLine("&aNo suspicious files found on server {$server['name']}");
                        }
                    } catch (\Exception $e) {
                        ++$totalErrors;
                        ++$nodeErrors;
                        $errorMessage = $e->getMessage();
                        MinecraftColorCodeSupport::sendOutputWithNewLine("&cFailed to scan server {$server['name']}: {$errorMessage}");
                        App::getInstance(true)->getLogger()->error("FeatherZeroTrust scan failed for server {$server['uuid']}: {$errorMessage}");

                        // Log failed server scan
                        FeatherZeroTrustScanLog::create([
                            'execution_id' => $executionId,
                            'server_uuid' => $server['uuid'],
                            'server_name' => $server['name'] ?? 'Unknown',
                            'node_id' => $node['id'],
                            'node_name' => $node['name'],
                            'status' => 'failed',
                            'error_message' => $errorMessage,
                        ]);
                    }
                }

                $nodeDetails[] = [
                    'node_id' => $node['id'],
                    'node_name' => $node['name'],
                    'servers_scanned' => $nodeScanned,
                    'detections' => $nodeDetections,
                    'errors' => $nodeErrors,
                ];
            } catch (\Exception $e) {
                ++$totalErrors;
                $errorMessage = $e->getMessage();
                MinecraftColorCodeSupport::sendOutputWithNewLine("&cFailed to process node {$node['name']}: {$errorMessage}");
                App::getInstance(true)->getLogger()->error("FeatherZeroTrust scanner failed for node {$node['id']}: {$errorMessage}");

                $nodeDetails[] = [
                    'node_id' => $node['id'],
                    'node_name' => $node['name'],
                    'servers_scanned' => 0,
                    'detections' => 0,
                    'errors' => 1,
                    'error' => $errorMessage,
                ];
            }
        }

        $totalDuration = round(microtime(true) - $startTime, 2);
        $summary = "Scanned {$totalScanned} servers across " . count($nodes) . " node(s), found {$totalDetections} detections, {$totalErrors} errors. Duration: {$totalDuration}s";

        MinecraftColorCodeSupport::sendOutputWithNewLine("&aFeatherZeroTrust scanner completed. Scanned {$totalScanned} servers, found {$totalDetections} detections.");

        // Update cron log with completion details
        FeatherZeroTrustCronLog::update($executionId, [
            'completed_at' => date('Y-m-d H:i:s'),
            'status' => $totalErrors > 0 ? 'failed' : 'completed',
            'total_servers_scanned' => $totalScanned,
            'total_detections' => $totalDetections,
            'total_errors' => $totalErrors,
            'summary' => $summary,
            'details' => [
                'duration_seconds' => $totalDuration,
                'nodes' => $nodeDetails,
                'total_nodes' => count($nodes),
            ],
        ]);

        TimedTask::markRun('featherzerotrust-scanner', $totalErrors === 0, $summary);
    }
}
