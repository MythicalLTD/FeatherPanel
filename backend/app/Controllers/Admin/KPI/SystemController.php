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

namespace App\Controllers\Admin\KPI;

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\KPI\Admin\SystemAnalytics;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SystemController
{
    #[OA\Get(
        path: '/api/admin/analytics/mail-queue/stats',
        summary: 'Get mail queue statistics',
        description: 'Retrieve statistics about mail queue.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Mail queue stats retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getMailQueueStats(Request $request): Response
    {
        $stats = SystemAnalytics::getMailQueueStats();

        return ApiResponse::success($stats, 'Mail queue stats fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/system/dashboard',
        summary: 'Get comprehensive system analytics dashboard',
        description: 'Retrieve all system analytics data.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'System dashboard retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getDashboard(Request $request): Response
    {
        $stats = SystemAnalytics::getSystemDashboard();

        return ApiResponse::success($stats, 'System dashboard fetched successfully', 200);
    }
}
