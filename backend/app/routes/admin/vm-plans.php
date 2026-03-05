<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studio
 * Copyright (C) 2025 FeatherPanel Contributors
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

use App\App;
use App\Permissions;
use App\Helpers\ApiResponse;
use App\Controllers\Admin\VmPlansController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    // Stats summary
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-plans-stats',
        '/api/admin/vm-plans/stats',
        function (Request $request) {
            return (new VmPlansController())->stats($request);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // List all plans
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-plans-index',
        '/api/admin/vm-plans',
        function (Request $request) {
            return (new VmPlansController())->index($request);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Get single plan
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-plans-show',
        '/api/admin/vm-plans/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmPlansController())->show($request, (int) $id);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );

    // Create plan
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-plans-create',
        '/api/admin/vm-plans',
        function (Request $request) {
            return (new VmPlansController())->create($request);
        },
        Permissions::ADMIN_NODES_CREATE,
        ['PUT']
    );

    // Update plan
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-plans-update',
        '/api/admin/vm-plans/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmPlansController())->update($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );

    // Delete plan
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-plans-delete',
        '/api/admin/vm-plans/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new VmPlansController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_NODES_DELETE,
        ['DELETE']
    );

    // List all VM instances
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-instances-index',
        '/api/admin/vm-instances',
        function (Request $request) {
            return (new VmPlansController())->instances($request);
        },
        Permissions::ADMIN_NODES_VIEW,
        ['GET']
    );
};
