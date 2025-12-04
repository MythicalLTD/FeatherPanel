<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
