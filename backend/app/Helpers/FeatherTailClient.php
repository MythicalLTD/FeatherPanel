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
        return self::requestJson($vmNode, 'GET', '/api/v1/system/health', null, $timeout);
    }

    /**
     * @param array<string, mixed> $vmNode decrypted VM node row
     *
     * @return array{status: string, http_status: ?int, body: ?array<string, mixed>, error: ?string, url: string}
     */
    public static function diagnostics(array $vmNode, int $timeout = self::DEFAULT_TIMEOUT): array
    {
        return self::requestJson($vmNode, 'GET', '/api/v1/system/diagnostics', null, $timeout);
    }

    /**
     * @param array<string, mixed> $vmNode
     *
     * @return array{status: string, http_status: ?int, body: ?array<string, mixed>, error: ?string, url: string}
     */
    public static function listLeases(array $vmNode, int $timeout = self::DEFAULT_TIMEOUT): array
    {
        return self::requestJson($vmNode, 'GET', '/api/v1/dhcp/leases', null, $timeout);
    }

    /**
     * @param array<string, mixed> $vmNode
     * @param array<string, mixed> $payload AssignLeaseRequest fields
     *
     * @return array{status: string, http_status: ?int, body: ?array<string, mixed>, error: ?string, url: string}
     */
    public static function assignLease(array $vmNode, array $payload, int $timeout = 15): array
    {
        return self::requestJson($vmNode, 'POST', '/api/v1/dhcp/leases', $payload, $timeout);
    }

    /**
     * @param array<string, mixed> $vmNode
     *
     * @return array{status: string, http_status: ?int, body: ?array<string, mixed>, error: ?string, url: string}
     */
    public static function deleteLeaseByVmid(array $vmNode, int $vmid, int $timeout = self::DEFAULT_TIMEOUT): array
    {
        return self::requestJson($vmNode, 'DELETE', '/api/v1/dhcp/leases/vm/' . $vmid, null, $timeout);
    }

    /**
     * @param array<string, mixed> $vmNode
     *
     * @return array{status: string, http_status: ?int, body: ?array<string, mixed>, error: ?string, url: string}
     */
    public static function setLxcRootPassword(array $vmNode, int $vmid, string $password, int $timeout = 30): array
    {
        return self::requestJson(
            $vmNode,
            'POST',
            '/api/v1/containers/' . $vmid . '/root-password',
            ['password' => $password],
            $timeout
        );
    }

    /**
     * @param array<string, mixed> $vmNode
     * @param array<string, mixed>|null $jsonBody
     *
     * @return array{status: string, http_status: ?int, body: ?array<string, mixed>, error: ?string, url: string}
     */
    private static function requestJson(
        array $vmNode,
        string $method,
        string $path,
        ?array $jsonBody,
        int $timeout
    ): array {
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
                'connect_timeout' => min(5, $timeout),
                'verify' => !$tlsNoVerify,
                'http_errors' => false,
            ]);

            $options = [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept' => 'application/json',
                    'User-Agent' => 'FeatherPanel/v1.0.0',
                ],
            ];
            if ($jsonBody !== null) {
                $options['json'] = $jsonBody;
                $options['headers']['Content-Type'] = 'application/json';
            }

            $response = $client->request(strtoupper($method), $url, $options);
            $statusCode = $response->getStatusCode();
            $decoded = json_decode((string) $response->getBody(), true);
            $body = is_array($decoded) ? $decoded : null;

            if ($statusCode >= 200 && $statusCode < 300) {
                // Health endpoints use status=ok|healthy; lease endpoints return data without that field.
                if (isset($body['status']) && is_string($body['status'])) {
                    $agentStatus = strtolower($body['status']);
                    if (in_array($agentStatus, ['ok', 'healthy'], true)) {
                        return [
                            'status' => 'healthy',
                            'http_status' => $statusCode,
                            'body' => $body,
                            'error' => null,
                            'url' => $url,
                        ];
                    }
                    if (in_array($agentStatus, ['error', 'unhealthy'], true)) {
                        return [
                            'status' => 'unhealthy',
                            'http_status' => $statusCode,
                            'body' => $body,
                            'error' => 'FeatherTail reported non-healthy status',
                            'url' => $url,
                        ];
                    }
                }

                return [
                    'status' => 'healthy',
                    'http_status' => $statusCode,
                    'body' => $body,
                    'error' => null,
                    'url' => $url,
                ];
            }

            $error = 'FeatherTail returned HTTP ' . $statusCode;
            if ($statusCode === 401) {
                $error = 'Unauthorized — FeatherTail token does not match /etc/feathertail/feathertail.toml';
            } elseif ($statusCode === 503) {
                $error = 'FeatherTail DHCP is disabled (enable dhcp in feathertail.toml)';
            } elseif (is_array($body) && isset($body['error']) && is_string($body['error']) && $body['error'] !== '') {
                $error = $body['error'];
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
