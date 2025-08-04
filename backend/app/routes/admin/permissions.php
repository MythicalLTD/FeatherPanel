<?php

/*
 * This file is part of MythicalPanel.
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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\PermissionsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-permissions',
        '/api/admin/permissions',
        function (Request $request) {
            return (new PermissionsController())->index($request);
        },
        Permissions::ADMIN_ROLES_PERMISSIONS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-permissions-show',
        '/api/admin/permissions/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new PermissionsController())->show($request, (int) $id);
        },
        Permissions::ADMIN_ROLES_PERMISSIONS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-permissions-update',
        '/api/admin/permissions/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new PermissionsController())->update($request, (int) $id);
        },
        Permissions::ADMIN_ROLES_PERMISSIONS_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-permissions-delete',
        '/api/admin/permissions/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new PermissionsController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_ROLES_PERMISSIONS_DELETE,
        ['DELETE']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-permissions-create',
        '/api/admin/permissions',
        function (Request $request) {
            return (new PermissionsController())->create($request);
        },
        Permissions::ADMIN_ROLES_PERMISSIONS_CREATE,
        ['PUT']
    );
};
