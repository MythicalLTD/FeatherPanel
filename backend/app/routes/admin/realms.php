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
use App\Controllers\Admin\RealmsController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-realms',
        '/api/admin/realms',
        function (Request $request) {
            return (new RealmsController())->index($request);
        },
        Permissions::ADMIN_REALMS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-realms-show',
        '/api/admin/realms/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new RealmsController())->show($request, (int) $id);
        },
        Permissions::ADMIN_REALMS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-realms-update',
        '/api/admin/realms/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new RealmsController())->update($request, (int) $id);
        },
        Permissions::ADMIN_REALMS_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-realms-delete',
        '/api/admin/realms/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new RealmsController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_REALMS_DELETE,
        ['DELETE']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-realms-create',
        '/api/admin/realms',
        function (Request $request) {
            return (new RealmsController())->create($request);
        },
        Permissions::ADMIN_REALMS_CREATE,
        ['PUT']
    );
};
