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
use App\Controllers\Admin\LocationsController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-locations',
        '/api/admin/locations',
        function (Request $request) {
            return (new LocationsController())->index($request);
        },
        Permissions::ADMIN_LOCATIONS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-locations-show',
        '/api/admin/locations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new LocationsController())->show($request, (int) $id);
        },
        Permissions::ADMIN_LOCATIONS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-locations-update',
        '/api/admin/locations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new LocationsController())->update($request, (int) $id);
        },
        Permissions::ADMIN_LOCATIONS_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-locations-delete',
        '/api/admin/locations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new LocationsController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_LOCATIONS_DELETE,
        ['DELETE']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-locations-create',
        '/api/admin/locations',
        function (Request $request) {
            return (new LocationsController())->create($request);
        },
        Permissions::ADMIN_LOCATIONS_CREATE,
        ['PUT']
    );
};
