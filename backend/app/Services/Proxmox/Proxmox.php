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

namespace App\Services\Proxmox;

use App\App;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

/**
 * Minimal Proxmox VE API client used for connectivity checks.
 *
 * This client currently focuses on a lightweight "ping" style check by
 * calling the /api2/json/nodes endpoint with a PVEAPIToken.
 */
class Proxmox
{
    private Client $client;
    private string $baseUrl;
    private string $tokenHeader;

    /**
     * @param string $host Proxmox hostname or IP
     * @param int $port Proxmox API port (default 8006, or 443 if proxied)
     * @param string $scheme http or https
     * @param string $user Proxmox user, e.g. root@pam or apiuser@pve
     * @param string $tokenId Token ID (part after user, before = in PVEAPIToken)
     * @param string $secret Token secret
     * @param bool $tlsNoVerify Whether to skip TLS verification
     * @param int $timeout Timeout in seconds
     */
    public function __construct(
        string $host,
        int $port,
        string $scheme,
        string $user,
        string $tokenId,
        string $secret,
        bool $tlsNoVerify,
        int $timeout = 10,
    ) {
        // Keep base_uri at the host/port only; always send full API paths in requests.
        // This avoids Guzzle path resolution quirks that were dropping the /json formatter segment.
        $this->baseUrl = sprintf('%s://%s:%d', $scheme, $host, $port);

        $this->tokenHeader = sprintf(
            'PVEAPIToken=%s!%s=%s',
            $user,
            $tokenId,
            $secret,
        );

        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => $timeout,
            'verify' => !$tlsNoVerify,
            'headers' => [
                'Authorization' => $this->tokenHeader,
                'Accept' => 'application/json',
                'User-Agent' => 'FeatherPanel-Proxmox-Client',
            ],
        ]);
    }

    /**
     * Perform a lightweight connectivity check against /nodes.
     *
     * @param array<string, string> $extraHeaders additional headers to send for this check
     * @param array<string, string|int|float> $extraQuery additional query parameters to send
     *
     * @return array{
     *     ok: bool,
     *     status_code: int|null,
     *     error: string|null,
     *     nodes: array<int, mixed>,
     *     latency_ms?: int
     * }
     */
    public function testConnection(array $extraHeaders = [], array $extraQuery = []): array
    {
        try {
            $start = microtime(true);

            $options = [];
            if (!empty($extraQuery)) {
                $options['query'] = $extraQuery;
            }
            if (!empty($extraHeaders)) {
                $options['headers'] = $extraHeaders;
            }

            // Always use the full Proxmox API path with the json formatter.
            $response = $this->client->get('/api2/json/nodes', $options);
            $durationMs = (int) round((microtime(true) - $start) * 1000);
            $statusCode = $response->getStatusCode();

            if ($statusCode >= 200 && $statusCode < 300) {
                $body = json_decode((string) $response->getBody(), true);
                $nodes = [];
                if (is_array($body) && isset($body['data']) && is_array($body['data'])) {
                    $nodes = $body['data'];
                }

                return [
                    'ok' => true,
                    'status_code' => $statusCode,
                    'error' => null,
                    'nodes' => $nodes,
                    'latency_ms' => $durationMs,
                ];
            }

            return [
                'ok' => false,
                'status_code' => $statusCode,
                'error' => 'Unexpected status code from Proxmox: ' . $statusCode,
                'nodes' => [],
            ];
        } catch (GuzzleException $e) {
            $statusCode = null;
            $rawBody = null;
            $decodedBody = null;

            // Try to extract as much detail as possible from the Proxmox reply.
            if (method_exists($e, 'getResponse')) {
                $response = $e->getResponse();
                if ($response !== null) {
                    $statusCode = $response->getStatusCode();
                    $rawBody = (string) $response->getBody();

                    $decoded = json_decode($rawBody, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $decodedBody = $decoded;
                    }
                }
            }

            App::getInstance(true)->getLogger()->error(
                'Proxmox connection test failed: ' . $e->getMessage() .
                ($statusCode !== null ? ' (status ' . $statusCode . ')' : '') .
                ($rawBody ? ' body: ' . substr($rawBody, 0, 1000) : '')
            );

            return [
                'ok' => false,
                'status_code' => $statusCode,
                'error' => $e->getMessage(),
                'nodes' => [],
                'response_body_raw' => $rawBody,
                'response_body_json' => $decodedBody,
            ];
        }
    }
}
