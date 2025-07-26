<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
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
