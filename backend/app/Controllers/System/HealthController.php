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

use App\App;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Runtime\WorkerRestart;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class HealthController
{
    #[OA\Get(
        path: '/api/system/health',
        summary: 'Health check',
        description: 'Lightweight liveness check for container health checks: confirms PHP answers and the database is reachable.',
        tags: ['System'],
        responses: [
            new OA\Response(response: 200, description: 'Healthy'),
            new OA\Response(response: 503, description: 'Database unreachable'),
        ]
    )]
    public function index(Request $request): Response
    {
        try {
            App::getInstance(true)->getDatabase()->getPdo()->query('SELECT 1');
        } catch (\Throwable) {
            return ApiResponse::error('Database unreachable', 'DATABASE_UNREACHABLE', 503);
        }

        return ApiResponse::success([
            'status' => 'ok',
            'php_mode' => WorkerRestart::isWorkerMode() ? 'worker' : 'classic',
        ], 'OK', 200);
    }
}
