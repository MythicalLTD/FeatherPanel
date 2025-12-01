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
