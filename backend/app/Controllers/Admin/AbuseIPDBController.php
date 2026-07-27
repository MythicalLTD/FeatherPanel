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
use App\Chat\Database;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Services\AbuseIPDB\AbuseIPDBService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class AbuseIPDBController
{
    #[OA\Get(
        path: '/api/admin/abuseipdb/status',
        summary: 'AbuseIPDB integration status',
        description: 'Returns whether AbuseIPDB is enabled and configured (API key presence only, never the key).',
        tags: ['Admin - AbuseIPDB'],
        responses: [
            new OA\Response(response: 200, description: 'Status retrieved'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function status(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();
        $enabled = $config->getSetting(ConfigInterface::ABUSEIPDB_ENABLED, 'false') === 'true';
        $hasKey = trim((string) $config->getSetting(ConfigInterface::ABUSEIPDB_API_KEY, '')) !== '';

        return ApiResponse::success([
            'enabled' => $enabled,
            'configured' => $enabled && $hasKey,
            'has_api_key' => $hasKey,
            'check_on_register' => $config->getSetting(ConfigInterface::ABUSEIPDB_CHECK_ON_REGISTER, 'false') === 'true',
            'min_confidence_score' => (int) $config->getSetting(ConfigInterface::ABUSEIPDB_MIN_CONFIDENCE_SCORE, '75'),
            'max_age_days' => (int) $config->getSetting(ConfigInterface::ABUSEIPDB_MAX_AGE_DAYS, '90'),
            'register_action' => $config->getSetting(ConfigInterface::ABUSEIPDB_REGISTER_ACTION, 'block'),
            'categories' => AbuseIPDBService::CATEGORIES,
        ], 'AbuseIPDB status retrieved', 200);
    }

    #[OA\Get(
        path: '/api/admin/abuseipdb/categories',
        summary: 'List AbuseIPDB report categories',
        tags: ['Admin - AbuseIPDB'],
        responses: [
            new OA\Response(response: 200, description: 'Categories retrieved'),
        ]
    )]
    public function categories(Request $request): Response
    {
        return ApiResponse::success([
            'categories' => AbuseIPDBService::CATEGORIES,
        ], 'AbuseIPDB categories retrieved', 200);
    }

    #[OA\Get(
        path: '/api/admin/abuseipdb/check',
        summary: 'Check a single IP against AbuseIPDB',
        tags: ['Admin - AbuseIPDB'],
        parameters: [
            new OA\Parameter(name: 'ip', in: 'query', required: true, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'max_age_days', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'verbose', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Check completed'),
            new OA\Response(response: 400, description: 'Invalid request or not configured'),
        ]
    )]
    public function check(Request $request): Response
    {
        $service = new AbuseIPDBService();
        if (!$service->isConfigured()) {
            return ApiResponse::error(
                'AbuseIPDB is not enabled or the API key is missing. Configure it under Admin → Settings → Security.',
                'ABUSEIPDB_NOT_CONFIGURED',
                400
            );
        }

        $ip = trim((string) $request->query->get('ip', ''));
        if ($ip === '') {
            return ApiResponse::error('IP address is required', 'IP_REQUIRED', 400);
        }

        $maxAge = $request->query->get('max_age_days');
        $maxAgeDays = $maxAge !== null && $maxAge !== '' ? (int) $maxAge : null;
        $verbose = filter_var($request->query->get('verbose', false), FILTER_VALIDATE_BOOLEAN);

        $result = $service->check($ip, $maxAgeDays, $verbose);
        if (!$result['success']) {
            return ApiResponse::error(
                $result['error'] ?? 'AbuseIPDB check failed',
                'ABUSEIPDB_CHECK_FAILED',
                (int) ($result['status'] ?? 502),
                ['rate_limit' => $result['rate_limit'] ?? null]
            );
        }

        return ApiResponse::success([
            'ip' => $ip,
            'result' => $result['data'],
            'rate_limit' => $result['rate_limit'] ?? null,
        ], 'IP checked successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/abuseipdb/scan',
        summary: 'Scan panel users against AbuseIPDB',
        description: 'Checks unique public first_ip/last_ip values for non-deleted users in batches to respect API rate limits.',
        tags: ['Admin - AbuseIPDB'],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'offset', type: 'integer', default: 0),
                    new OA\Property(property: 'limit', type: 'integer', default: 25, maximum: 50),
                    new OA\Property(property: 'min_score', type: 'integer', description: 'Override configured minimum confidence score'),
                    new OA\Property(property: 'max_age_days', type: 'integer'),
                    new OA\Property(property: 'only_flagged', type: 'boolean', default: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Scan batch completed'),
            new OA\Response(response: 400, description: 'Not configured'),
        ]
    )]
    public function scan(Request $request): Response
    {
        $service = new AbuseIPDBService();
        if (!$service->isConfigured()) {
            return ApiResponse::error(
                'AbuseIPDB is not enabled or the API key is missing. Configure it under Admin → Settings → Security.',
                'ABUSEIPDB_NOT_CONFIGURED',
                400
            );
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            $body = [];
        }

        $config = App::getInstance(true)->getConfig();
        $offset = max(0, (int) ($body['offset'] ?? 0));
        $limit = (int) ($body['limit'] ?? 25);
        if ($limit < 1) {
            $limit = 1;
        }
        if ($limit > 50) {
            $limit = 50;
        }

        $minScore = isset($body['min_score'])
            ? (int) $body['min_score']
            : (int) $config->getSetting(ConfigInterface::ABUSEIPDB_MIN_CONFIDENCE_SCORE, '75');
        $minScore = max(0, min(100, $minScore));

        $maxAgeDays = isset($body['max_age_days'])
            ? (int) $body['max_age_days']
            : (int) $config->getSetting(ConfigInterface::ABUSEIPDB_MAX_AGE_DAYS, '90');
        $maxAgeDays = max(1, min(365, $maxAgeDays));

        $onlyFlagged = array_key_exists('only_flagged', $body)
            ? filter_var($body['only_flagged'], FILTER_VALIDATE_BOOLEAN)
            : true;

        $ipIndex = $this->buildPublicIpUserIndex();
        $uniqueIps = array_keys($ipIndex);
        sort($uniqueIps);
        $totalIps = count($uniqueIps);
        $batchIps = array_slice($uniqueIps, $offset, $limit);

        $checked = [];
        $flagged = [];
        $errors = [];
        $rateLimit = null;
        $stoppedEarly = false;

        foreach ($batchIps as $ip) {
            $result = $service->check($ip, $maxAgeDays, false);
            if (isset($result['rate_limit'])) {
                $rateLimit = $result['rate_limit'];
            }

            if (!$result['success']) {
                $errors[] = [
                    'ip' => $ip,
                    'error' => $result['error'] ?? 'Check failed',
                    'status' => $result['status'] ?? null,
                ];
                // Stop batch on rate limit
                if ((int) ($result['status'] ?? 0) === 429) {
                    $stoppedEarly = true;
                    break;
                }
                continue;
            }

            $data = $result['data'] ?? [];
            $score = (int) ($data['abuseConfidenceScore'] ?? 0);
            $totalReports = (int) ($data['totalReports'] ?? 0);
            $entry = [
                'ip' => $ip,
                'abuse_confidence_score' => $score,
                'total_reports' => $totalReports,
                'country_code' => $data['countryCode'] ?? null,
                'isp' => $data['isp'] ?? null,
                'usage_type' => $data['usageType'] ?? null,
                'is_tor' => (bool) ($data['isTor'] ?? false),
                'last_reported_at' => $data['lastReportedAt'] ?? null,
                'users' => $ipIndex[$ip] ?? [],
                'flagged' => $score >= $minScore,
            ];

            $checked[] = $entry;
            if ($entry['flagged']) {
                $flagged[] = $entry;
            }
        }

        $nextOffset = $offset + count($batchIps);
        $hasMore = !$stoppedEarly && $nextOffset < $totalIps;

        return ApiResponse::success([
            'min_score' => $minScore,
            'max_age_days' => $maxAgeDays,
            'offset' => $offset,
            'limit' => $limit,
            'next_offset' => $hasMore ? $nextOffset : null,
            'has_more' => $hasMore,
            'stopped_early' => $stoppedEarly,
            'total_unique_ips' => $totalIps,
            'batch_size' => count($batchIps),
            'checked_count' => count($checked),
            'flagged_count' => count($flagged),
            'results' => $onlyFlagged ? $flagged : $checked,
            'all_checked' => $onlyFlagged ? $checked : null,
            'errors' => $errors,
            'rate_limit' => $rateLimit,
        ], 'AbuseIPDB user scan batch completed', 200);
    }

    /**
     * @return array<string, list<array{uuid: string, username: string, email: string, banned: string, matched_fields: list<string>}>>
     */
    private function buildPublicIpUserIndex(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query(
            "SELECT uuid, username, email, banned, first_ip, last_ip
             FROM featherpanel_users
             WHERE deleted = 'false'"
        );
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $index = [];
        foreach ($rows as $row) {
            $matches = [];
            foreach (['first_ip', 'last_ip'] as $field) {
                $ip = trim((string) ($row[$field] ?? ''));
                if ($ip === '' || !AbuseIPDBService::isPublicIp($ip)) {
                    continue;
                }
                if (!isset($matches[$ip])) {
                    $matches[$ip] = [];
                }
                $matches[$ip][] = $field;
            }

            foreach ($matches as $ip => $fields) {
                if (!isset($index[$ip])) {
                    $index[$ip] = [];
                }
                $index[$ip][] = [
                    'uuid' => $row['uuid'],
                    'username' => $row['username'],
                    'email' => $row['email'],
                    'banned' => $row['banned'],
                    'matched_fields' => array_values(array_unique($fields)),
                ];
            }
        }

        return $index;
    }
}
