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

namespace App\Controllers\User\WebSpaces;

use App\App;
use App\Helpers\TimeHelper;
use App\Helpers\ApiResponse;
use App\Chat\WebSpaceActivity;
use App\Config\ConfigInterface;
use App\Helpers\WebSpaceGateway;
use App\WebSpaceSubuserPermissions;
use App\Helpers\CheckWebSpacePermission;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WebSpaceActivityController
{
    public function index(Request $request, string $uuidShort): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        if (!WebSpaceGateway::canUserAccessWebSpace((string) $user['uuid'], $uuidShort)) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::ACTIVITY_READ);
        if ($denied !== null) {
            return $denied;
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(100, (int) $request->query->get('per_page', 50)));
        $search = (string) $request->query->get('search', '');

        $result = WebSpaceActivity::getActivitiesWithPagination(
            page: $page,
            perPage: $perPage,
            search: $search,
            webspaceId: (int) $space['id'],
        );

        $hideIps = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::SERVER_HIDE_IPS, 'false') === 'true';
        foreach ($result['data'] as &$activity) {
            if ($hideIps && !empty($activity['ip'])) {
                $activity['ip'] = '***.***.***.***';
            }
            $activity = TimeHelper::normaliseRow($activity, ['timestamp']);
        }
        unset($activity);

        return ApiResponse::success([
            'activities' => $result['data'],
            'pagination' => $result['pagination'],
        ], 'OK', 200);
    }
}
