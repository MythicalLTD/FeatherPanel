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

namespace App\Controllers\Admin;

use App\App;
use GuzzleHttp\Client;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class AffiliatesController
{
    private const AFFILIATES_URL = 'https://api.featherpanel.com/affiliates.json';

    public function list(Request $request): Response
    {
        try {
            $client = new Client([
                'timeout' => 8,
                'connect_timeout' => 5,
                'http_errors' => false,
            ]);

            $response = $client->get(self::AFFILIATES_URL, [
                'headers' => [
                    'Accept' => 'application/json',
                    'User-Agent' => 'FeatherPanel-Affiliates/1.0',
                ],
            ]);

            $statusCode = $response->getStatusCode();
            if ($statusCode < 200 || $statusCode >= 300) {
                return ApiResponse::error('Failed to fetch affiliates feed', 'AFFILIATES_FETCH_FAILED', 502);
            }

            $decoded = json_decode((string) $response->getBody(), true);
            if (!is_array($decoded)) {
                return ApiResponse::error('Invalid affiliates payload', 'AFFILIATES_INVALID_PAYLOAD', 502);
            }

            $affiliates = $this->normalizeAffiliates($decoded);

            return ApiResponse::success([
                'affiliates' => $affiliates,
                'source' => self::AFFILIATES_URL,
                'total' => count($affiliates),
            ], 'Affiliates fetched successfully', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning('Affiliates feed fetch failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch affiliates feed', 'AFFILIATES_FETCH_FAILED', 502);
        }
    }

    /**
     * Normalize supported payload formats into a flat affiliates list.
     *
     * Supported examples:
     * - {"affiliate": {...}}
     * - {"affiliates": [{...}, {...}]}
     * - [{...}, {...}]
     */
    private function normalizeAffiliates(array $payload): array
    {
        if (isset($payload['affiliate']) && is_array($payload['affiliate'])) {
            return [$payload['affiliate']];
        }

        if (isset($payload['affiliates']) && is_array($payload['affiliates'])) {
            return array_values(array_filter($payload['affiliates'], static fn ($item) => is_array($item)));
        }

        if (array_is_list($payload)) {
            return array_values(array_filter($payload, static fn ($item) => is_array($item)));
        }

        if (isset($payload['name']) && isset($payload['url'])) {
            return [$payload];
        }

        return [];
    }
}
