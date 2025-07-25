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
use App\Controllers\Admin\UsersController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-users',
        '/api/admin/users',
        function (Request $request) {
            return (new UsersController())->index($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-users-show',
        '/api/admin/users/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new UsersController())->show($request, $uuid);
        },
        Permissions::ADMIN_USERS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-users-update',
        '/api/admin/users/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new UsersController())->update($request, $uuid);
        },
        Permissions::ADMIN_USERS_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-users-delete',
        '/api/admin/users/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new UsersController())->delete($request, $uuid);
        },
        Permissions::ADMIN_USERS_DELETE,
        ['DELETE']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-users-create',
        '/api/admin/users',
        function (Request $request) {
            return (new UsersController())->create($request);
        },
        Permissions::ADMIN_USERS_EDIT,
        ['PUT']
    );
};
