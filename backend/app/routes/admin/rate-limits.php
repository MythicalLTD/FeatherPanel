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
use App\Controllers\Admin\RateLimitController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits',
        '/api/admin/rate-limits',
        function (Request $request) {
            return (new RateLimitController())->index($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits-show',
        '/api/admin/rate-limits/{routeName}',
        function (Request $request, string $routeName) {
            return (new RateLimitController())->show($request, $routeName);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits-update',
        '/api/admin/rate-limits/{routeName}',
        function (Request $request, string $routeName) {
            return (new RateLimitController())->update($request, $routeName);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits-delete',
        '/api/admin/rate-limits/{routeName}',
        function (Request $request, string $routeName) {
            return (new RateLimitController())->delete($request, $routeName);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits-bulk-update',
        '/api/admin/rate-limits/bulk',
        function (Request $request) {
            return (new RateLimitController())->bulkUpdate($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits-global',
        '/api/admin/rate-limits/global',
        function (Request $request) {
            return (new RateLimitController())->updateGlobal($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PATCH']
    );
};
