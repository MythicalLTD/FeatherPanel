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
use App\Controllers\Admin\FileManagerController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-file-manager-browse',
        '/api/admin/file-manager/browse',
        function (Request $request) {
            return (new FileManagerController())->browse($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-file-manager-read',
        '/api/admin/file-manager/read',
        function (Request $request) {
            return (new FileManagerController())->readFile($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-file-manager-save',
        '/api/admin/file-manager/save',
        function (Request $request) {
            return (new FileManagerController())->saveFile($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-file-manager-create',
        '/api/admin/file-manager/create',
        function (Request $request) {
            return (new FileManagerController())->createFile($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-file-manager-delete',
        '/api/admin/file-manager/delete',
        function (Request $request) {
            return (new FileManagerController())->deleteFile($request);
        },
        Permissions::ADMIN_ROOT,
        ['POST']
    );
};
