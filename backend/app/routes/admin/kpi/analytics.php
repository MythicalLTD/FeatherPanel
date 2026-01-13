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
use App\Controllers\Admin\KPI\AnalyticsController;

return function (RouteCollection $routes): void {
    // User Analytics Overview
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-users-overview',
        '/api/admin/analytics/users/overview',
        function (Request $request) {
            return (new AnalyticsController())->getUserOverview($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // User Distribution by Role
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-users-by-role',
        '/api/admin/analytics/users/by-role',
        function (Request $request) {
            return (new AnalyticsController())->getUsersByRole($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // User Registration Trend
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-users-registration-trend',
        '/api/admin/analytics/users/registration-trend',
        function (Request $request) {
            return (new AnalyticsController())->getRegistrationTrend($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // Top Users by Server Count
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-users-top-by-servers',
        '/api/admin/analytics/users/top-by-servers',
        function (Request $request) {
            return (new AnalyticsController())->getTopUsersByServers($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // User Activity Summary
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-users-activity',
        '/api/admin/analytics/users/activity',
        function (Request $request) {
            return (new AnalyticsController())->getUserActivity($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // Comprehensive Analytics Dashboard
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-users-dashboard',
        '/api/admin/analytics/users/dashboard',
        function (Request $request) {
            return (new AnalyticsController())->getDashboard($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // Banned Users Statistics
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-users-banned',
        '/api/admin/analytics/users/banned',
        function (Request $request) {
            return (new AnalyticsController())->getBannedUsers($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // Security Statistics
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-users-security',
        '/api/admin/analytics/users/security',
        function (Request $request) {
            return (new AnalyticsController())->getSecurityStats($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // Growth Rate Statistics
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-users-growth',
        '/api/admin/analytics/users/growth',
        function (Request $request) {
            return (new AnalyticsController())->getGrowthRate($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // Activity Analytics

    // Activity Trend
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-activity-trend',
        '/api/admin/analytics/activity/trend',
        function (Request $request) {
            return (new AnalyticsController())->getActivityTrend($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // Top Activities
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-activity-top',
        '/api/admin/analytics/activity/top',
        function (Request $request) {
            return (new AnalyticsController())->getTopActivities($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // Activity Breakdown
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-activity-breakdown',
        '/api/admin/analytics/activity/breakdown',
        function (Request $request) {
            return (new AnalyticsController())->getActivityBreakdown($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // Recent Activities
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-activity-recent',
        '/api/admin/analytics/activity/recent',
        function (Request $request) {
            return (new AnalyticsController())->getRecentActivities($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // Activity Stats
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-activity-stats',
        '/api/admin/analytics/activity/stats',
        function (Request $request) {
            return (new AnalyticsController())->getActivityStats($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );

    // Hourly Activity
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-activity-hourly',
        '/api/admin/analytics/activity/hourly',
        function (Request $request) {
            return (new AnalyticsController())->getHourlyActivity($request);
        },
        Permissions::ADMIN_USERS_VIEW,
    );
};
