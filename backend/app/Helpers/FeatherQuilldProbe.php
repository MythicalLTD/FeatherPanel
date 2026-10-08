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

use GuzzleHttp\Client;

/**
 * Probes FeatherQuilld daemon HTTP endpoints from the panel.
 */
class FeatherQuilldProbe
{
    public const DEFAULT_TIMEOUT = 5;

    /**
     * Probe GET /api/system/health on a FeatherQuilld web node.
     *
     * @param array<string, mixed> $webNode decrypted web node row (daemon_token_id + daemon_token)
     *
     * @return array{status: string, http_status: ?int, daemon: ?array<string, mixed>, error: ?string}
     */
    public static function probeHealth(array $webNode, int $timeout = self::DEFAULT_TIMEOUT): array
    {
        $baseUrl = WingsUrlHelper::buildFromNode($webNode);
        $tokenId = trim((string) ($webNode['daemon_token_id'] ?? ''));
        $token = trim((string) ($webNode['daemon_token'] ?? ''));

        if ($tokenId === '' || $token === '') {
            return [
                'status' => 'unhealthy',
                'http_status' => null,
                'daemon' => null,
                'error' => 'Web node is missing daemon credentials',
            ];
        }

        $bearer = $tokenId . '.' . $token;

        try {
            $client = new Client([
                'timeout' => $timeout,
                'connect_timeout' => min(3, $timeout),
                'verify' => false,
                'http_errors' => false,
            ]);

            $response = $client->get(rtrim($baseUrl, '/') . '/api/system/health', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $bearer,
                    'Accept' => 'application/json',
                    'User-Agent' => 'FeatherPanel/v1.0.0',
                ],
            ]);

            $statusCode = $response->getStatusCode();
            $body = json_decode((string) $response->getBody(), true);
            $daemon = is_array($body) ? $body : null;

            if ($statusCode >= 200 && $statusCode < 300) {
                $daemonStatus = is_array($daemon) ? strtolower((string) ($daemon['status'] ?? 'healthy')) : 'healthy';

                return [
                    'status' => $daemonStatus === 'healthy' ? 'healthy' : 'unhealthy',
                    'http_status' => $statusCode,
                    'daemon' => $daemon,
                    'error' => $daemonStatus === 'healthy' ? null : 'Daemon reported non-healthy status',
                ];
            }

            return [
                'status' => 'unhealthy',
                'http_status' => $statusCode,
                'daemon' => $daemon,
                'error' => 'Daemon returned HTTP ' . $statusCode,
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 'unhealthy',
                'http_status' => null,
                'daemon' => null,
                'error' => $e->getMessage(),
            ];
        }
    }
}
