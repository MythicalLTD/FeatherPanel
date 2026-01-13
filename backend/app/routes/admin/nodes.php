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
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-version-status',
        '/api/admin/nodes/{id}/version-status',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->getVersionStatus($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );
    // Wings Config Routes (alias for /config routes)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-nodes-wings-config-get',
        '/api/admin/nodes/{id}/wings/config',
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
        'admin-nodes-wings-config-put',
        '/api/admin/nodes/{id}/wings/config',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new NodesController())->putConfig($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PUT', 'POST']
    );
};
