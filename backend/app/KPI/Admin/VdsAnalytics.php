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

use App\Chat\Database;

/**
 * VDS and platform analytics KPI service for newer product categories.
 */
class VdsAnalytics
{
    /**
     * Get VDS-only dashboard metrics.
     */
    public static function getVdsDashboard(): array
    {
        $pdo = Database::getPdoConnection();

        $vds = [
            'nodes' => self::countIfExists($pdo, 'featherpanel_vm_nodes'),
            'templates' => self::countIfExists($pdo, 'featherpanel_vm_templates'),
            'instances' => self::countIfExists($pdo, 'featherpanel_vm_instances'),
            'instance_backups' => self::countIfExists($pdo, 'featherpanel_vm_instance_backups'),
            'tasks' => self::countIfExists($pdo, 'featherpanel_vm_tasks'),
            'subusers' => self::countIfExists($pdo, 'featherpanel_vm_subusers'),
            'instance_ips' => self::countIfExists($pdo, 'featherpanel_vm_instance_ips'),
            'instance_activities' => self::countIfExists($pdo, 'featherpanel_vm_instance_activities'),
        ];

        return [
            'vds' => $vds,
            'totals' => [
                'vds_objects' => array_sum($vds),
            ],
        ];
    }

    public static function getKnowledgebaseDashboard(): array
    {
        $pdo = Database::getPdoConnection();

        $knowledgebase = [
            'categories' => self::countIfExists($pdo, 'featherpanel_knowledgebase_categories'),
            'articles' => self::countIfExists($pdo, 'featherpanel_knowledgebase_articles'),
            'attachments' => self::countIfExists($pdo, 'featherpanel_knowledgebase_articles_attachments'),
            'tags' => self::countIfExists($pdo, 'featherpanel_knowledgebase_articles_tags'),
        ];

        return [
            'knowledgebase' => $knowledgebase,
            'totals' => [
                'knowledgebase_objects' => array_sum($knowledgebase),
            ],
        ];
    }

    public static function getTicketsDashboard(): array
    {
        $pdo = Database::getPdoConnection();

        $tickets = [
            'tickets' => self::countIfExists($pdo, 'featherpanel_tickets'),
            'messages' => self::countIfExists($pdo, 'featherpanel_ticket_messages'),
            'attachments' => self::countIfExists($pdo, 'featherpanel_ticket_attachments'),
            'categories' => self::countIfExists($pdo, 'featherpanel_ticket_categories'),
            'priorities' => self::countIfExists($pdo, 'featherpanel_ticket_priorities'),
            'statuses' => self::countIfExists($pdo, 'featherpanel_ticket_statuses'),
        ];

        $trend = [];
        $thisWeek = 0;
        $lastWeek = 0;
        $today = 0;

        if (self::tableExists($pdo, 'featherpanel_tickets')) {
            $stmt = $pdo->query('
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM featherpanel_tickets
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 42 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            ');
            $trend = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            foreach ($trend as &$item) {
                $item['count'] = (int) $item['count'];
            }

            $stmt = $pdo->query('
                SELECT COUNT(*)
                FROM featherpanel_tickets
                WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
            ');
            $thisWeek = (int) $stmt->fetchColumn();

            $stmt = $pdo->query('
                SELECT COUNT(*)
                FROM featherpanel_tickets
                WHERE YEARWEEK(created_at, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 7 DAY), 1)
            ');
            $lastWeek = (int) $stmt->fetchColumn();

            $stmt = $pdo->query('
                SELECT COUNT(*)
                FROM featherpanel_tickets
                WHERE DATE(created_at) = CURDATE()
            ');
            $today = (int) $stmt->fetchColumn();
        }

        $weeklyGrowth = $lastWeek > 0
            ? round((($thisWeek - $lastWeek) / $lastWeek) * 100, 2)
            : ($thisWeek > 0 ? 100.0 : 0.0);

        return [
            'tickets' => $tickets,
            'velocity' => [
                'today' => $today,
                'this_week' => $thisWeek,
                'last_week' => $lastWeek,
                'weekly_growth_percent' => $weeklyGrowth,
            ],
            'trend_42d' => $trend,
            'totals' => [
                'ticket_objects' => array_sum($tickets),
            ],
        ];
    }

    public static function getPluginsDashboard(): array
    {
        $pdo = Database::getPdoConnection();

        $plugins = [
            'installed_plugins' => self::countIfExists($pdo, 'featherpanel_installed_plugins'),
            'server_imports' => self::countIfExists($pdo, 'featherpanel_server_imports'),
            'server_proxies' => self::countIfExists($pdo, 'featherpanel_server_proxies'),
            'server_transfers' => self::countIfExists($pdo, 'featherpanel_server_transfers'),
            'sso_tokens' => self::countIfExists($pdo, 'featherpanel_sso_tokens'),
        ];

        $addonStats = self::getAddonUiStats();
        $systemEndpoints = [
            'plugin_css_sources' => $addonStats['css_sources'],
            'plugin_js_sources' => $addonStats['js_sources'],
            'plugin_sidebar_configs' => $addonStats['sidebar_json'] + $addonStats['sidebar_php'],
            'plugin_widget_configs' => $addonStats['widgets_json'],
            'plugin_widget_definitions' => $addonStats['widget_definitions'],
            'apidocs_endpoint_enabled' => 1,
            'apidocs_cache_ttl_seconds' => (defined('APP_DEBUG') && APP_DEBUG === true) ? 0 : 3600,
        ];

        return [
            'plugins' => $plugins,
            'system_endpoints' => $systemEndpoints,
            'totals' => [
                'plugin_objects' => array_sum($plugins),
            ],
        ];
    }

    /**
     * Get plugin UI asset/config stats used by system plugin controllers.
     *
     * @return array<string, int>
     */
    private static function getAddonUiStats(): array
    {
        $stats = [
            'css_sources' => 0,
            'js_sources' => 0,
            'sidebar_json' => 0,
            'sidebar_php' => 0,
            'widgets_json' => 0,
            'widget_definitions' => 0,
        ];

        $pluginDir = __DIR__ . '/../../../storage/addons';
        if (!is_dir($pluginDir)) {
            return $stats;
        }

        $plugins = array_diff(scandir($pluginDir) ?: [], ['.', '..']);
        foreach ($plugins as $plugin) {
            $base = $pluginDir . '/' . $plugin . '/Frontend';
            $cssPath = $base . '/index.css';
            $jsPath = $base . '/index.js';
            $sidebarJsonPath = $base . '/sidebar.json';
            $sidebarPhpPath = $base . '/sidebar.php';
            $widgetsPath = $base . '/widgets.json';

            if (file_exists($cssPath)) {
                ++$stats['css_sources'];
            }
            if (file_exists($jsPath)) {
                ++$stats['js_sources'];
            }
            if (file_exists($sidebarJsonPath)) {
                ++$stats['sidebar_json'];
            }
            if (file_exists($sidebarPhpPath)) {
                ++$stats['sidebar_php'];
            }
            if (file_exists($widgetsPath)) {
                ++$stats['widgets_json'];
                $widgets = json_decode((string) file_get_contents($widgetsPath), true);
                if (is_array($widgets)) {
                    $stats['widget_definitions'] += count($widgets);
                }
            }
        }

        return $stats;
    }

    /**
     * Count rows from a table only if it exists.
     */
    private static function countIfExists(\PDO $pdo, string $tableName): int
    {
        if (!self::tableExists($pdo, $tableName)) {
            return 0;
        }

        $stmt = $pdo->query('SELECT COUNT(*) FROM ' . $tableName);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Check if a table exists.
     */
    private static function tableExists(\PDO $pdo, string $tableName): bool
    {
        $stmt = $pdo->prepare('SHOW TABLES LIKE :table_name');
        $stmt->execute(['table_name' => $tableName]);

        return (bool) $stmt->fetchColumn();
    }
}
