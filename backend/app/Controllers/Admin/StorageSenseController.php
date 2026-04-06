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

use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\StorageSense\StorageSenseService;

class StorageSenseController
{
    private const MIN_RETENTION_DAYS = 7;

    private const MAX_RETENTION_DAYS = 3650;

    private const MAX_BATCH_TARGETS = 12;

    #[OA\Get(
        path: '/api/admin/storage-sense',
        summary: 'Storage Sense summary',
        description: 'Row counts and how many rows would be removed for a retention period.',
        tags: ['Admin - Storage Sense'],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 400, description: 'Bad request'),
        ]
    )]
    public function summary(Request $request): Response
    {
        $days = (int) $request->query->get('days_old', 90);
        if ($days < self::MIN_RETENTION_DAYS || $days > self::MAX_RETENTION_DAYS) {
            return ApiResponse::error(
                'days_old must be between ' . self::MIN_RETENTION_DAYS . ' and ' . self::MAX_RETENTION_DAYS,
                'INVALID_RETENTION_DAYS',
                400,
            );
        }

        $categories = StorageSenseService::summarize($days);
        $totals = self::buildTotals($categories);
        $disk = StorageSenseService::getPanelLogsDirectoryInfo();

        return ApiResponse::success([
            'days_old' => $days,
            'categories' => $categories,
            'totals' => $totals,
            'disk' => $disk,
        ], 'Storage Sense summary', 200);
    }

    #[OA\Post(
        path: '/api/admin/storage-sense/purge',
        summary: 'Purge old rows',
        tags: ['Admin - Storage Sense'],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 400, description: 'Bad request'),
        ]
    )]
    public function purge(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_REQUEST', 400);
        }

        $target = isset($data['target']) && is_string($data['target']) ? trim($data['target']) : '';
        $days = isset($data['days_old']) ? (int) $data['days_old'] : 0;

        if (!in_array($target, StorageSenseService::allowedTargets(), true)) {
            return ApiResponse::error('Unknown purge target', 'INVALID_TARGET', 400);
        }

        if ($days < self::MIN_RETENTION_DAYS || $days > self::MAX_RETENTION_DAYS) {
            return ApiResponse::error(
                'days_old must be between ' . self::MIN_RETENTION_DAYS . ' and ' . self::MAX_RETENTION_DAYS,
                'INVALID_RETENTION_DAYS',
                400,
            );
        }

        $result = StorageSenseService::purge($target, $days);
        if ($result === null) {
            return ApiResponse::error('This target is not available on this installation.', 'TARGET_UNAVAILABLE', 404);
        }

        self::logPurgeActivity($request, 'single:' . $target . ',deleted=' . $result['deleted']);

        return ApiResponse::success([
            'target' => $target,
            'days_old' => $days,
            'deleted' => $result['deleted'],
        ], 'Purge completed', 200);
    }

    #[OA\Post(
        path: '/api/admin/storage-sense/purge-batch',
        summary: 'Purge multiple targets',
        tags: ['Admin - Storage Sense'],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 400, description: 'Bad request'),
        ]
    )]
    public function purgeBatch(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_REQUEST', 400);
        }

        $targets = $data['targets'] ?? null;
        if (!is_array($targets) || $targets === []) {
            return ApiResponse::error('targets must be a non-empty array', 'INVALID_TARGETS', 400);
        }

        if (count($targets) > self::MAX_BATCH_TARGETS) {
            return ApiResponse::error('Too many targets (max ' . self::MAX_BATCH_TARGETS . ')', 'BATCH_TOO_LARGE', 400);
        }

        $days = isset($data['days_old']) ? (int) $data['days_old'] : 0;
        if ($days < self::MIN_RETENTION_DAYS || $days > self::MAX_RETENTION_DAYS) {
            return ApiResponse::error(
                'days_old must be between ' . self::MIN_RETENTION_DAYS . ' and ' . self::MAX_RETENTION_DAYS,
                'INVALID_RETENTION_DAYS',
                400,
            );
        }

        $results = StorageSenseService::purgeBatch($targets, $days);
        $deletedTotal = 0;
        foreach ($results as $r) {
            if (!empty($r['success'])) {
                $deletedTotal += (int) $r['deleted'];
            }
        }

        self::logPurgeActivity(
            $request,
            'batch:deleted_total=' . $deletedTotal . ',details=' . json_encode($results),
        );

        return ApiResponse::success([
            'days_old' => $days,
            'results' => $results,
            'deleted_total' => $deletedTotal,
        ], 'Batch purge completed', 200);
    }

    /**
     * @param array<int, array<string, mixed>> $categories
     *
     * @return array<string, int>
     */
    private static function buildTotals(array $categories): array
    {
        $available = array_values(array_filter($categories, fn ($c) => !empty($c['available'])));

        return [
            'tables_tracked' => count($available),
            'total_rows' => (int) array_sum(array_column($available, 'row_count')),
            'total_purgeable' => (int) array_sum(array_column($available, 'purgeable_count')),
            'approx_data_bytes' => (int) array_sum(array_column($available, 'approx_data_bytes')),
        ];
    }

    private static function logPurgeActivity(Request $request, string $context): void
    {
        $user = $request->get('user');
        if (is_array($user) && isset($user['uuid']) && is_string($user['uuid'])) {
            Activity::createActivity([
                'user_uuid' => $user['uuid'],
                'name' => 'admin.storage_sense_purge',
                'context' => $context,
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);
        }
    }
}
