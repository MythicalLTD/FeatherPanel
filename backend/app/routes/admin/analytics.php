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
use App\Controllers\Admin\LanguageAnalyticsController;

return function (RouteCollection $routes): void {
    // LANGUAGE ANALYTICS - GET /api/admin/analytics/languages
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-languages',
        '/api/admin/analytics/languages',
        function (Request $request) {
            return (new LanguageAnalyticsController())->index($request);
        },
        Permissions::ADMIN_STATISTICS_VIEW,
    );

    // LANGUAGE TRENDS - GET /api/admin/analytics/languages/trends
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-languages-trends',
        '/api/admin/analytics/languages/trends',
        function (Request $request) {
            return (new LanguageAnalyticsController())->trends($request);
        },
        Permissions::ADMIN_STATISTICS_VIEW,
    );
};
