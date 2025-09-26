<?php

/*
 * This file is part of FeatherPanel.
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
use App\Controllers\Admin\ConsoleController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-console-execute',
        '/api/admin/console/execute',
        function (Request $request) {
            return (new ConsoleController())->executeCommand($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-console-system-info',
        '/api/admin/console/system-info',
        function (Request $request) {
            return (new ConsoleController())->getSystemInfo($request);
        },
        Permissions::ADMIN_ROOT,
    );
};
