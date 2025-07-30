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
use App\Controllers\Admin\NodesController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
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
};
