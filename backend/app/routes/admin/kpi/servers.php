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
use App\Controllers\Admin\KPI\ServerController;

return function (RouteCollection $routes): void {
    // Servers Overview
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-overview',
        '/api/admin/analytics/servers/overview',
        function (Request $request) {
            return (new ServerController())->getServersOverview($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Servers by Realm
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-by-realm',
        '/api/admin/analytics/servers/by-realm',
        function (Request $request) {
            return (new ServerController())->getServersByRealm($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Servers by Spell
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-by-spell',
        '/api/admin/analytics/servers/by-spell',
        function (Request $request) {
            return (new ServerController())->getServersBySpell($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Database Usage Per Server
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-database-usage',
        '/api/admin/analytics/servers/database-usage',
        function (Request $request) {
            return (new ServerController())->getDatabaseUsage($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Allocation Usage Per Server
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-allocation-usage',
        '/api/admin/analytics/servers/allocation-usage',
        function (Request $request) {
            return (new ServerController())->getAllocationUsage($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Resource Usage
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-resources',
        '/api/admin/analytics/servers/resources',
        function (Request $request) {
            return (new ServerController())->getResourceUsage($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Status Distribution
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-status',
        '/api/admin/analytics/servers/status',
        function (Request $request) {
            return (new ServerController())->getStatusDistribution($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Docker Image Usage
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-images',
        '/api/admin/analytics/servers/images',
        function (Request $request) {
            return (new ServerController())->getImageUsage($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Limits Distribution
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-limits',
        '/api/admin/analytics/servers/limits',
        function (Request $request) {
            return (new ServerController())->getLimitsDistribution($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Complete Server Dashboard
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-dashboard',
        '/api/admin/analytics/servers/dashboard',
        function (Request $request) {
            return (new ServerController())->getDashboard($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Backup Usage
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-backups',
        '/api/admin/analytics/servers/backups',
        function (Request $request) {
            return (new ServerController())->getBackupUsage($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Schedule Usage
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-schedules',
        '/api/admin/analytics/servers/schedules',
        function (Request $request) {
            return (new ServerController())->getScheduleUsage($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Subuser Stats
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-subusers',
        '/api/admin/analytics/servers/subusers',
        function (Request $request) {
            return (new ServerController())->getSubuserStats($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Server Activity Stats
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-server-activities',
        '/api/admin/analytics/servers/server-activities',
        function (Request $request) {
            return (new ServerController())->getServerActivityStats($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Variable Stats
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-variables',
        '/api/admin/analytics/servers/variables',
        function (Request $request) {
            return (new ServerController())->getVariableStats($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Server Creation Trend
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-creation-trend',
        '/api/admin/analytics/servers/creation-trend',
        function (Request $request) {
            return (new ServerController())->getCreationTrend($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Resource Trends
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-resource-trends',
        '/api/admin/analytics/servers/resource-trends',
        function (Request $request) {
            return (new ServerController())->getResourceTrends($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Age Distribution
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-age-distribution',
        '/api/admin/analytics/servers/age-distribution',
        function (Request $request) {
            return (new ServerController())->getAgeDistribution($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Resource Distribution
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-resource-distribution',
        '/api/admin/analytics/servers/resource-distribution',
        function (Request $request) {
            return (new ServerController())->getResourceDistribution($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Installation Stats
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-installation',
        '/api/admin/analytics/servers/installation',
        function (Request $request) {
            return (new ServerController())->getInstallationStats($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );

    // Configuration Patterns
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-servers-configuration',
        '/api/admin/analytics/servers/configuration',
        function (Request $request) {
            return (new ServerController())->getConfigurationPatterns($request);
        },
        Permissions::ADMIN_SERVERS_VIEW,
    );
};
