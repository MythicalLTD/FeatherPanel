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
