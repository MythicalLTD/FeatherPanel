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
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\Admin\LogViewerController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-log-viewer-get',
        '/api/admin/log-viewer/get',
        function (Request $request) {
            return (new LogViewerController())->getLogs($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-log-viewer-clear',
        '/api/admin/log-viewer/clear',
        function (Request $request) {
            return (new LogViewerController())->clearLogs($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-log-viewer-files',
        '/api/admin/log-viewer/files',
        function (Request $request) {
            return (new LogViewerController())->getLogFiles($request);
        },
        Permissions::ADMIN_ROOT,
    );
};
