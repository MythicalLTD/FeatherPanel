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
use App\KPI\Admin\InfrastructureAnalytics;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class InfrastructureController
{
    #[OA\Get(
        path: '/api/admin/analytics/locations/overview',
        summary: 'Get locations overview',
        description: 'Retrieve statistics about locations.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Locations overview retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getLocationsOverview(Request $request): Response
    {
        $stats = InfrastructureAnalytics::getLocationsOverview();

        return ApiResponse::success($stats, 'Locations overview fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/nodes/by-location',
        summary: 'Get nodes by location',
        description: 'Retrieve node distribution across locations.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Nodes by location retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getNodesByLocation(Request $request): Response
    {
        $stats = InfrastructureAnalytics::getNodesByLocation();

        return ApiResponse::success($stats, 'Nodes by location fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/nodes/overview',
        summary: 'Get nodes overview',
        description: 'Retrieve statistics about nodes.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Nodes overview retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getNodesOverview(Request $request): Response
    {
        $stats = InfrastructureAnalytics::getNodesOverview();

        return ApiResponse::success($stats, 'Nodes overview fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/servers/by-node',
        summary: 'Get servers by node',
        description: 'Retrieve server distribution across nodes.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Servers by node retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getServersByNode(Request $request): Response
    {
        $stats = InfrastructureAnalytics::getServersByNode();

        return ApiResponse::success($stats, 'Servers by node fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/nodes/resources',
        summary: 'Get node resource allocation',
        description: 'Retrieve resource allocation statistics for all nodes.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Node resources retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getNodeResources(Request $request): Response
    {
        $stats = InfrastructureAnalytics::getNodeResources();

        return ApiResponse::success($stats, 'Node resources fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/allocations/overview',
        summary: 'Get allocations overview',
        description: 'Retrieve statistics about allocations.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Allocations overview retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getAllocationsOverview(Request $request): Response
    {
        $stats = InfrastructureAnalytics::getAllocationsOverview();

        return ApiResponse::success($stats, 'Allocations overview fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/allocations/by-node',
        summary: 'Get allocations by node',
        description: 'Retrieve allocation distribution across nodes.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Allocations by node retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getAllocationsByNode(Request $request): Response
    {
        $stats = InfrastructureAnalytics::getAllocationsByNode();

        return ApiResponse::success($stats, 'Allocations by node fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/databases/overview',
        summary: 'Get databases overview',
        description: 'Retrieve statistics about database hosts.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Databases overview retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getDatabasesOverview(Request $request): Response
    {
        $stats = InfrastructureAnalytics::getDatabasesOverview();

        return ApiResponse::success($stats, 'Databases overview fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/ports/usage',
        summary: 'Get port usage statistics',
        description: 'Retrieve statistics about most used ports.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of top ports to retrieve (default: 10)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 50, default: 10)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Port usage retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getPortUsage(Request $request): Response
    {
        $limit = (int) $request->query->get('limit', 10);

        if ($limit < 1 || $limit > 50) {
            return ApiResponse::error('Limit must be between 1 and 50', 'INVALID_LIMIT_PARAMETER', 400);
        }

        $stats = InfrastructureAnalytics::getPortUsage($limit);

        return ApiResponse::success($stats, 'Port usage fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/ips/usage',
        summary: 'Get IP usage statistics',
        description: 'Retrieve statistics about most used IP addresses.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of top IPs to retrieve (default: 10)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 50, default: 10)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'IP usage retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getIpUsage(Request $request): Response
    {
        $limit = (int) $request->query->get('limit', 10);

        if ($limit < 1 || $limit > 50) {
            return ApiResponse::error('Limit must be between 1 and 50', 'INVALID_LIMIT_PARAMETER', 400);
        }

        $stats = InfrastructureAnalytics::getIpUsage($limit);

        return ApiResponse::success($stats, 'IP usage fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/infrastructure/dashboard',
        summary: 'Get comprehensive infrastructure dashboard',
        description: 'Retrieve all infrastructure analytics data.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Infrastructure dashboard retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getDashboard(Request $request): Response
    {
        $stats = InfrastructureAnalytics::getInfrastructureDashboard();

        return ApiResponse::success($stats, 'Infrastructure dashboard fetched successfully', 200);
    }
}
