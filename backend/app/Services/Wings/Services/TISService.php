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

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsResponse;
use App\Services\Wings\WingsConnection;

/**
 * TIS (Thread Intelligence Server) Service for Wings API.
 *
 * Handles all TIS-related API endpoints including:
 * - Hash submission and tracking
 * - Hash checking against confirmed database
 * - Server status checking
 * - Statistics retrieval
 */
class TISService
{
    private WingsConnection $connection;

    /**
     * Create a new TISService instance.
     */
    public function __construct(WingsConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * Submit a hash for tracking.
     *
     * @param string $hash SHA-256 hash string
     * @param string $fileName File name
     * @param string $detectionType Detection type (e.g., "trojan", "virus", "suspicious")
     * @param string $serverIdentifier Server UUID or identifier
     * @param array<string, mixed> $metadata Additional metadata
     *
     * @return WingsResponse Response with success status and detection count
     */
    public function submitHash(
        string $hash,
        string $fileName,
        string $detectionType,
        string $serverIdentifier,
        array $metadata = [],
    ): WingsResponse {
        try {
            $data = [
                'hash' => $hash,
                'fileName' => $fileName,
                'detectionType' => $detectionType,
                'serverIdentifier' => $serverIdentifier,
                'metadata' => $metadata,
            ];

            $response = $this->connection->post('/api/tis/hashes', $data);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get confirmed malicious hashes.
     *
     * @return WingsResponse Array of confirmed hashes
     */
    public function getHashes(): WingsResponse
    {
        try {
            $response = $this->connection->get('/api/tis/hashes');

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Check server status.
     *
     * @param string $serverId Server UUID or identifier
     *
     * @return WingsResponse Server status information
     */
    public function checkServer(string $serverId): WingsResponse
    {
        try {
            $response = $this->connection->get("/api/tis/servers/{$serverId}");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get TIS statistics.
     *
     * @return WingsResponse Statistics about the TIS database
     */
    public function getStats(): WingsResponse
    {
        try {
            $response = $this->connection->get('/api/tis/stats');

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Check multiple hashes against confirmed database.
     *
     * @param array<string> $hashes Array of SHA-256 hashes (max 1000)
     *
     * @return WingsResponse Matches found in the database
     */
    public function checkHashes(array $hashes): WingsResponse
    {
        try {
            if (count($hashes) > 1000) {
                return new WingsResponse(['error' => 'Maximum 1000 hashes per request'], 400);
            }

            $data = [
                'hashes' => $hashes,
            ];

            $response = $this->connection->post('/api/tis/check/hashes', $data);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }
}
