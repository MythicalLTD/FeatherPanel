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
use App\Controllers\Admin\NodesController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\NodeStatusController;

return function (RouteCollection $routes): void {
    // Global node status dashboard
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-status-global',
        '/api/admin/nodes/status/global',
        function (Request $request) {
            return (new NodeStatusController())->getGlobalStatus($request);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes',
        '/api/admin/nodes',
        function (Request $request) {
            return (new NodesController())->index($request);
        },
        Permissions::ADMIN_NODES_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-show',
        '/api/admin/nodes/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-diagnostics',
        '/api/admin/nodes/{id}/diagnostics',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->diagnostics($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-update',
        '/api/admin/nodes/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-delete',
        '/api/admin/nodes/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_NODES_DELETE,
        ['DELETE']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-create',
        '/api/admin/nodes',
        function (Request $request) {
            return (new NodesController())->create($request);
        },
        Permissions::ADMIN_NODES_CREATE,
        ['PUT']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-reset-key',
        '/api/admin/nodes/{id}/reset-key',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->resetKey($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-self-update',
        '/api/admin/nodes/{id}/self-update',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->triggerSelfUpdate($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-terminal-exec',
        '/api/admin/nodes/{id}/terminal/exec',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->executeTerminalCommand($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-config-get',
        '/api/admin/nodes/{id}/config',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->getConfig($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-config-put',
        '/api/admin/nodes/{id}/config',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->putConfig($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PUT']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-config-patch',
        '/api/admin/nodes/{id}/config/patch',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->patchConfig($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-config-schema',
        '/api/admin/nodes/{id}/config/schema',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->getConfigSchema($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );
};
