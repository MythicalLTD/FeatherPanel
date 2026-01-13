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
use App\KPI\Admin\ContentAnalytics;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ContentController
{
    #[OA\Get(
        path: '/api/admin/analytics/realms/overview',
        summary: 'Get realms overview',
        description: 'Retrieve statistics about realms.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Realms overview retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getRealmsOverview(Request $request): Response
    {
        $stats = ContentAnalytics::getRealmsOverview();

        return ApiResponse::success($stats, 'Realms overview fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/spells/by-realm',
        summary: 'Get spells by realm',
        description: 'Retrieve spell distribution across realms.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Spells by realm retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getSpellsByRealm(Request $request): Response
    {
        $stats = ContentAnalytics::getSpellsByRealm();

        return ApiResponse::success($stats, 'Spells by realm fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/spells/overview',
        summary: 'Get spells overview',
        description: 'Retrieve statistics about spells.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Spells overview retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getSpellsOverview(Request $request): Response
    {
        $stats = ContentAnalytics::getSpellsOverview();

        return ApiResponse::success($stats, 'Spells overview fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/spells/variables',
        summary: 'Get spell variable statistics',
        description: 'Retrieve statistics about spell variables.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Spell variables retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getSpellVariableStats(Request $request): Response
    {
        $stats = ContentAnalytics::getSpellVariableStats();

        return ApiResponse::success($stats, 'Spell variables fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/images/overview',
        summary: 'Get images overview',
        description: 'Retrieve statistics about images.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Images overview retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getImagesOverview(Request $request): Response
    {
        $stats = ContentAnalytics::getImagesOverview();

        return ApiResponse::success($stats, 'Images overview fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/mail-templates/overview',
        summary: 'Get mail templates overview',
        description: 'Retrieve statistics about mail templates.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Mail templates overview retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getMailTemplatesOverview(Request $request): Response
    {
        $stats = ContentAnalytics::getMailTemplatesOverview();

        return ApiResponse::success($stats, 'Mail templates overview fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/content/dashboard',
        summary: 'Get comprehensive content analytics dashboard',
        description: 'Retrieve all content analytics data.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Content dashboard retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getDashboard(Request $request): Response
    {
        $stats = ContentAnalytics::getContentDashboard();

        return ApiResponse::success($stats, 'Content dashboard fetched successfully', 200);
    }
}
