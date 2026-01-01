<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
