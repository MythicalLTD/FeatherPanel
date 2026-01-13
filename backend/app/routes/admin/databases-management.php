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
use App\Controllers\Admin\DatabaseManagmentController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-management-status',
        '/api/admin/databases/management/status',
        function (Request $request) {
            return (new DatabaseManagmentController())->status($request);
        },
        Permissions::ADMIN_DATABASES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-management-migrate',
        '/api/admin/databases/management/migrate',
        function (Request $request) {
            return (new DatabaseManagmentController())->migrate($request);
        },
        Permissions::ADMIN_DATABASES_MANAGE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-management-install-phpmyadmin',
        '/api/admin/databases/management/install-phpmyadmin',
        function (Request $request) {
            return (new DatabaseManagmentController())->installPhpMyAdmin($request);
        },
        Permissions::ADMIN_DATABASES_MANAGE,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-management-phpmyadmin-status',
        '/api/admin/databases/management/phpmyadmin/status',
        function (Request $request) {
            return (new DatabaseManagmentController())->checkPhpMyAdminStatus($request);
        },
        Permissions::ADMIN_DATABASES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-databases-management-delete-phpmyadmin',
        '/api/admin/databases/management/phpmyadmin',
        function (Request $request) {
            return (new DatabaseManagmentController())->deletePhpMyAdmin($request);
        },
        Permissions::ADMIN_DATABASES_MANAGE,
        ['DELETE']
    );
};
