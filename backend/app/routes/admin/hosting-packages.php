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
use App\Controllers\Admin\HostingPackagesController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-hosting-packages',
        '/api/admin/hosting-packages',
        function (Request $request) {
            return (new HostingPackagesController())->index($request);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-hosting-packages-show',
        '/api/admin/hosting-packages/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new HostingPackagesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-hosting-packages-create',
        '/api/admin/hosting-packages',
        function (Request $request) {
            return (new HostingPackagesController())->create($request);
        },
        Permissions::ADMIN_WEBSPACES_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-hosting-packages-update',
        '/api/admin/hosting-packages/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new HostingPackagesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-hosting-packages-delete',
        '/api/admin/hosting-packages/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new HostingPackagesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_WEBSPACES_DELETE,
        ['DELETE']
    );
};
