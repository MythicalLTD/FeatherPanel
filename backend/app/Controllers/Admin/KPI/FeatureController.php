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
use App\KPI\Admin\VdsAnalytics;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class FeatureController
{
    #[OA\Get(
        path: '/api/admin/analytics/tickets/dashboard',
        summary: 'Get tickets analytics dashboard',
        description: 'Retrieve analytics for ticketing entities.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Tickets dashboard retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getTicketsDashboard(Request $request): Response
    {
        return ApiResponse::success(VdsAnalytics::getTicketsDashboard(), 'Tickets dashboard fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/plugins/dashboard',
        summary: 'Get plugins analytics dashboard',
        description: 'Retrieve analytics for plugins and related integrations.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Plugins dashboard retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getPluginsDashboard(Request $request): Response
    {
        return ApiResponse::success(VdsAnalytics::getPluginsDashboard(), 'Plugins dashboard fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/knowledgebase/dashboard',
        summary: 'Get knowledgebase analytics dashboard',
        description: 'Retrieve analytics for knowledgebase entities.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Knowledgebase dashboard retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getKnowledgebaseDashboard(Request $request): Response
    {
        return ApiResponse::success(
            VdsAnalytics::getKnowledgebaseDashboard(),
            'Knowledgebase dashboard fetched successfully',
            200
        );
    }
}
