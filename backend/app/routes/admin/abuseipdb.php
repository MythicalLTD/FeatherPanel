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
use App\Controllers\Admin\AbuseIPDBController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-abuseipdb-status',
        '/api/admin/abuseipdb/status',
        function (Request $request) {
            return (new AbuseIPDBController())->status($request);
        },
        Permissions::ADMIN_USERS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-abuseipdb-categories',
        '/api/admin/abuseipdb/categories',
        function (Request $request) {
            return (new AbuseIPDBController())->categories($request);
        },
        Permissions::ADMIN_USERS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-abuseipdb-check',
        '/api/admin/abuseipdb/check',
        function (Request $request) {
            return (new AbuseIPDBController())->check($request);
        },
        Permissions::ADMIN_USERS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-abuseipdb-scan',
        '/api/admin/abuseipdb/scan',
        function (Request $request) {
            return (new AbuseIPDBController())->scan($request);
        },
        Permissions::ADMIN_USERS_VIEW,
        ['POST']
    );
};
