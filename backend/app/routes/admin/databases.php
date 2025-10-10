<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\Admin\DatabasesController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases',
        '/api/admin/databases',
        function (Request $request) {
            return (new DatabasesController())->index($request);
        },
        Permissions::ADMIN_DATABASES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-show',
        '/api/admin/databases/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new DatabasesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_DATABASES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-update',
        '/api/admin/databases/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new DatabasesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_DATABASES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-delete',
        '/api/admin/databases/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new DatabasesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_DATABASES_DELETE,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-create',
        '/api/admin/databases',
        function (Request $request) {
            return (new DatabasesController())->create($request);
        },
        Permissions::ADMIN_DATABASES_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-by-node',
        '/api/admin/databases/node/{nodeId}',
        function (Request $request, array $args) {
            $nodeId = $args['nodeId'] ?? null;
            if (!$nodeId || !is_numeric($nodeId)) {
                return ApiResponse::error('Missing or invalid node ID', 'INVALID_NODE_ID', 400);
            }

            return (new DatabasesController())->getByNode($request, (int) $nodeId);
        },
        Permissions::ADMIN_DATABASES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-health-check',
        '/api/admin/databases/{id}/health',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new DatabasesController())->healthCheck($request, (int) $id);
        },
        Permissions::ADMIN_DATABASES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-test-connection',
        '/api/admin/databases/test-connection',
        function (Request $request) {
            return (new DatabasesController())->testConnection($request);
        },
        Permissions::ADMIN_DATABASES_CREATE,
        ['POST']
    );
};
