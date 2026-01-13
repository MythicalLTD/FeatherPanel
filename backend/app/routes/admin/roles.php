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
use App\Controllers\Admin\RolesController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-roles',
        '/api/admin/roles',
        function (Request $request) {
            return (new RolesController())->index($request);
        },
        Permissions::ADMIN_ROLES_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-roles-show',
        '/api/admin/roles/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new RolesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_ROLES_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-roles-update',
        '/api/admin/roles/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new RolesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_ROLES_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-roles-delete',
        '/api/admin/roles/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new RolesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_ROLES_DELETE,
        ['DELETE']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-roles-create',
        '/api/admin/roles',
        function (Request $request) {
            return (new RolesController())->create($request);
        },
        Permissions::ADMIN_ROLES_CREATE,
        ['PUT']
    );
};
