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

namespace App\Controllers\System;

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Cache\Cache;

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
                $checks['redis'] = ['status' => true, 'message' => 'Connection successful'];
            } else {
                $checks['redis'] = ['status' => false, 'message' => 'Connection failed'];
                $hasErrors = true;
            }
        } catch (\Exception $e) {
            $checks['redis'] = ['status' => false, 'message' => $e->getMessage()];
            $hasErrors = true;
        }

        // MySQL Check
        try {
            \App\Chat\Database::getPdoConnection();
            $checks['mysql'] = ['status' => true, 'message' => 'Connection successful'];
        } catch (\Exception $e) {
            $checks['mysql'] = ['status' => false, 'message' => $e->getMessage()];
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
