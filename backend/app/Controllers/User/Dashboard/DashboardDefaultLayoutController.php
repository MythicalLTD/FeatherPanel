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

namespace App\Controllers\User\Dashboard;

use App\App;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Panel-wide default dashboard layout. Admins save their arrangement as the default; users who
 * never arranged their own dashboard (or reset it) start from it.
 */
class DashboardDefaultLayoutController
{
    public const SETTING = 'dashboard_default_layout';
    private const MAX_BYTES = 16384;
    /** Personal content never becomes part of the panel default. */
    private const PERSONAL_KEYS = ['notes', 'quickLinks', 'hiddenPluginWidgets'];

    #[OA\Get(
        path: '/api/user/dashboard/default-layout',
        summary: 'Get the panel default dashboard layout',
        tags: ['User - Dashboard'],
        responses: [new OA\Response(response: 200, description: 'Default layout or null')]
    )]
    public function show(Request $request): Response
    {
        $raw = App::getInstance(true)->getConfig()->getSetting(self::SETTING, null);
        $layout = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;

        return ApiResponse::success(['layout' => is_array($layout) ? $layout : null], 'Default layout', 200);
    }

    #[OA\Put(
        path: '/api/admin/dashboard/default-layout',
        summary: 'Save the panel default dashboard layout',
        tags: ['Admin - Dashboard'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [new OA\Property(property: 'layout', type: 'object')])
        ),
        responses: [
            new OA\Response(response: 200, description: 'Saved'),
            new OA\Response(response: 400, description: 'Invalid layout'),
        ]
    )]
    public function update(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        $layout = is_array($data) ? ($data['layout'] ?? null) : null;
        if (!is_array($layout) || array_is_list($layout) || !isset($layout['widgets']) || !is_array($layout['widgets'])) {
            return ApiResponse::error('Invalid dashboard layout', 'INVALID_DASHBOARD_LAYOUT', 400);
        }
        foreach (self::PERSONAL_KEYS as $key) {
            unset($layout[$key]);
        }
        $json = json_encode($layout, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false || strlen($json) > self::MAX_BYTES) {
            return ApiResponse::error('Dashboard layout is too large', 'DASHBOARD_LAYOUT_TOO_LARGE', 400);
        }

        App::getInstance(true)->getConfig()->setSetting(self::SETTING, $json);

        return ApiResponse::success(['layout' => $layout], 'Default layout saved', 200);
    }

    #[OA\Delete(
        path: '/api/admin/dashboard/default-layout',
        summary: 'Remove the panel default dashboard layout',
        tags: ['Admin - Dashboard'],
        responses: [new OA\Response(response: 200, description: 'Removed')]
    )]
    public function clear(Request $request): Response
    {
        App::getInstance(true)->getConfig()->setSetting(self::SETTING, null);

        return ApiResponse::success(['layout' => null], 'Default layout removed', 200);
    }
}
