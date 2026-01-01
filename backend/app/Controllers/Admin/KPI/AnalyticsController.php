<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

namespace App\Controllers\Admin\KPI;

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\KPI\Admin\UserAnalytics;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'UserAnalyticsOverview',
    type: 'object',
    properties: [
        new OA\Property(property: 'total', type: 'integer', description: 'Total user count'),
        new OA\Property(property: 'active', type: 'integer', description: 'Active users (not banned)'),
        new OA\Property(property: 'banned', type: 'integer', description: 'Banned users'),
        new OA\Property(property: 'verified', type: 'integer', description: 'Email verified users'),
        new OA\Property(property: 'two_fa_enabled', type: 'integer', description: 'Users with 2FA enabled'),
        new OA\Property(property: 'unverified', type: 'integer', description: 'Unverified users'),
        new OA\Property(property: 'percentage_verified', type: 'number', format: 'float', description: 'Percentage of verified users'),
        new OA\Property(property: 'percentage_banned', type: 'number', format: 'float', description: 'Percentage of banned users'),
        new OA\Property(property: 'percentage_two_fa', type: 'number', format: 'float', description: 'Percentage of users with 2FA'),
    ]
)]
#[OA\Schema(
    schema: 'RoleDistribution',
    type: 'object',
    properties: [
        new OA\Property(property: 'role_id', type: 'integer', description: 'Role ID'),
        new OA\Property(property: 'role_name', type: 'string', description: 'Role name'),
        new OA\Property(property: 'role_display_name', type: 'string', description: 'Role display name'),
        new OA\Property(property: 'role_color', type: 'string', description: 'Role color'),
        new OA\Property(property: 'user_count', type: 'integer', description: 'Number of users with this role'),
        new OA\Property(property: 'percentage', type: 'number', format: 'float', description: 'Percentage of total users'),
    ]
)]
#[OA\Schema(
    schema: 'RegistrationTrend',
    type: 'object',
    properties: [
        new OA\Property(property: 'date', type: 'string', format: 'date', description: 'Date'),
        new OA\Property(property: 'count', type: 'integer', description: 'Number of registrations'),
    ]
)]
#[OA\Schema(
    schema: 'TopUser',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'User ID'),
        new OA\Property(property: 'uuid', type: 'string', description: 'User UUID'),
        new OA\Property(property: 'username', type: 'string', description: 'Username'),
        new OA\Property(property: 'email', type: 'string', description: 'Email address'),
        new OA\Property(property: 'first_name', type: 'string', description: 'First name'),
        new OA\Property(property: 'last_name', type: 'string', description: 'Last name'),
        new OA\Property(property: 'server_count', type: 'integer', description: 'Number of servers owned'),
    ]
)]
class AnalyticsController
{
    #[OA\Get(
        path: '/api/admin/analytics/users/overview',
        summary: 'Get user analytics overview',
        description: 'Retrieve comprehensive overview of user statistics including total, active, banned, verified, and 2FA enabled users.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'User analytics overview retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/UserAnalyticsOverview')
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getUserOverview(Request $request): Response
    {
        $stats = UserAnalytics::getTotalUsers();

        return ApiResponse::success($stats, 'User overview fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/users/by-role',
        summary: 'Get user distribution by roles',
        description: 'Retrieve user distribution across different roles with counts and percentages.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'User role distribution retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'total_users', type: 'integer', description: 'Total number of users'),
                        new OA\Property(property: 'roles', type: 'array', items: new OA\Items(ref: '#/components/schemas/RoleDistribution')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getUsersByRole(Request $request): Response
    {
        $stats = UserAnalytics::getUsersByRole();

        return ApiResponse::success($stats, 'User role distribution fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/users/registration-trend',
        summary: 'Get user registration trend',
        description: 'Retrieve user registration trends over a specified time period.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'days',
                in: 'query',
                description: 'Number of days to look back (default: 30)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 365, default: 30)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Registration trend retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'period_days', type: 'integer', description: 'Number of days in the period'),
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/RegistrationTrend')),
                        new OA\Property(property: 'total_new_users', type: 'integer', description: 'Total new users in the period'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid days parameter'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getRegistrationTrend(Request $request): Response
    {
        $days = (int) $request->query->get('days', 30);

        if ($days < 1 || $days > 365) {
            return ApiResponse::error('Days must be between 1 and 365', 'INVALID_DAYS_PARAMETER', 400);
        }

        $stats = UserAnalytics::getRegistrationTrend($days);

        return ApiResponse::success($stats, 'Registration trend fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/users/top-by-servers',
        summary: 'Get top users by server count',
        description: 'Retrieve the users with the most servers.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of top users to retrieve (default: 10)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 10)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Top users retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'limit', type: 'integer', description: 'Limit applied'),
                        new OA\Property(property: 'users', type: 'array', items: new OA\Items(ref: '#/components/schemas/TopUser')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid limit parameter'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getTopUsersByServers(Request $request): Response
    {
        $limit = (int) $request->query->get('limit', 10);

        if ($limit < 1 || $limit > 100) {
            return ApiResponse::error('Limit must be between 1 and 100', 'INVALID_LIMIT_PARAMETER', 400);
        }

        $stats = UserAnalytics::getTopUsersByServers($limit);

        return ApiResponse::success($stats, 'Top users fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/users/activity',
        summary: 'Get user activity summary',
        description: 'Retrieve user activity summary for a specified time period.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'hours',
                in: 'query',
                description: 'Number of hours to look back (default: 24)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 720, default: 24)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'User activity retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'period_hours', type: 'integer', description: 'Number of hours in the period'),
                        new OA\Property(property: 'new_users', type: 'integer', description: 'New users in the period'),
                        new OA\Property(property: 'active_users', type: 'integer', description: 'Active users in the period'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid hours parameter'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getUserActivity(Request $request): Response
    {
        $hours = (int) $request->query->get('hours', 24);

        if ($hours < 1 || $hours > 720) {
            return ApiResponse::error('Hours must be between 1 and 720 (30 days)', 'INVALID_HOURS_PARAMETER', 400);
        }

        $stats = UserAnalytics::getUserActivity($hours);

        return ApiResponse::success($stats, 'User activity fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/users/dashboard',
        summary: 'Get comprehensive user analytics dashboard',
        description: 'Retrieve all user analytics data in a single comprehensive dashboard view.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Analytics dashboard retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'overview', ref: '#/components/schemas/UserAnalyticsOverview'),
                        new OA\Property(property: 'by_role', type: 'object', description: 'User distribution by role'),
                        new OA\Property(property: 'registration_trend_7d', type: 'object', description: '7-day registration trend'),
                        new OA\Property(property: 'registration_trend_30d', type: 'object', description: '30-day registration trend'),
                        new OA\Property(property: 'top_users', type: 'object', description: 'Top users by server count'),
                        new OA\Property(property: 'activity_24h', type: 'object', description: '24-hour activity summary'),
                        new OA\Property(property: 'activity_7d', type: 'object', description: '7-day activity summary'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getDashboard(Request $request): Response
    {
        $stats = UserAnalytics::getDashboardStats();

        return ApiResponse::success($stats, 'Analytics dashboard fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/users/banned',
        summary: 'Get banned users statistics',
        description: 'Retrieve statistics and information about banned users.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of recent banned users to retrieve (default: 20)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Banned users statistics retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'total_banned', type: 'integer', description: 'Total number of banned users'),
                        new OA\Property(property: 'recent_banned_users', type: 'array', items: new OA\Items(type: 'object'), description: 'Recently banned users'),
                        new OA\Property(property: 'ban_trend_30d', type: 'array', items: new OA\Items(type: 'object'), description: '30-day ban trend'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid limit parameter'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getBannedUsers(Request $request): Response
    {
        $limit = (int) $request->query->get('limit', 20);

        if ($limit < 1 || $limit > 100) {
            return ApiResponse::error('Limit must be between 1 and 100', 'INVALID_LIMIT_PARAMETER', 400);
        }

        $stats = UserAnalytics::getBannedUsersStats($limit);

        return ApiResponse::success($stats, 'Banned users statistics fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/users/security',
        summary: 'Get user security statistics',
        description: 'Retrieve statistics about user security features (2FA, email verification).',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Security statistics retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'total_users', type: 'integer', description: 'Total number of users'),
                        new OA\Property(property: 'two_fa_enabled', type: 'integer', description: 'Users with 2FA enabled'),
                        new OA\Property(property: 'email_verified', type: 'integer', description: 'Users with verified email'),
                        new OA\Property(property: 'fully_secured', type: 'integer', description: 'Users with both 2FA and email verified'),
                        new OA\Property(property: 'not_secured', type: 'integer', description: 'Users with neither 2FA nor email verified'),
                        new OA\Property(property: 'percentage_two_fa', type: 'number', format: 'float', description: 'Percentage with 2FA'),
                        new OA\Property(property: 'percentage_email_verified', type: 'number', format: 'float', description: 'Percentage with verified email'),
                        new OA\Property(property: 'percentage_fully_secured', type: 'number', format: 'float', description: 'Percentage fully secured'),
                        new OA\Property(property: 'percentage_not_secured', type: 'number', format: 'float', description: 'Percentage not secured'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getSecurityStats(Request $request): Response
    {
        $stats = UserAnalytics::getSecurityStats();

        return ApiResponse::success($stats, 'Security statistics fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/users/growth',
        summary: 'Get user growth rate statistics',
        description: 'Retrieve user growth rate statistics comparing recent periods.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Growth rate statistics retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'last_7_days', type: 'integer', description: 'New users in last 7 days'),
                        new OA\Property(property: 'previous_7_days', type: 'integer', description: 'New users in previous 7 days'),
                        new OA\Property(property: 'growth_rate_7d', type: 'number', format: 'float', description: '7-day growth rate percentage'),
                        new OA\Property(property: 'last_30_days', type: 'integer', description: 'New users in last 30 days'),
                        new OA\Property(property: 'previous_30_days', type: 'integer', description: 'New users in previous 30 days'),
                        new OA\Property(property: 'growth_rate_30d', type: 'number', format: 'float', description: '30-day growth rate percentage'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getGrowthRate(Request $request): Response
    {
        $stats = UserAnalytics::getGrowthRate();

        return ApiResponse::success($stats, 'Growth rate statistics fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/activity/trend',
        summary: 'Get activity trend over time',
        description: 'Retrieve activity trends for a specified time period.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'days',
                in: 'query',
                description: 'Number of days to look back (default: 7)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 90, default: 7)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Activity trend retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getActivityTrend(Request $request): Response
    {
        $days = (int) $request->query->get('days', 7);

        if ($days < 1 || $days > 90) {
            return ApiResponse::error('Days must be between 1 and 90', 'INVALID_DAYS_PARAMETER', 400);
        }

        $stats = UserAnalytics::getActivityTrend($days);

        return ApiResponse::success($stats, 'Activity trend fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/activity/top',
        summary: 'Get top activities by type',
        description: 'Retrieve the most common activity types.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of top activities to retrieve (default: 10)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 50, default: 10)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Top activities retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getTopActivities(Request $request): Response
    {
        $limit = (int) $request->query->get('limit', 10);

        if ($limit < 1 || $limit > 50) {
            return ApiResponse::error('Limit must be between 1 and 50', 'INVALID_LIMIT_PARAMETER', 400);
        }

        $stats = UserAnalytics::getTopActivities($limit);

        return ApiResponse::success($stats, 'Top activities fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/activity/breakdown',
        summary: 'Get activity breakdown by type',
        description: 'Retrieve activity distribution for pie chart visualization.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Activity breakdown retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getActivityBreakdown(Request $request): Response
    {
        $stats = UserAnalytics::getActivityBreakdown();

        return ApiResponse::success($stats, 'Activity breakdown fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/activity/recent',
        summary: 'Get recent activities',
        description: 'Retrieve recent user activities with user information.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of recent activities to retrieve (default: 20)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Recent activities retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getRecentActivities(Request $request): Response
    {
        $limit = (int) $request->query->get('limit', 20);

        if ($limit < 1 || $limit > 100) {
            return ApiResponse::error('Limit must be between 1 and 100', 'INVALID_LIMIT_PARAMETER', 400);
        }

        $stats = UserAnalytics::getRecentActivities($limit);

        return ApiResponse::success($stats, 'Recent activities fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/activity/stats',
        summary: 'Get activity statistics summary',
        description: 'Retrieve overall activity statistics.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(response: 200, description: 'Activity statistics retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getActivityStats(Request $request): Response
    {
        $stats = UserAnalytics::getActivityStats();

        return ApiResponse::success($stats, 'Activity statistics fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/activity/hourly',
        summary: 'Get hourly activity distribution',
        description: 'Retrieve activity distribution by hour for heatmap visualization.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(
                name: 'days',
                in: 'query',
                description: 'Number of days to look back (default: 7)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 30, default: 7)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Hourly activity retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getHourlyActivity(Request $request): Response
    {
        $days = (int) $request->query->get('days', 7);

        if ($days < 1 || $days > 30) {
            return ApiResponse::error('Days must be between 1 and 30', 'INVALID_DAYS_PARAMETER', 400);
        }

        $stats = UserAnalytics::getHourlyActivity($days);

        return ApiResponse::success($stats, 'Hourly activity fetched successfully', 200);
    }
}
