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
use App\Controllers\Admin\KPI\InfrastructureController;

return function (RouteCollection $routes): void {
    // Locations Analytics
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-locations-overview',
        '/api/admin/analytics/locations/overview',
        function (Request $request) {
            return (new InfrastructureController())->getLocationsOverview($request);
        },
        Permissions::ADMIN_LOCATIONS_VIEW,
    );

    // Nodes Analytics
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-nodes-overview',
        '/api/admin/analytics/nodes/overview',
        function (Request $request) {
            return (new InfrastructureController())->getNodesOverview($request);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-nodes-by-location',
        '/api/admin/analytics/nodes/by-location',
        function (Request $request) {
            return (new InfrastructureController())->getNodesByLocation($request);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-nodes-resources',
        '/api/admin/analytics/nodes/resources',
        function (Request $request) {
            return (new InfrastructureController())->getNodeResources($request);
        },
        Permissions::ADMIN_NODES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-by-node',
        '/api/admin/analytics/servers/by-node',
        function (Request $request) {
            return (new InfrastructureController())->getServersByNode($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Allocations Analytics
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-allocations-overview',
        '/api/admin/analytics/allocations/overview',
        function (Request $request) {
            return (new InfrastructureController())->getAllocationsOverview($request);
        },
        Permissions::ADMIN_ALLOCATIONS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-allocations-by-node',
        '/api/admin/analytics/allocations/by-node',
        function (Request $request) {
            return (new InfrastructureController())->getAllocationsByNode($request);
        },
        Permissions::ADMIN_ALLOCATIONS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-ports-usage',
        '/api/admin/analytics/ports/usage',
        function (Request $request) {
            return (new InfrastructureController())->getPortUsage($request);
        },
        Permissions::ADMIN_ALLOCATIONS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-ips-usage',
        '/api/admin/analytics/ips/usage',
        function (Request $request) {
            return (new InfrastructureController())->getIpUsage($request);
        },
        Permissions::ADMIN_ALLOCATIONS_VIEW,
    );

    // Databases Analytics
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-databases-overview',
        '/api/admin/analytics/databases/overview',
        function (Request $request) {
            return (new InfrastructureController())->getDatabasesOverview($request);
        },
        Permissions::ADMIN_DATABASES_VIEW,
    );

    // Complete Infrastructure Dashboard
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-infrastructure-dashboard',
        '/api/admin/analytics/infrastructure/dashboard',
        function (Request $request) {
            return (new InfrastructureController())->getDashboard($request);
        },
        Permissions::ADMIN_NODES_VIEW,
    );
};
