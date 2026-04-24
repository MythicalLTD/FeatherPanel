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
use App\Controllers\Admin\KPI\FeatureController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-tickets-dashboard',
        '/api/admin/analytics/tickets/dashboard',
        function (Request $request) {
            return (new FeatureController())->getTicketsDashboard($request);
        },
        Permissions::ADMIN_DASHBOARD_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-plugins-dashboard',
        '/api/admin/analytics/plugins/dashboard',
        function (Request $request) {
            return (new FeatureController())->getPluginsDashboard($request);
        },
        Permissions::ADMIN_DASHBOARD_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-knowledgebase-dashboard',
        '/api/admin/analytics/knowledgebase/dashboard',
        function (Request $request) {
            return (new FeatureController())->getKnowledgebaseDashboard($request);
        },
        Permissions::ADMIN_DASHBOARD_VIEW,
    );
};
