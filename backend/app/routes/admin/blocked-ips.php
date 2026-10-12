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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\BlockedIpsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-blocked-ips',
        '/api/admin/blocked-ips',
        function (Request $request) {
            return (new BlockedIpsController())->index($request);
        },
        Permissions::ADMIN_BLOCKED_IPS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-blocked-ips-create',
        '/api/admin/blocked-ips',
        function (Request $request) {
            return (new BlockedIpsController())->create($request);
        },
        Permissions::ADMIN_BLOCKED_IPS_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-blocked-ips-delete',
        '/api/admin/blocked-ips/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if ($id === null || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid id', 'INVALID_ID', 400);
            }

            return (new BlockedIpsController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_BLOCKED_IPS_DELETE,
        ['DELETE']
    );
};
