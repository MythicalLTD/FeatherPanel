<?php

/*
 * This file is part of FeatherPanel.
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
