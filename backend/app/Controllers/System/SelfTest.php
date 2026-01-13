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

namespace App\Controllers\System;

use App\Cache\Cache;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'SelftestResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'status', type: 'string', description: 'Overall system status'),
        new OA\Property(property: 'checks', type: 'object', description: 'Individual check results'),
        new OA\Property(property: 'timestamp', type: 'integer', description: 'This check timestamp'),
        new OA\Property(property: 'cached', type: 'boolean', description: 'If the response is cached'),
    ]
)]
class SelfTest
{
    #[OA\Get(
        path: '/api/selftest',
        summary: 'Selftest',
        description: 'Runs a selftest to check if the system is working correctly. Response is cached for 1 hour.',
        tags: ['System - Selftest'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Selftest information retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/SelftestResponse')
            ),
        ]
    )]
    public function getSelfTest(Request $request): Response
    {
        $cacheKey = 'system_self_test';
        if (Cache::exists($cacheKey)) {
            $data = Cache::get($cacheKey);
            $data['cached'] = true;

            return ApiResponse::success($data, 'System is healthy (cached)', 200);
        }

        $checks = [];
        $hasErrors = false;

        // Redis Check
        try {
            $redis = new \App\FastChat\Redis();
            if ($redis->testConnection()) {
                $checks['redis'] = ['status' => true, 'message' => 'Successful'];
            } else {
                $checks['redis'] = ['status' => false, 'message' => 'Failed'];
                $hasErrors = true;
            }
        } catch (\Exception $e) {
            $checks['redis'] = ['status' => false, 'message' => $e->getMessage()];
            $hasErrors = true;
        }

        // MySQL Check
        try {
            \App\Chat\Database::getPdoConnection();
            $checks['mysql'] = ['status' => true, 'message' => 'Successful'];
        } catch (\Exception $e) {
            $checks['mysql'] = ['status' => false, 'message' => 'Failed'];
            $hasErrors = true;
        }

        // Permissions Check
        $permissions = [];

        $logsDir = defined('APP_LOGS_DIR') ? APP_LOGS_DIR : __DIR__ . '/../../../storage/logs';
        $cacheDir = defined('APP_CACHE_DIR') ? APP_CACHE_DIR : __DIR__ . '/../../../storage/caches';
        $configDir = defined('APP_STORAGE_DIR') ? APP_STORAGE_DIR . 'config' : __DIR__ . '/../../../storage/config';

        $dirsToCheck = [
            'storage/logs' => $logsDir,
            'storage/cache' => $cacheDir,
            'storage/config' => $configDir,
        ];

        foreach ($dirsToCheck as $key => $path) {
            if (is_writable($path)) {
                $permissions[$key] = true;
            } else {
                $permissions[$key] = false;
                $hasErrors = true;
            }
        }
        $checks['permissions'] = $permissions;

        // Final Result
        $result = [
            'status' => !$hasErrors ? 'ready' : 'not_ready',
            'checks' => $checks,
            'timestamp' => time(),
            'cached' => false,
        ];

        // Cache for 1 hour (60 minutes) if everything is OK
        if (!$hasErrors) {
            Cache::put($cacheKey, $result, 60);
        }

        return ApiResponse::success($result, $hasErrors ? 'System has issues' : 'System is healthy', 200);
    }
}
