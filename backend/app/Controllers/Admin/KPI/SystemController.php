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
