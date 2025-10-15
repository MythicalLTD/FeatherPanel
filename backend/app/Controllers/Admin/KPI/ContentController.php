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
        path: '/api/admin/analytics/redirect-links/overview',
        summary: 'Get redirect links overview',
        description: 'Retrieve statistics about redirect links.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Redirect links overview retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getRedirectLinksOverview(Request $request): Response
    {
        $stats = ContentAnalytics::getRedirectLinksOverview();

        return ApiResponse::success($stats, 'Redirect links overview fetched successfully', 200);
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
