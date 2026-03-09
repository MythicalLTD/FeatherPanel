<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
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
        'admin-vm-templates-update',
        '/api/admin/vm-templates/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid template ID', 'INVALID_ID', 400);
            }

            return (new VmNodesController())->updateTemplate($request, (int) $id);
        },
        Permissions::ADMIN_NODES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-vm-templates-delete',
        '/api/admin/vm-templates/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid template ID', 'INVALID_ID', 400);
            }

            return (new VmNodesController())->deleteTemplate($request, (int) $id);
        },
        Permissions::ADMIN_NODES_DELETE,
        ['DELETE']
    );
};
