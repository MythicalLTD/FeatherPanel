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

namespace App\Services\FeatherZeroTrust;

use App\App;
use GuzzleHttp\Client;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Exception\RequestException;

/**
 * Webhook Service for FeatherZeroTrust.
 *
 * Handles sending Discord webhook notifications for detections.
 */
class WebhookService
{
    private Configuration $config;
    private Client $httpClient;

    /**
     * Create a new WebhookService instance.
     */
    public function __construct(?Configuration $config = null)
    {
        $this->config = $config ?? new Configuration();
        $this->httpClient = new Client([
            'timeout' => 10,
            'verify' => true,
        ]);
    }

    /**
     * Send a webhook notification for detections.
     *
     * @param string $serverUuid Server UUID
     * @param string $serverName Server name
     * @param array<string, mixed> $detections Detections array
     * @param int $filesScanned Number of files scanned
     *
     * @return bool Success status
     */
    public function sendDetectionWebhook(string $serverUuid, string $serverName, array $detections, int $filesScanned): bool
    {
        $configData = $this->config->getAll();

        // Check if webhooks are enabled
        if (!$configData['webhook_enabled'] || empty($configData['webhook_url'])) {
            return false;
        }

        $detectionsCount = count($detections);

        // Don't send webhook if scan is clean (no detections)
        if ($detectionsCount === 0) {
            return false;
        }

        $webhookUrl = $configData['webhook_url'];

        // Validate webhook URL
        if (!filter_var($webhookUrl, FILTER_VALIDATE_URL)) {
            App::getInstance(true)->getLogger()->warning('Invalid webhook URL configured for FeatherZeroTrust');

            return false;
        }

        try {
            $color = 15158332; // Red for detections

            // Build description
            $description = "**Server:** {$serverName}\n";
            $description .= "**UUID:** `{$serverUuid}`\n";
            $description .= "**Files Scanned:** {$filesScanned}\n";
            $description .= "**Detections:** {$detectionsCount}\n";

            // Build fields for detections
            $fields = [];
            // Limit to first 10 detections to avoid Discord limits
            $displayDetections = array_slice($detections, 0, 10);
            foreach ($displayDetections as $detection) {
                $filePath = $detection['file_path'] ?? 'Unknown';
                $detectionType = $detection['detection_type'] ?? 'Unknown';
                $reason = $detection['reason'] ?? 'No reason provided';

                // Truncate long paths
                if (strlen($filePath) > 100) {
                    $filePath = '...' . substr($filePath, -97);
                }

                $fields[] = [
                    'name' => $detectionType,
                    'value' => "`{$filePath}`\n*{$reason}*",
                    'inline' => false,
                ];
            }

            if ($detectionsCount > 10) {
                $fields[] = [
                    'name' => 'Additional Detections',
                    'value' => 'And ' . ($detectionsCount - 10) . ' more detection(s)...',
                    'inline' => false,
                ];
            }

            // Build embed
            $embed = [
                'title' => '⚠️ FeatherZeroTrust Detection Alert',
                'description' => $description,
                'color' => $color,
                'fields' => $fields,
                'timestamp' => date('c'),
                'footer' => [
                    'text' => 'FeatherZeroTrust Scanner',
                ],
            ];

            // Build webhook payload
            $payload = [
                'embeds' => [$embed],
            ];

            // Send webhook
            $request = new Request('POST', $webhookUrl, [
                'Content-Type' => 'application/json',
            ], json_encode($payload));

            $response = $this->httpClient->send($request);
            $statusCode = $response->getStatusCode();

            if ($statusCode >= 200 && $statusCode < 300) {
                return true;
            }

            App::getInstance(true)->getLogger()->warning("FeatherZeroTrust webhook returned status code: {$statusCode}");

            return false;
        } catch (RequestException $e) {
            App::getInstance(true)->getLogger()->error('FeatherZeroTrust webhook failed: ' . $e->getMessage());

            return false;
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('FeatherZeroTrust webhook error: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Send a webhook notification for batch scan results.
     *
     * @param array<string, mixed> $results Batch scan results
     * @param int $totalScanned Total servers scanned
     * @param int $totalDetections Total detections found
     *
     * @return bool Success status
     */
    public function sendBatchScanWebhook(array $results, int $totalScanned, int $totalDetections): bool
    {
        $configData = $this->config->getAll();

        // Check if webhooks are enabled
        if (!$configData['webhook_enabled'] || empty($configData['webhook_url'])) {
            return false;
        }

        // Don't send webhook if batch scan is clean (no detections)
        if ($totalDetections === 0) {
            return false;
        }

        $webhookUrl = $configData['webhook_url'];

        // Validate webhook URL
        if (!filter_var($webhookUrl, FILTER_VALIDATE_URL)) {
            App::getInstance(true)->getLogger()->warning('Invalid webhook URL configured for FeatherZeroTrust');

            return false;
        }

        try {
            $color = 15158332; // Red for detections

            // Build description
            $description = "**Batch Scan Completed**\n";
            $description .= "**Servers Scanned:** {$totalScanned}\n";
            $description .= "**Total Detections:** {$totalDetections}\n";

            // Build fields for servers with detections
            $fields = [];
            $serversWithDetections = 0;
            foreach ($results as $result) {
                $detectionsCount = count($result['detections'] ?? []);
                if ($detectionsCount > 0) {
                    ++$serversWithDetections;
                    $serverName = $result['server_name'] ?? $result['server_uuid'] ?? 'Unknown';
                    $fields[] = [
                        'name' => $serverName,
                        'value' => "{$detectionsCount} detection(s) found",
                        'inline' => true,
                    ];
                }
            }

            // Build embed
            $embed = [
                'title' => '⚠️ FeatherZeroTrust Batch Scan Alert',
                'description' => $description,
                'color' => $color,
                'fields' => array_slice($fields, 0, 25), // Discord limit
                'timestamp' => date('c'),
                'footer' => [
                    'text' => 'FeatherZeroTrust Scanner',
                ],
            ];

            // Build webhook payload
            $payload = [
                'embeds' => [$embed],
            ];

            // Send webhook
            $request = new Request('POST', $webhookUrl, [
                'Content-Type' => 'application/json',
            ], json_encode($payload));

            $response = $this->httpClient->send($request);
            $statusCode = $response->getStatusCode();

            if ($statusCode >= 200 && $statusCode < 300) {
                return true;
            }

            App::getInstance(true)->getLogger()->warning("FeatherZeroTrust batch webhook returned status code: {$statusCode}");

            return false;
        } catch (RequestException $e) {
            App::getInstance(true)->getLogger()->error('FeatherZeroTrust batch webhook failed: ' . $e->getMessage());

            return false;
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('FeatherZeroTrust batch webhook error: ' . $e->getMessage());

            return false;
        }
    }
}
