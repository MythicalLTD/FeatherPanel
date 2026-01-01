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

namespace App\KPI\Admin;

use App\Chat\Database;

/**
 * Server Analytics and KPI service for server statistics and metrics.
 */
class ServerAnalytics
{
    /**
     * Get servers overview statistics.
     *
     * @return array Server statistics
     */
    public static function getServersOverview(): array
    {
        $pdo = Database::getPdoConnection();

        // Total servers
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers');
        $total = (int) $stmt->fetchColumn();

        // Servers by status
        $stmt = $pdo->query('
            SELECT 
                status,
                COUNT(*) as count
            FROM featherpanel_servers
            GROUP BY status
        ');
        $byStatus = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $statusCounts = [];
        foreach ($byStatus as $item) {
            $statusCounts[$item['status']] = (int) $item['count'];
        }

        // Suspended servers
        $suspended = $statusCounts['suspended'] ?? 0;

        // Running servers
        $running = $statusCounts['running'] ?? 0;

        // Installing servers
        $installing = $statusCounts['installing'] ?? 0;

        return [
            'total_servers' => $total,
            'running' => $running,
            'suspended' => $suspended,
            'installing' => $installing,
            'by_status' => $byStatus,
            'percentage_running' => $total > 0 ? round(($running / $total) * 100, 2) : 0,
            'percentage_suspended' => $total > 0 ? round(($suspended / $total) * 100, 2) : 0,
        ];
    }

    /**
     * Get servers by realm distribution.
     *
     * @return array Server distribution by realm
     */
    public static function getServersByRealm(): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->query('
            SELECT 
                r.id as realm_id,
                r.name as realm_name,
                r.description,
                COUNT(s.id) as server_count
            FROM featherpanel_realms r
            LEFT JOIN featherpanel_servers s ON r.id = s.realms_id
            GROUP BY r.id, r.name, r.description
            ORDER BY server_count DESC
        ');
        $distribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $totalServers = array_sum(array_column($distribution, 'server_count'));

        foreach ($distribution as &$item) {
            $item['server_count'] = (int) $item['server_count'];
            $item['percentage'] = $totalServers > 0 ? round(($item['server_count'] / $totalServers) * 100, 2) : 0;
        }

        return [
            'total_servers' => $totalServers,
            'realms' => $distribution,
        ];
    }

    /**
     * Get servers by spell distribution.
     *
     * @return array Server distribution by spell
     */
    public static function getServersBySpell(): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->query('
            SELECT 
                sp.id as spell_id,
                sp.name as spell_name,
                r.name as realm_name,
                COUNT(s.id) as server_count
            FROM featherpanel_spells sp
            LEFT JOIN featherpanel_servers s ON sp.id = s.spell_id
            LEFT JOIN featherpanel_realms r ON sp.realm_id = r.id
            GROUP BY sp.id, sp.name, r.name
            ORDER BY server_count DESC
            LIMIT 20
        ');
        $distribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($distribution as &$item) {
            $item['server_count'] = (int) $item['server_count'];
        }

        return [
            'spells' => $distribution,
        ];
    }

    /**
     * Get database usage per server statistics.
     *
     * @return array Database usage patterns
     */
    public static function getDatabaseUsagePerServer(): array
    {
        $pdo = Database::getPdoConnection();

        // Servers with database counts
        $stmt = $pdo->query('
            SELECT 
                COUNT(DISTINCT server_id) as servers_with_databases,
                AVG(db_count) as avg_databases_per_server,
                MAX(db_count) as max_databases_per_server
            FROM (
                SELECT 
                    server_id,
                    COUNT(*) as db_count
                FROM featherpanel_server_databases
                GROUP BY server_id
            ) as db_counts
        ');
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        // Total servers
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers');
        $totalServers = (int) $stmt->fetchColumn();

        // Servers without databases
        $serversWithDatabases = (int) ($result['servers_with_databases'] ?? 0);
        $serversWithoutDatabases = $totalServers - $serversWithDatabases;

        // Database count distribution
        $stmt = $pdo->query('
            SELECT 
                db_count,
                COUNT(*) as server_count
            FROM (
                SELECT 
                    server_id,
                    COUNT(*) as db_count
                FROM featherpanel_server_databases
                GROUP BY server_id
            ) as counts
            GROUP BY db_count
            ORDER BY db_count ASC
        ');
        $distribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($distribution as &$item) {
            $item['db_count'] = (int) $item['db_count'];
            $item['server_count'] = (int) $item['server_count'];
        }

        return [
            'total_servers' => $totalServers,
            'servers_with_databases' => $serversWithDatabases,
            'servers_without_databases' => $serversWithoutDatabases,
            'avg_databases_per_server' => round((float) ($result['avg_databases_per_server'] ?? 0), 2),
            'max_databases_per_server' => (int) ($result['max_databases_per_server'] ?? 0),
            'distribution' => $distribution,
        ];
    }

    /**
     * Get allocation usage per server statistics.
     *
     * @return array Allocation usage patterns
     */
    public static function getAllocationUsagePerServer(): array
    {
        $pdo = Database::getPdoConnection();

        // Servers with allocation counts (primary allocation is in servers table, additional in allocations table)
        $stmt = $pdo->query('
            SELECT 
                s.id as server_id,
                s.name as server_name,
                s.allocation_limit,
                COUNT(a.id) + 1 as allocation_count
            FROM featherpanel_servers s
            LEFT JOIN featherpanel_allocations a ON s.id = a.server_id AND a.id != s.allocation_id
            GROUP BY s.id, s.name, s.allocation_limit
            ORDER BY allocation_count DESC
            LIMIT 20
        ');
        $topServers = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($topServers as &$item) {
            $item['allocation_count'] = (int) $item['allocation_count'];
            $item['allocation_limit'] = $item['allocation_limit'] !== null ? (int) $item['allocation_limit'] : null;
        }

        // Average allocations per server
        $stmt = $pdo->query('
            SELECT 
                AVG(alloc_count) as avg_allocations,
                MAX(alloc_count) as max_allocations
            FROM (
                SELECT 
                    s.id,
                    COUNT(a.id) + 1 as alloc_count
                FROM featherpanel_servers s
                LEFT JOIN featherpanel_allocations a ON s.id = a.server_id AND a.id != s.allocation_id
                GROUP BY s.id
            ) as counts
        ');
        $stats = $stmt->fetch(\PDO::FETCH_ASSOC);

        return [
            'avg_allocations_per_server' => round((float) ($stats['avg_allocations'] ?? 1), 2),
            'max_allocations_per_server' => (int) ($stats['max_allocations'] ?? 1),
            'top_servers' => $topServers,
        ];
    }

    /**
     * Get server resource usage statistics.
     *
     * @return array Resource usage statistics
     */
    public static function getResourceUsage(): array
    {
        $pdo = Database::getPdoConnection();

        // Total resources allocated
        $stmt = $pdo->query('
            SELECT 
                COALESCE(SUM(memory), 0) as total_memory,
                COALESCE(SUM(disk), 0) as total_disk,
                COALESCE(SUM(cpu), 0) as total_cpu,
                COALESCE(AVG(memory), 0) as avg_memory,
                COALESCE(AVG(disk), 0) as avg_disk,
                COALESCE(AVG(cpu), 0) as avg_cpu
            FROM featherpanel_servers
        ');
        $resources = $stmt->fetch(\PDO::FETCH_ASSOC);

        // Servers with unlimited resources (0 = unlimited)
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE memory = 0 OR cpu = 0 OR disk = 0');
        $unlimitedServers = (int) $stmt->fetchColumn();

        return [
            'total_memory_mb' => (int) $resources['total_memory'],
            'total_disk_mb' => (int) $resources['total_disk'],
            'total_cpu_percent' => (int) $resources['total_cpu'],
            'avg_memory_mb' => round((float) $resources['avg_memory'], 2),
            'avg_disk_mb' => round((float) $resources['avg_disk'], 2),
            'avg_cpu_percent' => round((float) $resources['avg_cpu'], 2),
            'servers_with_unlimited' => $unlimitedServers,
        ];
    }

    /**
     * Get server status distribution.
     *
     * @return array Status distribution
     */
    public static function getStatusDistribution(): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->query('
            SELECT 
                status,
                COUNT(*) as count
            FROM featherpanel_servers
            GROUP BY status
            ORDER BY count DESC
        ');
        $distribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $total = array_sum(array_column($distribution, 'count'));

        foreach ($distribution as &$item) {
            $item['count'] = (int) $item['count'];
            $item['percentage'] = $total > 0 ? round(($item['count'] / $total) * 100, 2) : 0;
        }

        return [
            'total_servers' => $total,
            'statuses' => $distribution,
        ];
    }

    /**
     * Get Docker image usage statistics.
     *
     * @param int $limit Number of top images to retrieve (default: 10)
     *
     * @return array Image usage statistics
     */
    public static function getImageUsage(int $limit = 10): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare('
            SELECT 
                image,
                COUNT(*) as count
            FROM featherpanel_servers
            GROUP BY image
            ORDER BY count DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        $images = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($images as &$item) {
            $item['count'] = (int) $item['count'];
        }

        return [
            'limit' => $limit,
            'images' => $images,
        ];
    }

    /**
     * Get server limits distribution (backup and database limits).
     *
     * @return array Limits distribution
     */
    public static function getLimitsDistribution(): array
    {
        $pdo = Database::getPdoConnection();

        // Average limits
        $stmt = $pdo->query('
            SELECT 
                AVG(database_limit) as avg_database_limit,
                AVG(backup_limit) as avg_backup_limit,
                MAX(database_limit) as max_database_limit,
                MAX(backup_limit) as max_backup_limit
            FROM featherpanel_servers
        ');
        $limits = $stmt->fetch(\PDO::FETCH_ASSOC);

        // Servers with no database limit
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE database_limit = 0');
        $noDatabaseLimit = (int) $stmt->fetchColumn();

        // Servers with no backup limit
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE backup_limit = 0');
        $noBackupLimit = (int) $stmt->fetchColumn();

        return [
            'avg_database_limit' => round((float) $limits['avg_database_limit'], 2),
            'avg_backup_limit' => round((float) $limits['avg_backup_limit'], 2),
            'max_database_limit' => (int) $limits['max_database_limit'],
            'max_backup_limit' => (int) $limits['max_backup_limit'],
            'servers_no_database_limit' => $noDatabaseLimit,
            'servers_no_backup_limit' => $noBackupLimit,
        ];
    }

    /**
     * Get backup statistics per server.
     *
     * @return array Backup usage statistics
     */
    public static function getBackupUsage(): array
    {
        $pdo = Database::getPdoConnection();

        // Total backups
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_server_backups');
        $totalBackups = (int) $stmt->fetchColumn();

        // Servers with backups
        $stmt = $pdo->query('SELECT COUNT(DISTINCT server_id) FROM featherpanel_server_backups');
        $serversWithBackups = (int) $stmt->fetchColumn();

        // Total servers
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers');
        $totalServers = (int) $stmt->fetchColumn();

        // Average backups per server
        $avgBackups = $serversWithBackups > 0 ? round($totalBackups / $serversWithBackups, 2) : 0;

        // Top servers by backup count
        $stmt = $pdo->query('
            SELECT 
                s.id as server_id,
                s.name as server_name,
                s.backup_limit,
                COUNT(b.id) as backup_count
            FROM featherpanel_servers s
            LEFT JOIN featherpanel_server_backups b ON s.id = b.server_id
            GROUP BY s.id, s.name, s.backup_limit
            HAVING backup_count > 0
            ORDER BY backup_count DESC
            LIMIT 15
        ');
        $topServers = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($topServers as &$item) {
            $item['backup_count'] = (int) $item['backup_count'];
            $item['backup_limit'] = $item['backup_limit'] !== null ? (int) $item['backup_limit'] : null;
        }

        return [
            'total_backups' => $totalBackups,
            'servers_with_backups' => $serversWithBackups,
            'servers_without_backups' => $totalServers - $serversWithBackups,
            'avg_backups_per_server' => $avgBackups,
            'top_servers' => $topServers,
        ];
    }

    /**
     * Get schedule statistics per server.
     *
     * @return array Schedule usage statistics
     */
    public static function getScheduleUsage(): array
    {
        $pdo = Database::getPdoConnection();

        // Total schedules
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_server_schedules');
        $totalSchedules = (int) $stmt->fetchColumn();

        // Servers with schedules
        $stmt = $pdo->query('SELECT COUNT(DISTINCT server_id) FROM featherpanel_server_schedules');
        $serversWithSchedules = (int) $stmt->fetchColumn();

        // Total tasks
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_server_schedules_tasks');
        $totalTasks = (int) $stmt->fetchColumn();

        // Average schedules per server
        $avgSchedules = $serversWithSchedules > 0 ? round($totalSchedules / $serversWithSchedules, 2) : 0;

        // Top servers by schedule count
        $stmt = $pdo->query('
            SELECT 
                s.id as server_id,
                s.name as server_name,
                COUNT(sc.id) as schedule_count,
                (
                    SELECT COUNT(*) 
                    FROM featherpanel_server_schedules_tasks t 
                    WHERE t.schedule_id IN (
                        SELECT id FROM featherpanel_server_schedules WHERE server_id = s.id
                    )
                ) as task_count
            FROM featherpanel_servers s
            LEFT JOIN featherpanel_server_schedules sc ON s.id = sc.server_id
            GROUP BY s.id, s.name
            HAVING schedule_count > 0
            ORDER BY schedule_count DESC
            LIMIT 15
        ');
        $topServers = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($topServers as &$item) {
            $item['schedule_count'] = (int) $item['schedule_count'];
            $item['task_count'] = (int) $item['task_count'];
        }

        return [
            'total_schedules' => $totalSchedules,
            'total_tasks' => $totalTasks,
            'servers_with_schedules' => $serversWithSchedules,
            'avg_schedules_per_server' => $avgSchedules,
            'top_servers' => $topServers,
        ];
    }

    /**
     * Get subuser statistics.
     *
     * @return array Subuser statistics
     */
    public static function getSubuserStats(): array
    {
        $pdo = Database::getPdoConnection();

        // Total subusers
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_server_subusers');
        $totalSubusers = (int) $stmt->fetchColumn();

        // Servers with subusers
        $stmt = $pdo->query('SELECT COUNT(DISTINCT server_id) FROM featherpanel_server_subusers');
        $serversWithSubusers = (int) $stmt->fetchColumn();

        // Average subusers per server
        $avgSubusers = $serversWithSubusers > 0 ? round($totalSubusers / $serversWithSubusers, 2) : 0;

        // Top servers by subuser count
        $stmt = $pdo->query('
            SELECT 
                s.id as server_id,
                s.name as server_name,
                COUNT(su.id) as subuser_count
            FROM featherpanel_servers s
            LEFT JOIN featherpanel_server_subusers su ON s.id = su.server_id
            GROUP BY s.id, s.name
            HAVING subuser_count > 0
            ORDER BY subuser_count DESC
            LIMIT 15
        ');
        $topServers = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($topServers as &$item) {
            $item['subuser_count'] = (int) $item['subuser_count'];
        }

        return [
            'total_subusers' => $totalSubusers,
            'servers_with_subusers' => $serversWithSubusers,
            'avg_subusers_per_server' => $avgSubusers,
            'top_servers' => $topServers,
        ];
    }

    /**
     * Get server activity statistics.
     *
     * @return array Server activity statistics
     */
    public static function getServerActivityStats(): array
    {
        $pdo = Database::getPdoConnection();

        // Total server activities
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_server_activities');
        $totalActivities = (int) $stmt->fetchColumn();

        // Activities today
        $stmt = $pdo->query('
            SELECT COUNT(*) 
            FROM featherpanel_server_activities 
            WHERE DATE(created_at) = CURDATE()
        ');
        $today = (int) $stmt->fetchColumn();

        // Most active servers
        $stmt = $pdo->query('
            SELECT 
                s.id as server_id,
                s.name as server_name,
                COUNT(a.id) as activity_count
            FROM featherpanel_servers s
            LEFT JOIN featherpanel_server_activities a ON s.id = a.server_id
            GROUP BY s.id, s.name
            HAVING activity_count > 0
            ORDER BY activity_count DESC
            LIMIT 15
        ');
        $topServers = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($topServers as &$item) {
            $item['activity_count'] = (int) $item['activity_count'];
        }

        // Top event types
        $stmt = $pdo->query('
            SELECT 
                event,
                COUNT(*) as count
            FROM featherpanel_server_activities
            GROUP BY event
            ORDER BY count DESC
            LIMIT 10
        ');
        $topEvents = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($topEvents as &$item) {
            $item['count'] = (int) $item['count'];
        }

        return [
            'total_activities' => $totalActivities,
            'today' => $today,
            'top_servers' => $topServers,
            'top_events' => $topEvents,
        ];
    }

    /**
     * Get variable usage statistics.
     *
     * @return array Variable statistics
     */
    public static function getVariableStats(): array
    {
        $pdo = Database::getPdoConnection();

        // Total server variables
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_server_variables');
        $totalVariables = (int) $stmt->fetchColumn();

        // Average variables per server
        $stmt = $pdo->query('
            SELECT AVG(var_count) as avg_vars
            FROM (
                SELECT server_id, COUNT(*) as var_count
                FROM featherpanel_server_variables
                GROUP BY server_id
            ) as counts
        ');
        $avgVars = (float) $stmt->fetchColumn();

        // Top spell variables (most used)
        $stmt = $pdo->query('
            SELECT 
                sv.name,
                sv.env_variable,
                COUNT(v.id) as usage_count
            FROM featherpanel_spell_variables sv
            LEFT JOIN featherpanel_server_variables v ON sv.id = v.variable_id
            GROUP BY sv.id, sv.name, sv.env_variable
            ORDER BY usage_count DESC
            LIMIT 15
        ');
        $topVariables = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($topVariables as &$item) {
            $item['usage_count'] = (int) $item['usage_count'];
        }

        return [
            'total_variables' => $totalVariables,
            'avg_variables_per_server' => round($avgVars, 2),
            'top_variables' => $topVariables,
        ];
    }

    /**
     * Get server creation trends over time.
     *
     * @param int $days Number of days to look back (default: 30)
     *
     * @return array Daily server creation counts
     */
    public static function getServerCreationTrend(int $days = 30): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare('
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM featherpanel_servers
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ');
        $stmt->execute(['days' => $days]);
        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'period_days' => $days,
            'data' => $results,
            'total_new_servers' => array_sum(array_column($results, 'count')),
        ];
    }

    /**
     * Get resource allocation trends (average over time).
     *
     * @param int $days Number of days to look back (default: 30)
     *
     * @return array Resource trends
     */
    public static function getResourceTrends(int $days = 30): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare('
            SELECT 
                DATE(created_at) as date,
                AVG(memory) as avg_memory,
                AVG(disk) as avg_disk,
                AVG(cpu) as avg_cpu,
                COUNT(*) as server_count
            FROM featherpanel_servers
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ');
        $stmt->execute(['days' => $days]);
        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($results as &$item) {
            $item['avg_memory'] = round((float) $item['avg_memory'], 2);
            $item['avg_disk'] = round((float) $item['avg_disk'], 2);
            $item['avg_cpu'] = round((float) $item['avg_cpu'], 2);
            $item['server_count'] = (int) $item['server_count'];
        }

        return [
            'period_days' => $days,
            'data' => $results,
        ];
    }

    /**
     * Get server age distribution.
     *
     * @return array Server age statistics
     */
    public static function getServerAgeDistribution(): array
    {
        $pdo = Database::getPdoConnection();

        // Categorize servers by age
        $stmt = $pdo->query("
            SELECT 
                CASE
                    WHEN DATEDIFF(NOW(), created_at) <= 7 THEN 'Last 7 days'
                    WHEN DATEDIFF(NOW(), created_at) <= 30 THEN '8-30 days'
                    WHEN DATEDIFF(NOW(), created_at) <= 90 THEN '1-3 months'
                    WHEN DATEDIFF(NOW(), created_at) <= 180 THEN '3-6 months'
                    ELSE 'Over 6 months'
                END as age_group,
                COUNT(*) as count
            FROM featherpanel_servers
            GROUP BY age_group
            ORDER BY 
                CASE age_group
                    WHEN 'Last 7 days' THEN 1
                    WHEN '8-30 days' THEN 2
                    WHEN '1-3 months' THEN 3
                    WHEN '3-6 months' THEN 4
                    ELSE 5
                END
        ");
        $distribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($distribution as &$item) {
            $item['count'] = (int) $item['count'];
        }

        return [
            'distribution' => $distribution,
        ];
    }

    /**
     * Get resource distribution (how resources are allocated).
     *
     * @return array Resource distribution data
     */
    public static function getResourceDistribution(): array
    {
        $pdo = Database::getPdoConnection();

        // Memory distribution
        $stmt = $pdo->query("
            SELECT 
                CASE
                    WHEN memory = 0 THEN 'Unlimited'
                    WHEN memory <= 512 THEN '≤512 MB'
                    WHEN memory <= 1024 THEN '513-1024 MB'
                    WHEN memory <= 2048 THEN '1-2 GB'
                    WHEN memory <= 4096 THEN '2-4 GB'
                    WHEN memory <= 8192 THEN '4-8 GB'
                    ELSE '>8 GB'
                END as memory_range,
                COUNT(*) as count
            FROM featherpanel_servers
            GROUP BY memory_range
            ORDER BY 
                CASE memory_range
                    WHEN '≤512 MB' THEN 1
                    WHEN '513-1024 MB' THEN 2
                    WHEN '1-2 GB' THEN 3
                    WHEN '2-4 GB' THEN 4
                    WHEN '4-8 GB' THEN 5
                    WHEN '>8 GB' THEN 6
                    ELSE 7
                END
        ");
        $memoryDistribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Disk distribution
        $stmt = $pdo->query("
            SELECT 
                CASE
                    WHEN disk = 0 THEN 'Unlimited'
                    WHEN disk <= 5120 THEN '≤5 GB'
                    WHEN disk <= 10240 THEN '5-10 GB'
                    WHEN disk <= 20480 THEN '10-20 GB'
                    WHEN disk <= 51200 THEN '20-50 GB'
                    WHEN disk <= 102400 THEN '50-100 GB'
                    ELSE '>100 GB'
                END as disk_range,
                COUNT(*) as count
            FROM featherpanel_servers
            GROUP BY disk_range
            ORDER BY 
                CASE disk_range
                    WHEN '≤5 GB' THEN 1
                    WHEN '5-10 GB' THEN 2
                    WHEN '10-20 GB' THEN 3
                    WHEN '20-50 GB' THEN 4
                    WHEN '50-100 GB' THEN 5
                    WHEN '>100 GB' THEN 6
                    ELSE 7
                END
        ");
        $diskDistribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // CPU distribution
        $stmt = $pdo->query("
            SELECT 
                CASE
                    WHEN cpu = 0 THEN 'Unlimited'
                    WHEN cpu <= 50 THEN '≤50%'
                    WHEN cpu <= 100 THEN '51-100%'
                    WHEN cpu <= 200 THEN '101-200%'
                    WHEN cpu <= 400 THEN '201-400%'
                    ELSE '>400%'
                END as cpu_range,
                COUNT(*) as count
            FROM featherpanel_servers
            GROUP BY cpu_range
            ORDER BY 
                CASE cpu_range
                    WHEN '≤50%' THEN 1
                    WHEN '51-100%' THEN 2
                    WHEN '101-200%' THEN 3
                    WHEN '201-400%' THEN 4
                    WHEN '>400%' THEN 5
                    ELSE 6
                END
        ");
        $cpuDistribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($memoryDistribution as &$item) {
            $item['count'] = (int) $item['count'];
        }
        foreach ($diskDistribution as &$item) {
            $item['count'] = (int) $item['count'];
        }
        foreach ($cpuDistribution as &$item) {
            $item['count'] = (int) $item['count'];
        }

        return [
            'memory' => $memoryDistribution,
            'disk' => $diskDistribution,
            'cpu' => $cpuDistribution,
        ];
    }

    /**
     * Get installation statistics.
     *
     * @return array Installation stats
     */
    public static function getInstallationStats(): array
    {
        $pdo = Database::getPdoConnection();

        // Total installed servers
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE installed_at IS NOT NULL');
        $installed = (int) $stmt->fetchColumn();

        // Not yet installed
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE installed_at IS NULL');
        $notInstalled = (int) $stmt->fetchColumn();

        // Servers with errors
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE last_error IS NOT NULL');
        $withErrors = (int) $stmt->fetchColumn();

        // Average installation time (from created_at to installed_at)
        $stmt = $pdo->query('
            SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, installed_at)) as avg_seconds
            FROM featherpanel_servers
            WHERE installed_at IS NOT NULL
        ');
        $avgSeconds = (int) $stmt->fetchColumn();

        return [
            'installed' => $installed,
            'not_installed' => $notInstalled,
            'with_errors' => $withErrors,
            'avg_installation_time_seconds' => $avgSeconds,
            'avg_installation_time_minutes' => round($avgSeconds / 60, 2),
        ];
    }

    /**
     * Get server configuration patterns.
     *
     * @return array Configuration statistics
     */
    public static function getConfigurationPatterns(): array
    {
        $pdo = Database::getPdoConnection();

        // Servers with skip_scripts enabled
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE skip_scripts = 1');
        $skipScripts = (int) $stmt->fetchColumn();

        // Servers with OOM disabled
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE oom_disabled = 1');
        $oomDisabled = (int) $stmt->fetchColumn();

        // Servers with suspended flag
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE suspended = 1');
        $suspended = (int) $stmt->fetchColumn();

        // Servers with swap enabled
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE swap > 0');
        $withSwap = (int) $stmt->fetchColumn();

        // Servers with thread limit
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE threads IS NOT NULL');
        $withThreadLimit = (int) $stmt->fetchColumn();

        return [
            'skip_scripts_enabled' => $skipScripts,
            'oom_disabled' => $oomDisabled,
            'suspended' => $suspended,
            'with_swap' => $withSwap,
            'with_thread_limit' => $withThreadLimit,
        ];
    }

    /**
     * Get comprehensive server analytics dashboard.
     *
     * @return array Complete server statistics
     */
    public static function getServerDashboard(): array
    {
        return [
            'overview' => self::getServersOverview(),
            'by_realm' => self::getServersByRealm(),
            'by_spell' => self::getServersBySpell(),
            'database_usage' => self::getDatabaseUsagePerServer(),
            'allocation_usage' => self::getAllocationUsagePerServer(),
            'resources' => self::getResourceUsage(),
            'status_distribution' => self::getStatusDistribution(),
            'image_usage' => self::getImageUsage(10),
            'limits' => self::getLimitsDistribution(),
            'backup_usage' => self::getBackupUsage(),
            'schedule_usage' => self::getScheduleUsage(),
            'subuser_stats' => self::getSubuserStats(),
            'server_activity_stats' => self::getServerActivityStats(),
            'variable_stats' => self::getVariableStats(),
            'creation_trend' => self::getServerCreationTrend(30),
            'resource_trends' => self::getResourceTrends(30),
            'age_distribution' => self::getServerAgeDistribution(),
            'resource_distribution' => self::getResourceDistribution(),
            'installation_stats' => self::getInstallationStats(),
            'configuration_patterns' => self::getConfigurationPatterns(),
        ];
    }
}
