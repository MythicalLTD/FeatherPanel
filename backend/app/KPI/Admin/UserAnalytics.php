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

namespace App\KPI\Admin;

use App\Chat\Role;
use App\Chat\User;
use App\Chat\Server;
use App\Chat\Database;

/**
 * User Analytics and KPI service for generating user statistics and metrics.
 */
class UserAnalytics
{
    /**
     * Get total user count statistics.
     *
     * @return array Statistics including total, active, banned, verified, and 2FA enabled users
     */
    public static function getTotalUsers(): array
    {
        $pdo = Database::getPdoConnection();

        // Total users
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_users WHERE deleted = 'false'");
        $total = (int) $stmt->fetchColumn();

        // Banned users
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_users WHERE banned = 'true' AND deleted = 'false'");
        $banned = (int) $stmt->fetchColumn();

        // Active users (not banned)
        $active = $total - $banned;

        // Verified users (mail_verify column stores verification code, empty means verified)
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_users WHERE (mail_verify = '' OR mail_verify IS NULL) AND deleted = 'false'");
        $verified = (int) $stmt->fetchColumn();

        // 2FA enabled users
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_users WHERE two_fa_enabled = 'true' AND deleted = 'false'");
        $twoFaEnabled = (int) $stmt->fetchColumn();

        return [
            'total' => $total,
            'active' => $active,
            'banned' => $banned,
            'verified' => $verified,
            'two_fa_enabled' => $twoFaEnabled,
            'unverified' => $total - $verified,
            'percentage_verified' => $total > 0 ? round(($verified / $total) * 100, 2) : 0,
            'percentage_banned' => $total > 0 ? round(($banned / $total) * 100, 2) : 0,
            'percentage_two_fa' => $total > 0 ? round(($twoFaEnabled / $total) * 100, 2) : 0,
        ];
    }

    /**
     * Get user distribution by roles.
     *
     * @return array Role distribution with counts and percentages
     */
    public static function getUsersByRole(): array
    {
        $pdo = Database::getPdoConnection();

        // Get role distribution with JOIN
        $stmt = $pdo->query("
            SELECT 
                r.id as role_id,
                r.name as role_name,
                r.display_name as role_display_name,
                r.color as role_color,
                COUNT(u.id) as user_count
            FROM featherpanel_roles r
            LEFT JOIN featherpanel_users u ON r.id = u.role_id AND u.deleted = 'false'
            GROUP BY r.id, r.name, r.display_name, r.color
            ORDER BY user_count DESC
        ");

        $distribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Calculate total and percentages
        $totalUsers = array_sum(array_column($distribution, 'user_count'));

        foreach ($distribution as &$item) {
            $item['user_count'] = (int) $item['user_count'];
            $item['percentage'] = $totalUsers > 0 ? round(($item['user_count'] / $totalUsers) * 100, 2) : 0;
        }

        return [
            'total_users' => $totalUsers,
            'roles' => $distribution,
        ];
    }

    /**
     * Get user registration trends over time.
     *
     * @param int $days Number of days to look back (default: 30)
     *
     * @return array Daily registration counts
     */
    public static function getRegistrationTrend(int $days = 30): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare("
            SELECT 
                DATE(first_seen) as date,
                COUNT(*) as count
            FROM featherpanel_users
            WHERE first_seen >= DATE_SUB(NOW(), INTERVAL :days DAY)
            AND deleted = 'false'
            GROUP BY DATE(first_seen)
            ORDER BY date ASC
        ");
        $stmt->execute(['days' => $days]);
        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'period_days' => $days,
            'data' => $results,
            'total_new_users' => array_sum(array_column($results, 'count')),
        ];
    }

    /**
     * Get top users by server count.
     *
     * @param int $limit Number of top users to retrieve (default: 10)
     *
     * @return array Top users with server counts
     */
    public static function getTopUsersByServers(int $limit = 10): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare("
            SELECT 
                u.id,
                u.uuid,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.role_id,
                r.name as role_name,
                r.display_name as role_display_name,
                r.color as role_color,
                COUNT(s.id) as server_count
            FROM featherpanel_users u
            LEFT JOIN featherpanel_servers s ON u.id = s.owner_id
            LEFT JOIN featherpanel_roles r ON u.role_id = r.id
            WHERE u.deleted = 'false'
            GROUP BY u.id, u.uuid, u.username, u.email, u.first_name, u.last_name, u.role_id, r.name, r.display_name, r.color
            ORDER BY server_count DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Convert server_count to integer
        foreach ($users as &$user) {
            $user['server_count'] = (int) $user['server_count'];
        }

        return [
            'limit' => $limit,
            'users' => $users,
        ];
    }

    /**
     * Get user activity summary (recent registrations, logins, etc).
     *
     * @param int $hours Number of hours to look back (default: 24)
     *
     * @return array Activity summary
     */
    public static function getUserActivity(int $hours = 24): array
    {
        $pdo = Database::getPdoConnection();

        // New users in last X hours (using first_seen)
        $stmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM featherpanel_users 
            WHERE first_seen >= DATE_SUB(NOW(), INTERVAL :hours HOUR)
            AND deleted = 'false'
        ");
        $stmt->execute(['hours' => $hours]);
        $newUsers = (int) $stmt->fetchColumn();

        // Users with recent activity (using last_seen)
        $stmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM featherpanel_users 
            WHERE last_seen >= DATE_SUB(NOW(), INTERVAL :hours HOUR)
            AND deleted = 'false'
        ");
        $stmt->execute(['hours' => $hours]);
        $activeUsers = (int) $stmt->fetchColumn();

        return [
            'period_hours' => $hours,
            'new_users' => $newUsers,
            'active_users' => $activeUsers,
        ];
    }

    /**
     * Get comprehensive user statistics dashboard.
     *
     * @return array Complete dashboard statistics
     */
    public static function getDashboardStats(): array
    {
        return [
            'overview' => self::getTotalUsers(),
            'by_role' => self::getUsersByRole(),
            'registration_trend_7d' => self::getRegistrationTrend(7),
            'registration_trend_30d' => self::getRegistrationTrend(30),
            'top_users' => self::getTopUsersByServers(10),
            'activity_24h' => self::getUserActivity(24),
            'activity_7d' => self::getUserActivity(168), // 7 days
        ];
    }

    /**
     * Get banned users statistics and list.
     *
     * @param int $limit Number of recent banned users to retrieve (default: 20)
     *
     * @return array Banned users statistics
     */
    public static function getBannedUsersStats(int $limit = 20): array
    {
        $pdo = Database::getPdoConnection();

        // Total banned count
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_users WHERE banned = 'true' AND deleted = 'false'");
        $totalBanned = (int) $stmt->fetchColumn();

        // Get recent banned users with role information
        $stmt = $pdo->prepare("
            SELECT 
                u.id,
                u.uuid,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.role_id,
                r.name as role_name,
                r.display_name as role_display_name,
                r.color as role_color,
                u.first_seen,
                u.last_seen
            FROM featherpanel_users u
            LEFT JOIN featherpanel_roles r ON u.role_id = r.id
            WHERE u.banned = 'true' AND u.deleted = 'false'
            ORDER BY u.last_seen DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        $bannedUsers = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Get ban trend (last 30 days) - using last_seen as proxy for ban date
        $stmt = $pdo->query("
            SELECT 
                DATE(last_seen) as date,
                COUNT(*) as count
            FROM featherpanel_users
            WHERE banned = 'true' 
            AND deleted = 'false'
            AND last_seen >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(last_seen)
            ORDER BY date ASC
        ");
        $banTrend = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'total_banned' => $totalBanned,
            'recent_banned_users' => $bannedUsers,
            'ban_trend_30d' => $banTrend,
        ];
    }

    /**
     * Get security statistics (2FA, email verification).
     *
     * @return array Security metrics
     */
    public static function getSecurityStats(): array
    {
        $pdo = Database::getPdoConnection();

        // Total users
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_users WHERE deleted = 'false'");
        $total = (int) $stmt->fetchColumn();

        // 2FA enabled
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_users WHERE two_fa_enabled = 'true' AND deleted = 'false'");
        $twoFaEnabled = (int) $stmt->fetchColumn();

        // Email verified (mail_verify column stores verification code, empty means verified)
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_users WHERE (mail_verify = '' OR mail_verify IS NULL) AND deleted = 'false'");
        $emailVerified = (int) $stmt->fetchColumn();

        // Both 2FA and email verified
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_users WHERE two_fa_enabled = 'true' AND (mail_verify = '' OR mail_verify IS NULL) AND deleted = 'false'");
        $fullySecured = (int) $stmt->fetchColumn();

        // Neither 2FA nor email verified
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_users WHERE two_fa_enabled = 'false' AND mail_verify IS NOT NULL AND mail_verify != '' AND deleted = 'false'");
        $notSecured = (int) $stmt->fetchColumn();

        return [
            'total_users' => $total,
            'two_fa_enabled' => $twoFaEnabled,
            'email_verified' => $emailVerified,
            'fully_secured' => $fullySecured,
            'not_secured' => $notSecured,
            'percentage_two_fa' => $total > 0 ? round(($twoFaEnabled / $total) * 100, 2) : 0,
            'percentage_email_verified' => $total > 0 ? round(($emailVerified / $total) * 100, 2) : 0,
            'percentage_fully_secured' => $total > 0 ? round(($fullySecured / $total) * 100, 2) : 0,
            'percentage_not_secured' => $total > 0 ? round(($notSecured / $total) * 100, 2) : 0,
        ];
    }

    /**
     * Get user growth rate statistics.
     *
     * @return array Growth rate metrics
     */
    public static function getGrowthRate(): array
    {
        $pdo = Database::getPdoConnection();

        // Users created in last 7 days (using first_seen)
        $stmt = $pdo->query("
            SELECT COUNT(*) 
            FROM featherpanel_users 
            WHERE first_seen >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND deleted = 'false'
        ");
        $last7Days = (int) $stmt->fetchColumn();

        // Users created 7-14 days ago
        $stmt = $pdo->query("
            SELECT COUNT(*) 
            FROM featherpanel_users 
            WHERE first_seen >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            AND first_seen < DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND deleted = 'false'
        ");
        $previous7Days = (int) $stmt->fetchColumn();

        // Users created in last 30 days
        $stmt = $pdo->query("
            SELECT COUNT(*) 
            FROM featherpanel_users 
            WHERE first_seen >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            AND deleted = 'false'
        ");
        $last30Days = (int) $stmt->fetchColumn();

        // Users created 30-60 days ago
        $stmt = $pdo->query("
            SELECT COUNT(*) 
            FROM featherpanel_users 
            WHERE first_seen >= DATE_SUB(NOW(), INTERVAL 60 DAY)
            AND first_seen < DATE_SUB(NOW(), INTERVAL 30 DAY)
            AND deleted = 'false'
        ");
        $previous30Days = (int) $stmt->fetchColumn();

        // Calculate growth rates
        $growthRate7d = $previous7Days > 0
            ? round((($last7Days - $previous7Days) / $previous7Days) * 100, 2)
            : ($last7Days > 0 ? 100 : 0);

        $growthRate30d = $previous30Days > 0
            ? round((($last30Days - $previous30Days) / $previous30Days) * 100, 2)
            : ($last30Days > 0 ? 100 : 0);

        return [
            'last_7_days' => $last7Days,
            'previous_7_days' => $previous7Days,
            'growth_rate_7d' => $growthRate7d,
            'last_30_days' => $last30Days,
            'previous_30_days' => $previous30Days,
            'growth_rate_30d' => $growthRate30d,
        ];
    }

    /**
     * Get activity trends over time.
     *
     * @param int $days Number of days to look back (default: 7)
     *
     * @return array Daily activity counts
     */
    public static function getActivityTrend(int $days = 7): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare('
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM featherpanel_activity
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ');
        $stmt->execute(['days' => $days]);
        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'period_days' => $days,
            'data' => $results,
            'total_activities' => array_sum(array_column($results, 'count')),
        ];
    }

    /**
     * Get top activities by type.
     *
     * @param int $limit Number of top activities to retrieve (default: 10)
     *
     * @return array Top activities with counts
     */
    public static function getTopActivities(int $limit = 10): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare('
            SELECT 
                name,
                COUNT(*) as count
            FROM featherpanel_activity
            GROUP BY name
            ORDER BY count DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        $activities = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Convert count to integer
        foreach ($activities as &$activity) {
            $activity['count'] = (int) $activity['count'];
        }

        return [
            'limit' => $limit,
            'activities' => $activities,
        ];
    }

    /**
     * Get activity breakdown by type (for pie chart).
     *
     * @return array Activity distribution
     */
    public static function getActivityBreakdown(): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->query('
            SELECT 
                name,
                COUNT(*) as count,
                ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM featherpanel_activity)), 2) as percentage
            FROM featherpanel_activity
            GROUP BY name
            ORDER BY count DESC
            LIMIT 10
        ');
        $activities = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Convert count to integer
        foreach ($activities as &$activity) {
            $activity['count'] = (int) $activity['count'];
            $activity['percentage'] = (float) $activity['percentage'];
        }

        return [
            'activities' => $activities,
            'total_activities' => array_sum(array_column($activities, 'count')),
        ];
    }

    /**
     * Get recent activities with user information.
     *
     * @param int $limit Number of recent activities to retrieve (default: 20)
     *
     * @return array Recent activities
     */
    public static function getRecentActivities(int $limit = 20): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare('
            SELECT 
                a.id,
                a.name,
                a.context,
                a.ip_address,
                a.created_at,
                u.username,
                u.email,
                u.avatar,
                r.display_name as role_name,
                r.color as role_color
            FROM featherpanel_activity a
            LEFT JOIN featherpanel_users u ON a.user_uuid = u.uuid
            LEFT JOIN featherpanel_roles r ON u.role_id = r.id
            ORDER BY a.created_at DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        $activities = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'limit' => $limit,
            'activities' => $activities,
        ];
    }

    /**
     * Get activity statistics summary.
     *
     * @return array Activity statistics
     */
    public static function getActivityStats(): array
    {
        $pdo = Database::getPdoConnection();

        // Total activities
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_activity');
        $total = (int) $stmt->fetchColumn();

        // Activities today
        $stmt = $pdo->query('
            SELECT COUNT(*) 
            FROM featherpanel_activity 
            WHERE DATE(created_at) = CURDATE()
        ');
        $today = (int) $stmt->fetchColumn();

        // Activities this week
        $stmt = $pdo->query('
            SELECT COUNT(*) 
            FROM featherpanel_activity 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ');
        $thisWeek = (int) $stmt->fetchColumn();

        // Activities this month
        $stmt = $pdo->query('
            SELECT COUNT(*) 
            FROM featherpanel_activity 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ');
        $thisMonth = (int) $stmt->fetchColumn();

        // Unique users with activity today
        $stmt = $pdo->query('
            SELECT COUNT(DISTINCT user_uuid) 
            FROM featherpanel_activity 
            WHERE DATE(created_at) = CURDATE()
        ');
        $activeUsersToday = (int) $stmt->fetchColumn();

        // Most active hour of day
        $stmt = $pdo->query('
            SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as count
            FROM featherpanel_activity
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY HOUR(created_at)
            ORDER BY count DESC
            LIMIT 1
        ');
        $peakHourData = $stmt->fetch(\PDO::FETCH_ASSOC);
        $peakHour = $peakHourData ? (int) $peakHourData['hour'] : 0;

        return [
            'total' => $total,
            'today' => $today,
            'this_week' => $thisWeek,
            'this_month' => $thisMonth,
            'active_users_today' => $activeUsersToday,
            'peak_hour' => $peakHour,
        ];
    }

    /**
     * Get hourly activity distribution (for heatmap).
     *
     * @param int $days Number of days to look back (default: 7)
     *
     * @return array Hourly activity distribution
     */
    public static function getHourlyActivity(int $days = 7): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare('
            SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as count
            FROM featherpanel_activity
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
            GROUP BY HOUR(created_at)
            ORDER BY hour ASC
        ');
        $stmt->execute(['days' => $days]);
        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Fill in missing hours with 0
        $hourlyData = array_fill(0, 24, 0);
        foreach ($results as $row) {
            $hourlyData[(int) $row['hour']] = (int) $row['count'];
        }

        // Convert to array format for chart
        $chartData = [];
        foreach ($hourlyData as $hour => $count) {
            $chartData[] = [
                'hour' => $hour,
                'count' => $count,
                'label' => sprintf('%02d:00', $hour),
            ];
        }

        return [
            'period_days' => $days,
            'data' => $chartData,
        ];
    }
}
