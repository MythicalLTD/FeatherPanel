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

namespace App\Telemetry;

use App\Chat\Database;

/** Query only aggregate counts; never load user, node or credential records. */
final class UmamiStatistics
{
    private const COUNT_FIELDS = ['users', 'servers', 'backups', 'nodes', 'database_agents', 'web_nodes', 'webspaces', 'vm_nodes', 'vm_instances', 'extensions'];

    /** Fixed SQL aggregates only: no rows, dynamic event labels, names or IDs leave SQL. */
    private const FEATURE_GROUPS = [
        'featherpanel_users' => [
            'users_with_2fa' => "SUM(CASE WHEN two_fa_enabled = 'true' AND deleted = 'false' THEN 1 ELSE 0 END)",
            'users_created_30d' => "SUM(CASE WHEN first_seen >= :recent AND deleted = 'false' THEN 1 ELSE 0 END)",
        ],
        'featherpanel_server_backups' => [
            'servers_with_backups' => 'COUNT(DISTINCT CASE WHEN deleted_at IS NULL THEN server_id END)',
            'backups_successful' => 'SUM(CASE WHEN deleted_at IS NULL AND is_successful = 1 THEN 1 ELSE 0 END)',
            'backups_failed' => 'SUM(CASE WHEN deleted_at IS NULL AND is_successful = 0 AND completed_at IS NOT NULL THEN 1 ELSE 0 END)',
            'backups_pending' => 'SUM(CASE WHEN deleted_at IS NULL AND is_successful = 0 AND completed_at IS NULL THEN 1 ELSE 0 END)',
            'backups_stale' => 'SUM(CASE WHEN deleted_at IS NULL AND is_successful = 0 AND completed_at IS NULL AND created_at <= :stale THEN 1 ELSE 0 END)',
            'backups_created_30d' => 'SUM(CASE WHEN created_at >= :recent THEN 1 ELSE 0 END)',
            'backups_failed_30d' => 'SUM(CASE WHEN completed_at >= :recent AND is_successful = 0 THEN 1 ELSE 0 END)',
        ],
        'featherpanel_server_schedules' => [
            'schedules' => 'COUNT(*)',
            'schedules_active' => 'SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END)',
            'servers_with_schedules' => 'COUNT(DISTINCT server_id)',
            'schedules_used_30d' => 'SUM(CASE WHEN last_run_at >= :recent THEN 1 ELSE 0 END)',
        ],
        'featherpanel_server_schedules_tasks' => [
            'schedule_tasks' => 'COUNT(*)',
            'schedule_backup_tasks' => "SUM(CASE WHEN action = 'backup' THEN 1 ELSE 0 END)",
            'schedule_power_tasks' => "SUM(CASE WHEN action = 'power' THEN 1 ELSE 0 END)",
            'schedule_command_tasks' => "SUM(CASE WHEN action = 'command' THEN 1 ELSE 0 END)",
        ],
        'featherpanel_server_databases' => [
            'server_databases' => 'COUNT(*)',
            'servers_with_databases' => 'COUNT(DISTINCT server_id)',
        ],
        'featherpanel_apikeys_client' => [
            'client_api_keys' => 'COUNT(*)',
            'users_with_api_keys' => 'COUNT(DISTINCT user_uuid)',
        ],
        'featherpanel_user_ssh_keys' => [
            'ssh_keys' => 'SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END)',
        ],
        'featherpanel_server_subusers' => [
            'server_subusers' => 'COUNT(*)',
            'servers_with_subusers' => 'COUNT(DISTINCT server_id)',
        ],
        'featherpanel_vm_subusers' => ['vm_subusers' => 'COUNT(*)'],
        'featherpanel_webspace_subusers' => ['webspace_subusers' => 'COUNT(*)'],
        'featherpanel_mounts' => ['mounts' => 'COUNT(*)'],
        'featherpanel_tickets' => [
            'tickets' => 'COUNT(*)',
            'tickets_created_30d' => 'SUM(CASE WHEN created_at >= :recent THEN 1 ELSE 0 END)',
        ],
        'featherpanel_vm_instance_backups' => [
            'vm_backups' => 'COUNT(*)',
            'vm_backups_completed' => "SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)",
            'vm_backups_failed' => "SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)",
        ],
        'featherpanel_vm_tasks' => [
            'vm_backup_tasks_30d' => "SUM(CASE WHEN task_type = 'backup' AND created_at >= :recent THEN 1 ELSE 0 END)",
            'vm_restore_tasks_30d' => "SUM(CASE WHEN task_type = 'restore' AND created_at >= :recent THEN 1 ELSE 0 END)",
            'vm_failed_tasks_30d' => "SUM(CASE WHEN status = 'failed' AND created_at >= :recent THEN 1 ELSE 0 END)",
        ],
        'featherpanel_webspace_backups' => [
            'webspace_backups' => 'COUNT(*)',
            'webspace_backups_completed' => "SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)",
            'webspace_backups_failed' => "SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)",
        ],
        'featherpanel_webspace_databases' => ['webspace_databases' => 'COUNT(*)'],
        'featherpanel_webspace_mailboxes' => [
            'mailboxes' => 'COUNT(*)',
            'webspaces_with_mailboxes' => 'COUNT(DISTINCT webspace_id)',
        ],
        'featherpanel_webspace_schedules' => [
            'webspace_schedules' => 'COUNT(*)',
            'webspace_schedules_active' => 'SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END)',
            'webspace_schedules_used_30d' => 'SUM(CASE WHEN last_run_at >= :recent THEN 1 ELSE 0 END)',
        ],
        'featherpanel_server_activities' => [
            'file_operations_30d' => "SUM(CASE WHEN event IN ('file_written', 'file_renamed', 'files_deleted', 'files_trashed', 'files_wiped', 'files_compressed', 'archive_decompressed', 'archive_selection_extracted', 'file_uploaded', 'file_downloaded', 'directory_downloaded', 'file_permissions_changed', 'file_pulled', 'directory_created') AND timestamp >= :recent THEN 1 ELSE 0 END)",
            'schedule_runs_30d' => "SUM(CASE WHEN event = 'schedule_executed' AND timestamp >= :recent THEN 1 ELSE 0 END)",
        ],
    ];

    public function __construct(private readonly ?\PDO $db = null)
    {
    }

    /** Strict allowlist: no identifiers, versions, uptime, strings or nested data. */
    public static function sanitizeCounts(array $input): array
    {
        $counts = [];
        $fields = self::COUNT_FIELDS;
        foreach (self::FEATURE_GROUPS as $group) {
            $fields = array_merge($fields, array_keys($group));
        }
        foreach ($fields as $field) {
            if (isset($input[$field]) && is_int($input[$field]) && $input[$field] >= 0) {
                $counts[$field] = $input[$field];
            }
        }

        return $counts;
    }

    public function collect(?\DateTimeImmutable $now = null): array
    {
        $db = $this->db ?? Database::getPdoConnection();
        $counts = [];
        foreach (
            [
                'users' => 'featherpanel_users',
                'servers' => 'featherpanel_servers',
                'backups' => 'featherpanel_server_backups',
                'nodes' => 'featherpanel_nodes',
                'database_agents' => 'featherpanel_databases',
                'web_nodes' => 'featherpanel_web_nodes',
                'webspaces' => 'featherpanel_webspaces',
                'vm_nodes' => 'featherpanel_vm_nodes',
                'vm_instances' => 'featherpanel_vm_instances',
            ] as $metric => $table
        ) {
            try {
                $counts[$metric] = (int) $db
                    ->query('SELECT COUNT(*) FROM ' . $table)
                    ->fetchColumn();
            } catch (\PDOException $e) {
                // Optional hosting tables may not exist on older installations.
                if (
                    $e->getCode() !== '42S02'
                    && !str_contains($e->getMessage(), 'no such table:')
                ) {
                    throw $e;
                }
            }
        }
        $now = ($now ?? new \DateTimeImmutable('now'))->setTimezone(new \DateTimeZone('UTC'));
        $recent = $now->modify('-30 days')->format('Y-m-d H:i:s');
        $stale = $now->modify('-24 hours')->format('Y-m-d H:i:s');
        foreach (self::FEATURE_GROUPS as $table => $metrics) {
            $select = [];
            $parameters = [];
            foreach ($metrics as $metric => $expression) {
                // Unique parameters also work with native PDO prepared statements.
                foreach (['recent' => $recent, 'stale' => $stale] as $token => $value) {
                    if (str_contains($expression, ':' . $token)) {
                        $parameter = $token . '_' . $metric;
                        $expression = str_replace(':' . $token, ':' . $parameter, $expression);
                        $parameters[$parameter] = $value;
                    }
                }
                $select[] = 'COALESCE(' . $expression . ', 0) AS ' . $metric;
            }
            try {
                $where = '';
                if ($table === 'featherpanel_server_activities' || $table === 'featherpanel_vm_tasks') {
                    $column = $table === 'featherpanel_server_activities' ? 'timestamp' : 'created_at';
                    $where = ' WHERE ' . $column . ' >= :window_start';
                    $parameters['window_start'] = $recent;
                }
                $query = $db->prepare('SELECT ' . implode(', ', $select) . ' FROM ' . $table . $where);
                $query->execute($parameters);
                foreach ($query->fetch(\PDO::FETCH_ASSOC) ?: [] as $metric => $value) {
                    $counts[$metric] = (int) $value;
                }
            } catch (\PDOException $e) {
                if (
                    !in_array($e->getCode(), ['42S02', '42S22'], true)
                    && !str_contains($e->getMessage(), 'no such table:')
                    && !str_contains($e->getMessage(), 'no such column:')
                ) {
                    throw $e;
                }
                // Older installations omit unavailable feature metrics, rather than inventing zeroes.
            }
        }
        // Count actual plugin directories, including locally installed plugins.
        $counts['extensions'] = defined('APP_ADDONS_DIR')
            ? count(glob(rtrim(APP_ADDONS_DIR, '/') . '/*/conf.yml') ?: [])
            : 0;

        return self::sanitizeCounts($counts);
    }
}
