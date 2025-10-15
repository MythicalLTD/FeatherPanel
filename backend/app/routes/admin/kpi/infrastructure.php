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
