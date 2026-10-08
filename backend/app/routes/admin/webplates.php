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
use App\Controllers\Admin\WebPlatesController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webplates',
        '/api/admin/webplates',
        function (Request $request) {
            return (new WebPlatesController())->index($request);
        },
        Permissions::ADMIN_WEBPLATES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webplates-show',
        '/api/admin/webplates/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebPlatesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_WEBPLATES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webplates-create',
        '/api/admin/webplates',
        function (Request $request) {
            return (new WebPlatesController())->create($request);
        },
        Permissions::ADMIN_WEBPLATES_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webplates-update',
        '/api/admin/webplates/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebPlatesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_WEBPLATES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-webplates-delete',
        '/api/admin/webplates/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new WebPlatesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_WEBPLATES_DELETE,
        ['DELETE']
    );
};
