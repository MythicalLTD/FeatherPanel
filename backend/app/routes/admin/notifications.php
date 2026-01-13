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

use App\App;
use App\Permissions;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\NotificationsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-notifications',
        '/api/admin/notifications',
        function (Request $request) {
            return (new NotificationsController())->index($request);
        },
        Permissions::ADMIN_NOTIFICATIONS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-notifications-show',
        '/api/admin/notifications/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NotificationsController())->show($request, (int) $id);
        },
        Permissions::ADMIN_NOTIFICATIONS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-notifications-create',
        '/api/admin/notifications',
        function (Request $request) {
            return (new NotificationsController())->create($request);
        },
        Permissions::ADMIN_NOTIFICATIONS_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-notifications-update',
        '/api/admin/notifications/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NotificationsController())->update($request, (int) $id);
        },
        Permissions::ADMIN_NOTIFICATIONS_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-notifications-delete',
        '/api/admin/notifications/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NotificationsController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_NOTIFICATIONS_DELETE,
        ['DELETE']
    );
};
