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
 * HTTP client for the FeatherTail Proxmox host agent.
 */
class FeatherTailClient
{
    public const DEFAULT_TIMEOUT = 8;

    /**
     * @param array<string, mixed> $vmNode decrypted VM node row
     *
     * @return array{status: string, http_status: ?int, body: ?array<string, mixed>, error: ?string, url: string}
     */
    public static function health(array $vmNode, int $timeout = self::DEFAULT_TIMEOUT): array
    {
        return self::getJson($vmNode, '/api/v1/system/health', $timeout);
    }

    /**
     * @param array<string, mixed> $vmNode decrypted VM node row
     *
     * @return array{status: string, http_status: ?int, body: ?array<string, mixed>, error: ?string, url: string}
     */
    public static function diagnostics(array $vmNode, int $timeout = self::DEFAULT_TIMEOUT): array
    {
        return self::getJson($vmNode, '/api/v1/system/diagnostics', $timeout);
    }

    /**
     * @param array<string, mixed> $vmNode
     *
     * @return array{status: string, http_status: ?int, body: ?array<string, mixed>, error: ?string, url: string}
     */
    private static function getJson(array $vmNode, string $path, int $timeout): array
    {
        $baseUrl = trim((string) ($vmNode['feathertail_url'] ?? ''));
        $token = trim((string) ($vmNode['feathertail_token'] ?? ''));
        $tlsNoVerify = !empty($vmNode['feathertail_tls_no_verify']);

        if ($baseUrl === '') {
            return [
                'status' => 'unhealthy',
                'http_status' => null,
                'body' => null,
                'error' => 'FeatherTail URL is not configured on this VDS node',
                'url' => '',
            ];
        }

        if ($token === '') {
            return [
                'status' => 'unhealthy',
                'http_status' => null,
                'body' => null,
                'error' => 'FeatherTail token is missing — open the FeatherTail tab and run setup / reset token',
                'url' => rtrim($baseUrl, '/') . $path,
            ];
        }

        $url = rtrim($baseUrl, '/') . $path;

        try {
            $client = new Client([
                'timeout' => $timeout,
                'connect_timeout' => min(3, $timeout),
                'verify' => !$tlsNoVerify,
                'http_errors' => false,
            ]);

            $response = $client->get($url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept' => 'application/json',
                    'User-Agent' => 'FeatherPanel/v1.0.0',
                ],
            ]);

            $statusCode = $response->getStatusCode();
            $decoded = json_decode((string) $response->getBody(), true);
            $body = is_array($decoded) ? $decoded : null;

            if ($statusCode >= 200 && $statusCode < 300) {
                $agentStatus = is_array($body) ? strtolower((string) ($body['status'] ?? 'ok')) : 'ok';
                $healthy = in_array($agentStatus, ['ok', 'healthy'], true);

                return [
                    'status' => $healthy ? 'healthy' : 'unhealthy',
                    'http_status' => $statusCode,
                    'body' => $body,
                    'error' => $healthy ? null : 'FeatherTail reported non-healthy status',
                    'url' => $url,
                ];
            }

            $error = 'FeatherTail returned HTTP ' . $statusCode;
            if ($statusCode === 401) {
                $error = 'Unauthorized — FeatherTail token does not match /etc/feathertail/feathertail.toml';
            }

            return [
                'status' => 'unhealthy',
                'http_status' => $statusCode,
                'body' => $body,
                'error' => $error,
                'url' => $url,
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 'unhealthy',
                'http_status' => null,
                'body' => null,
                'error' => $e->getMessage(),
                'url' => $url,
            ];
        }
    }
}
