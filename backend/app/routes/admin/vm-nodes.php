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
use App\Controllers\Admin\VmNodesController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-nodes',
        '/api/admin/vm-nodes',
        function (Request $request) {
            return (new VmNodesController())->index($request);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-nodes-show',
        '/api/admin/vm-nodes/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmNodesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-nodes-create',
        '/api/admin/vm-nodes',
        function (Request $request) {
            return (new VmNodesController())->create($request);
        },
        Permissions::ADMIN_NODES_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-nodes-update',
        '/api/admin/vm-nodes/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmNodesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-nodes-delete',
        '/api/admin/vm-nodes/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmNodesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_NODES_DELETE,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-nodes-test-connection',
        '/api/admin/vm-nodes/{id}/test-connection',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmNodesController())->testConnection($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-nodes-ips-index',
        '/api/admin/vm-nodes/{id}/ips',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmNodesController())->listIps($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-nodes-ips-create',
        '/api/admin/vm-nodes/{id}/ips',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmNodesController())->createIp($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-nodes-ips-update',
        '/api/admin/vm-nodes/{id}/ips/{ipId}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $ipId = $args['ipId'] ?? null;
            if (!$id || !is_numeric($id) || !$ipId || !is_numeric($ipId)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmNodesController())->updateIp($request, (int) $id, (int) $ipId);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-nodes-ips-delete',
        '/api/admin/vm-nodes/{id}/ips/{ipId}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $ipId = $args['ipId'] ?? null;
            if (!$id || !is_numeric($id) || !$ipId || !is_numeric($ipId)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmNodesController())->deleteIp($request, (int) $id, (int) $ipId);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-nodes-ips-set-primary',
        '/api/admin/vm-nodes/{id}/ips/{ipId}/primary',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            $ipId = $args['ipId'] ?? null;
            if (!$id || !is_numeric($id) || !$ipId || !is_numeric($ipId)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmNodesController())->setPrimaryIp($request, (int) $id, (int) $ipId);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['POST']
    );
};

