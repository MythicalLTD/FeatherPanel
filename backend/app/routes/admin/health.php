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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\HealthController;
use App\Controllers\Admin\DebugRuntimeController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-health',
        '/api/admin/health',
        function (Request $request) {
            return (new HealthController())->index($request);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    // Developer debug console (##icanhasfeatherpanel): read-only runtime facts.
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-debug-runtime',
        '/api/admin/debug/runtime',
        function (Request $request) {
            return (new DebugRuntimeController())->index($request);
        },
        Permissions::ADMIN_ROOT,
    );
};
