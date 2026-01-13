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
        'admin-users-show-by-external-id',
        '/api/admin/users/external/{externalId}',
        function (Request $request, array $args) {
            $externalId = $args['externalId'] ?? null;
            if (!$externalId || !is_string($externalId) || trim($externalId) === '') {
                return ApiResponse::error('Missing or invalid external ID', 'INVALID_EXTERNAL_ID', 400);
            }

            return (new UsersController())->showByExternalId($request, trim($externalId));
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
        Permissions::ADMIN_USERS_CREATE,
        ['PUT']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-users-owned-servers',
        '/api/admin/users/{uuid}/servers',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new UsersController())->ownedServers($request, $uuid);
        },
        Permissions::ADMIN_USERS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-users-server-request',
        '/api/admin/users/serverRequest/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new UsersController())->serverRequest($request, $args['id']);
        },
        Permissions::ADMIN_USERS_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-users-sso-token',
        '/api/admin/users/{uuid}/sso-token',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new UsersController())->createSsoToken($request, $uuid);
        },
        Permissions::ADMIN_USERS_EDIT,
        ['POST']
    );
};
