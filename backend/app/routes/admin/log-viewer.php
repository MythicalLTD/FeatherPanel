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

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-log-viewer-upload',
        '/api/admin/log-viewer/upload',
        function (Request $request) {
            return (new LogViewerController())->uploadLogs($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );
};
