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

namespace App\Controllers\Admin\KPI;

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\KPI\Admin\ServerAnalytics;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerController
{
    #[OA\Get(
        path: '/api/admin/analytics/servers/overview',
        summary: 'Get servers overview',
        description: 'Retrieve statistics about servers.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Servers overview retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getServersOverview(Request $request): Response
    {
        $stats = ServerAnalytics::getServersOverview();

        return ApiResponse::success($stats, 'Servers overview fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/by-realm',
        summary: 'Get servers by realm',
        description: 'Retrieve server distribution across realms.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Servers by realm retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getServersByRealm(Request $request): Response
    {
        $stats = ServerAnalytics::getServersByRealm();

        return ApiResponse::success($stats, 'Servers by realm fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/by-spell',
        summary: 'Get servers by spell',
        description: 'Retrieve server distribution across spells.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Servers by spell retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getServersBySpell(Request $request): Response
    {
        $stats = ServerAnalytics::getServersBySpell();

        return ApiResponse::success($stats, 'Servers by spell fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/database-usage',
        summary: 'Get database usage per server',
        description: 'Retrieve statistics about database usage patterns across servers.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Database usage retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getDatabaseUsage(Request $request): Response
    {
        $stats = ServerAnalytics::getDatabaseUsagePerServer();

        return ApiResponse::success($stats, 'Database usage fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/allocation-usage',
        summary: 'Get allocation usage per server',
        description: 'Retrieve statistics about allocation usage patterns across servers.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Allocation usage retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getAllocationUsage(Request $request): Response
    {
        $stats = ServerAnalytics::getAllocationUsagePerServer();

        return ApiResponse::success($stats, 'Allocation usage fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/resources',
        summary: 'Get server resource usage',
        description: 'Retrieve statistics about resource allocation across servers.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Resource usage retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getResourceUsage(Request $request): Response
    {
        $stats = ServerAnalytics::getResourceUsage();

        return ApiResponse::success($stats, 'Resource usage fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/status',
        summary: 'Get server status distribution',
        description: 'Retrieve distribution of servers by status.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Status distribution retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getStatusDistribution(Request $request): Response
    {
        $stats = ServerAnalytics::getStatusDistribution();

        return ApiResponse::success($stats, 'Status distribution fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/images',
        summary: 'Get Docker image usage',
        description: 'Retrieve statistics about most used Docker images.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of top images to retrieve (default: 10)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 50, default: 10)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Image usage retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getImageUsage(Request $request): Response
    {
        $limit = (int) $request->query->get('limit', 10);

        if ($limit < 1 || $limit > 50) {
            return ApiResponse::error('Limit must be between 1 and 50', 'INVALID_LIMIT_PARAMETER', 400);
        }

        $stats = ServerAnalytics::getImageUsage($limit);

        return ApiResponse::success($stats, 'Image usage fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/limits',
        summary: 'Get server limits distribution',
        description: 'Retrieve statistics about database and backup limits.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Limits distribution retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getLimitsDistribution(Request $request): Response
    {
        $stats = ServerAnalytics::getLimitsDistribution();

        return ApiResponse::success($stats, 'Limits distribution fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/dashboard',
        summary: 'Get comprehensive server analytics dashboard',
        description: 'Retrieve all server analytics data.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Server dashboard retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getDashboard(Request $request): Response
    {
        $stats = ServerAnalytics::getServerDashboard();

        return ApiResponse::success($stats, 'Server dashboard fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/backups',
        summary: 'Get backup usage statistics',
        description: 'Retrieve statistics about server backups.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Backup usage retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getBackupUsage(Request $request): Response
    {
        $stats = ServerAnalytics::getBackupUsage();

        return ApiResponse::success($stats, 'Backup usage fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/schedules',
        summary: 'Get schedule usage statistics',
        description: 'Retrieve statistics about server schedules and tasks.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Schedule usage retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getScheduleUsage(Request $request): Response
    {
        $stats = ServerAnalytics::getScheduleUsage();

        return ApiResponse::success($stats, 'Schedule usage fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/subusers',
        summary: 'Get subuser statistics',
        description: 'Retrieve statistics about server subusers.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Subuser statistics retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getSubuserStats(Request $request): Response
    {
        $stats = ServerAnalytics::getSubuserStats();

        return ApiResponse::success($stats, 'Subuser statistics fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/server-activities',
        summary: 'Get server activity statistics',
        description: 'Retrieve statistics about server-specific activities.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Server activity statistics retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getServerActivityStats(Request $request): Response
    {
        $stats = ServerAnalytics::getServerActivityStats();

        return ApiResponse::success($stats, 'Server activity statistics fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/variables',
        summary: 'Get variable usage statistics',
        description: 'Retrieve statistics about server variables.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Variable statistics retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getVariableStats(Request $request): Response
    {
        $stats = ServerAnalytics::getVariableStats();

        return ApiResponse::success($stats, 'Variable statistics fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/creation-trend',
        summary: 'Get server creation trend',
        description: 'Retrieve server creation trends over time.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'days',
                in: 'query',
                description: 'Number of days to look back (default: 30)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 365, default: 30)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Creation trend retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getCreationTrend(Request $request): Response
    {
        $days = (int) $request->query->get('days', 30);

        if ($days < 1 || $days > 365) {
            return ApiResponse::error('Days must be between 1 and 365', 'INVALID_DAYS_PARAMETER', 400);
        }

        $stats = ServerAnalytics::getServerCreationTrend($days);

        return ApiResponse::success($stats, 'Server creation trend fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/resource-trends',
        summary: 'Get resource allocation trends',
        description: 'Retrieve resource allocation trends over time.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'days',
                in: 'query',
                description: 'Number of days to look back (default: 30)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 90, default: 30)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Resource trends retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getResourceTrends(Request $request): Response
    {
        $days = (int) $request->query->get('days', 30);

        if ($days < 1 || $days > 90) {
            return ApiResponse::error('Days must be between 1 and 90', 'INVALID_DAYS_PARAMETER', 400);
        }

        $stats = ServerAnalytics::getResourceTrends($days);

        return ApiResponse::success($stats, 'Resource trends fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/age-distribution',
        summary: 'Get server age distribution',
        description: 'Retrieve server age distribution.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Age distribution retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getAgeDistribution(Request $request): Response
    {
        $stats = ServerAnalytics::getServerAgeDistribution();

        return ApiResponse::success($stats, 'Age distribution fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/resource-distribution',
        summary: 'Get resource distribution',
        description: 'Retrieve how resources are distributed across servers.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Resource distribution retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getResourceDistribution(Request $request): Response
    {
        $stats = ServerAnalytics::getResourceDistribution();

        return ApiResponse::success($stats, 'Resource distribution fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/installation',
        summary: 'Get installation statistics',
        description: 'Retrieve server installation statistics.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Installation statistics retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getInstallationStats(Request $request): Response
    {
        $stats = ServerAnalytics::getInstallationStats();

        return ApiResponse::success($stats, 'Installation statistics fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/configuration',
        summary: 'Get configuration patterns',
        description: 'Retrieve server configuration patterns.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Configuration patterns retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getConfigurationPatterns(Request $request): Response
    {
        $stats = ServerAnalytics::getConfigurationPatterns();

        return ApiResponse::success($stats, 'Configuration patterns fetched successfully', 200);
    }
}
