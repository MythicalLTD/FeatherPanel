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
use App\Controllers\Admin\MountsController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mounts',
        '/api/admin/mounts',
        function (Request $request) {
            return (new MountsController())->index($request);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mounts-create',
        '/api/admin/mounts',
        function (Request $request) {
            return (new MountsController())->create($request);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mounts-show',
        '/api/admin/mounts/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new MountsController())->show($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mounts-update',
        '/api/admin/mounts/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new MountsController())->update($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mounts-delete',
        '/api/admin/mounts/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new MountsController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mounts-set-nodes',
        '/api/admin/mounts/{id}/nodes',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new MountsController())->setNodes($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mounts-set-spells',
        '/api/admin/mounts/{id}/spells',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new MountsController())->setSpells($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mounts-set-links',
        '/api/admin/mounts/{id}/links',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new MountsController())->setNodesAndSpells($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-mounts-set-servers',
        '/api/admin/mounts/{id}/servers',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new MountsController())->setServers($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );
};
