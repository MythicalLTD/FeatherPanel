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
use RateLimit\Rate;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Dashboard\DashboardOverviewController;
use App\Controllers\User\Dashboard\DashboardDefaultLayoutController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-dashboard-overview',
        '/api/user/dashboard/overview',
        function (Request $request) {
            return (new DashboardOverviewController())->overview($request);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-dashboard'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-dashboard-default-layout',
        '/api/user/dashboard/default-layout',
        function (Request $request) {
            return (new DashboardDefaultLayoutController())->show($request);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-dashboard'
    );
};
