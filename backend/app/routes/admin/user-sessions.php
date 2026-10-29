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
use App\Controllers\Admin\UserSessionsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-user-sessions',
        '/api/admin/users/{uuid}/sessions',
        function (Request $request, array $args) {
            return (new UserSessionsController())->index($request, (string) ($args['uuid'] ?? ''));
        },
        Permissions::ADMIN_USERS_VIEW,
        ['GET'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-user-sessions-revoke-all',
        '/api/admin/users/{uuid}/sessions/revoke-all',
        function (Request $request, array $args) {
            return (new UserSessionsController())->revokeAll($request, (string) ($args['uuid'] ?? ''));
        },
        Permissions::ADMIN_USERS_EDIT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-user-session-revoke',
        '/api/admin/users/{uuid}/sessions/{id}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Invalid session', 'ADMIN_SESSION_NOT_FOUND', 400);
            }

            return (new UserSessionsController())->revoke($request, (string) ($args['uuid'] ?? ''), $id);
        },
        Permissions::ADMIN_USERS_EDIT,
        ['DELETE'],
    );
};
