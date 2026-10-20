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
use App\Helpers\ModuleGate;

/**
 * Cross-module KPI overview for a date range: growth against the previous period, activity,
 * node capacity and overcommit, top consumers and ticket throughput.
 *
 * Disabled modules are left out of every section, so their data never shows up in the overview.
 */
class OverviewAnalytics
{
    public const MAX_DAYS = 731;

    /**
     * @param \DateTimeImmutable $from First day of the range (inclusive)
     * @param \DateTimeImmutable $to Last day of the range (inclusive)
     */
    public static function getOverview(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $pdo = Database::getPdoConnection();

        $from = $from->setTime(0, 0);
        $to = $to->setTime(0, 0);
        $days = (int) $from->diff($to)->days + 1;
        $prevFrom = $from->modify('-' . $days . ' days');

        $range = [
            'start' => $from->format('Y-m-d H:i:s'),
            'end' => $to->modify('+1 day')->format('Y-m-d H:i:s'),
            'prev_start' => $prevFrom->format('Y-m-d H:i:s'),
        ];
        $bucket = $days <= 62 ? 'day' : ($days <= 366 ? 'week' : 'month');

        $modules = [
            ModuleGate::GAME => ModuleGate::isEnabled(ModuleGate::GAME),
            ModuleGate::WEB => ModuleGate::isEnabled(ModuleGate::WEB),
            ModuleGate::VDS => ModuleGate::isEnabled(ModuleGate::VDS),
        ];

        $series = [
            'signups' => self::dailyCounts($pdo, 'featherpanel_users', 'first_seen', $range, "deleted = 'false'"),
            'activity' => self::dailyCounts($pdo, 'featherpanel_activity', 'created_at', $range),
        ];

        $result = [
            'range' => [
                'from' => $from->format('Y-m-d'),
                'to' => $to->format('Y-m-d'),
                'days' => $days,
                'bucket' => $bucket,
                'previous_from' => $prevFrom->format('Y-m-d'),
                'previous_to' => $from->modify('-1 day')->format('Y-m-d'),
            ],
            'modules' => $modules,
            'users' => self::users($pdo, $range),
            'activity' => self::activity($pdo, $range),
            'game' => null,
            'web' => null,
            'vds' => null,
            'tickets' => null,
        ];

        if ($modules[ModuleGate::GAME] && self::tableExists($pdo, 'featherpanel_servers')) {
            $result['game'] = self::game($pdo, $range);
            $series['servers'] = self::dailyCounts($pdo, 'featherpanel_servers', 'created_at', $range);
        }
        if ($modules[ModuleGate::WEB] && self::tableExists($pdo, 'featherpanel_webspaces')) {
            $result['web'] = self::web($pdo, $range);
            $series['webspaces'] = self::dailyCounts($pdo, 'featherpanel_webspaces', 'created_at', $range);
        }
        if ($modules[ModuleGate::VDS] && self::tableExists($pdo, 'featherpanel_vm_instances')) {
            $result['vds'] = self::vds($pdo, $range);
            $series['vds'] = self::dailyCounts($pdo, 'featherpanel_vm_instances', 'created_at', $range);
        }
        if (self::tableExists($pdo, 'featherpanel_tickets')) {
            $result['tickets'] = self::tickets($pdo, $range);
            $series['tickets_opened'] = self::dailyCounts($pdo, 'featherpanel_tickets', 'created_at', $range);
            $series['tickets_closed'] = self::dailyCounts($pdo, 'featherpanel_tickets', 'closed_at', $range, 'closed_at IS NOT NULL');
        }

        $result['series'] = self::bucketize($series, $from, $to, $bucket);
        $result['top_consumers'] = self::topConsumers($pdo, $modules);

        return $result;
    }

    private static function users(\PDO $pdo, array $range): array
    {
        $row = self::row($pdo, "SELECT
                COUNT(*) AS total,
                SUM(banned = 'true') AS banned,
                SUM(two_fa_enabled = 'true') AS two_fa,
                SUM(first_seen >= :s1 AND first_seen < :e1) AS new_users,
                SUM(first_seen >= :ps AND first_seen < :s2) AS new_prev,
                SUM(last_seen >= :s3 AND last_seen < :e2) AS seen_in_range,
                SUM(last_seen >= :s4 AND last_seen < :e3 AND first_seen < :s5) AS returning_users,
                SUM(last_seen >= NOW() - INTERVAL 1 DAY) AS active_24h,
                SUM(last_seen >= NOW() - INTERVAL 7 DAY) AS active_7d,
                SUM(last_seen >= NOW() - INTERVAL 30 DAY) AS active_30d
            FROM featherpanel_users WHERE deleted = 'false'", [
            's1' => $range['start'], 'e1' => $range['end'],
            'ps' => $range['prev_start'], 's2' => $range['start'],
            's3' => $range['start'], 'e2' => $range['end'],
            's4' => $range['start'], 'e3' => $range['end'], 's5' => $range['start'],
        ]);

        $total = (int) ($row['total'] ?? 0);

        return [
            'total' => $total,
            'banned' => (int) ($row['banned'] ?? 0),
            'two_fa' => (int) ($row['two_fa'] ?? 0),
            'new' => (int) ($row['new_users'] ?? 0),
            'new_previous' => (int) ($row['new_prev'] ?? 0),
            'seen_in_range' => (int) ($row['seen_in_range'] ?? 0),
            'returning' => (int) ($row['returning_users'] ?? 0),
            'active_24h' => (int) ($row['active_24h'] ?? 0),
            'active_7d' => (int) ($row['active_7d'] ?? 0),
            'active_30d' => (int) ($row['active_30d'] ?? 0),
        ];
    }

    private static function activity(\PDO $pdo, array $range): array
    {
        if (!self::tableExists($pdo, 'featherpanel_activity')) {
            return ['total' => 0, 'previous' => 0, 'unique_users' => 0, 'top_events' => []];
        }

        $row = self::row($pdo, 'SELECT
                SUM(created_at >= :s1 AND created_at < :e1) AS total,
                SUM(created_at >= :ps AND created_at < :s2) AS prev,
                COUNT(DISTINCT CASE WHEN created_at >= :s3 AND created_at < :e2 THEN user_uuid END) AS unique_users
            FROM featherpanel_activity WHERE created_at >= :ps2', [
            's1' => $range['start'], 'e1' => $range['end'],
            'ps' => $range['prev_start'], 's2' => $range['start'],
            's3' => $range['start'], 'e2' => $range['end'],
            'ps2' => $range['prev_start'],
        ]);

        $stmt = $pdo->prepare('SELECT name, COUNT(*) AS c FROM featherpanel_activity
            WHERE created_at >= :s AND created_at < :e GROUP BY name ORDER BY c DESC LIMIT 8');
        $stmt->execute(['s' => $range['start'], 'e' => $range['end']]);
        $top = array_map(
            static fn (array $r): array => ['name' => (string) $r['name'], 'count' => (int) $r['c']],
            $stmt->fetchAll(\PDO::FETCH_ASSOC)
        );

        return [
            'total' => (int) ($row['total'] ?? 0),
            'previous' => (int) ($row['prev'] ?? 0),
            'unique_users' => (int) ($row['unique_users'] ?? 0),
            'top_events' => $top,
        ];
    }

    private static function game(\PDO $pdo, array $range): array
    {
        $row = self::row($pdo, 'SELECT
                COUNT(*) AS total,
                SUM(suspended = 1) AS suspended,
                SUM(created_at >= :s1 AND created_at < :e1) AS new_servers,
                SUM(created_at >= :ps AND created_at < :s2) AS new_prev,
                COALESCE(SUM(memory), 0) AS memory,
                COALESCE(SUM(disk), 0) AS disk,
                COALESCE(SUM(cpu), 0) AS cpu
            FROM featherpanel_servers', [
            's1' => $range['start'], 'e1' => $range['end'],
            'ps' => $range['prev_start'], 's2' => $range['start'],
        ]);

        $byStatus = [];
        foreach ($pdo->query('SELECT COALESCE(status, \'unknown\') AS status, COUNT(*) AS c FROM featherpanel_servers GROUP BY status')->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $byStatus[] = ['status' => (string) $r['status'], 'count' => (int) $r['c']];
        }

        $nodes = [];
        if (self::tableExists($pdo, 'featherpanel_nodes')) {
            $stmt = $pdo->query('SELECT n.id, n.name, n.memory, n.memory_overallocate, n.disk, n.disk_overallocate,
                    COUNT(s.id) AS servers, COALESCE(SUM(s.memory), 0) AS memory_allocated,
                    COALESCE(SUM(s.disk), 0) AS disk_allocated, COALESCE(SUM(s.cpu), 0) AS cpu_allocated
                FROM featherpanel_nodes n LEFT JOIN featherpanel_servers s ON s.node_id = n.id
                GROUP BY n.id, n.name, n.memory, n.memory_overallocate, n.disk, n.disk_overallocate
                ORDER BY n.name');
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $nodes[] = self::nodeCapacity($r, 'game');
            }
        }

        return [
            'total' => (int) ($row['total'] ?? 0),
            'suspended' => (int) ($row['suspended'] ?? 0),
            'new' => (int) ($row['new_servers'] ?? 0),
            'new_previous' => (int) ($row['new_prev'] ?? 0),
            'allocated' => [
                'memory' => (int) ($row['memory'] ?? 0),
                'disk' => (int) ($row['disk'] ?? 0),
                'cpu' => (int) ($row['cpu'] ?? 0),
            ],
            'by_status' => $byStatus,
            'nodes' => $nodes,
        ];
    }

    private static function web(\PDO $pdo, array $range): array
    {
        $row = self::row($pdo, 'SELECT
                COUNT(*) AS total,
                SUM(created_at >= :s1 AND created_at < :e1) AS new_spaces,
                SUM(created_at >= :ps AND created_at < :s2) AS new_prev,
                COALESCE(SUM(memory_limit), 0) AS memory,
                COALESCE(SUM(disk), 0) AS disk
            FROM featherpanel_webspaces', [
            's1' => $range['start'], 'e1' => $range['end'],
            'ps' => $range['prev_start'], 's2' => $range['start'],
        ]);

        $nodes = [];
        if (self::tableExists($pdo, 'featherpanel_web_nodes')) {
            $stmt = $pdo->query('SELECT n.id, n.name, n.memory, n.memory_overallocate, n.disk, n.disk_overallocate,
                    COUNT(w.id) AS servers, COALESCE(SUM(w.memory_limit), 0) AS memory_allocated,
                    COALESCE(SUM(w.disk), 0) AS disk_allocated, 0 AS cpu_allocated
                FROM featherpanel_web_nodes n LEFT JOIN featherpanel_webspaces w ON w.web_node_id = n.id
                GROUP BY n.id, n.name, n.memory, n.memory_overallocate, n.disk, n.disk_overallocate
                ORDER BY n.name');
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $nodes[] = self::nodeCapacity($r, 'web');
            }
        }

        return [
            'total' => (int) ($row['total'] ?? 0),
            'new' => (int) ($row['new_spaces'] ?? 0),
            'new_previous' => (int) ($row['new_prev'] ?? 0),
            'allocated' => [
                'memory' => (int) ($row['memory'] ?? 0),
                'disk' => (int) ($row['disk'] ?? 0),
            ],
            'nodes' => $nodes,
        ];
    }

    private static function vds(\PDO $pdo, array $range): array
    {
        $row = self::row($pdo, 'SELECT
                COUNT(*) AS total,
                SUM(suspended = 1) AS suspended,
                SUM(created_at >= :s1 AND created_at < :e1) AS new_instances,
                SUM(created_at >= :ps AND created_at < :s2) AS new_prev,
                COALESCE(SUM(memory), 0) AS memory,
                COALESCE(SUM(disk_gb), 0) AS disk_gb,
                COALESCE(SUM(GREATEST(COALESCE(cpus, 1), 1) * GREATEST(COALESCE(cores, 1), 1)), 0) AS vcpus
            FROM featherpanel_vm_instances', [
            's1' => $range['start'], 'e1' => $range['end'],
            'ps' => $range['prev_start'], 's2' => $range['start'],
        ]);

        $byStatus = [];
        foreach ($pdo->query('SELECT COALESCE(status, \'unknown\') AS status, COUNT(*) AS c FROM featherpanel_vm_instances GROUP BY status')->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $byStatus[] = ['status' => (string) $r['status'], 'count' => (int) $r['c']];
        }

        $nodes = [];
        if (self::tableExists($pdo, 'featherpanel_vm_nodes')) {
            $stmt = $pdo->query('SELECT n.id, n.name, COUNT(i.id) AS instances,
                    COALESCE(SUM(i.memory), 0) AS memory_allocated, COALESCE(SUM(i.disk_gb), 0) AS disk_gb_allocated
                FROM featherpanel_vm_nodes n LEFT JOIN featherpanel_vm_instances i ON i.vm_node_id = n.id
                GROUP BY n.id, n.name ORDER BY n.name');
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $nodes[] = [
                    'id' => (int) $r['id'],
                    'name' => (string) $r['name'],
                    'instances' => (int) $r['instances'],
                    'memory_allocated' => (int) $r['memory_allocated'],
                    'disk_gb_allocated' => (int) $r['disk_gb_allocated'],
                ];
            }
        }

        return [
            'total' => (int) ($row['total'] ?? 0),
            'suspended' => (int) ($row['suspended'] ?? 0),
            'new' => (int) ($row['new_instances'] ?? 0),
            'new_previous' => (int) ($row['new_prev'] ?? 0),
            'allocated' => [
                'memory' => (int) ($row['memory'] ?? 0),
                'disk_gb' => (int) ($row['disk_gb'] ?? 0),
                'vcpus' => (int) ($row['vcpus'] ?? 0),
            ],
            'by_status' => $byStatus,
            'nodes' => $nodes,
        ];
    }

    private static function tickets(\PDO $pdo, array $range): array
    {
        $row = self::row($pdo, 'SELECT
                SUM(created_at >= :s1 AND created_at < :e1) AS opened,
                SUM(created_at >= :ps AND created_at < :s2) AS opened_prev,
                SUM(closed_at >= :s3 AND closed_at < :e2) AS closed,
                SUM(closed_at >= :ps2 AND closed_at < :s4) AS closed_prev,
                SUM(closed_at IS NULL) AS open_now,
                AVG(CASE WHEN closed_at >= :s5 AND closed_at < :e3 THEN TIMESTAMPDIFF(MINUTE, created_at, closed_at) END) AS avg_minutes
            FROM featherpanel_tickets', [
            's1' => $range['start'], 'e1' => $range['end'],
            'ps' => $range['prev_start'], 's2' => $range['start'],
            's3' => $range['start'], 'e2' => $range['end'],
            'ps2' => $range['prev_start'], 's4' => $range['start'],
            's5' => $range['start'], 'e3' => $range['end'],
        ]);

        return [
            'opened' => (int) ($row['opened'] ?? 0),
            'opened_previous' => (int) ($row['opened_prev'] ?? 0),
            'closed' => (int) ($row['closed'] ?? 0),
            'closed_previous' => (int) ($row['closed_prev'] ?? 0),
            'open_now' => (int) ($row['open_now'] ?? 0),
            'avg_resolution_hours' => isset($row['avg_minutes']) ? round(((float) $row['avg_minutes']) / 60, 1) : null,
        ];
    }

    /**
     * Owners with the most allocated memory across the enabled modules.
     *
     * @param array<string, bool> $modules
     */
    private static function topConsumers(\PDO $pdo, array $modules, int $limit = 8): array
    {
        $users = [];
        $add = static function (array $r, string $kind) use (&$users): void {
            $uuid = (string) $r['uuid'];
            if (!isset($users[$uuid])) {
                $users[$uuid] = [
                    'uuid' => $uuid,
                    'username' => (string) $r['username'],
                    'avatar' => $r['avatar'] !== null ? (string) $r['avatar'] : null,
                    'servers' => 0,
                    'webspaces' => 0,
                    'vds' => 0,
                    'memory' => 0,
                    'disk' => 0,
                ];
            }
            $users[$uuid][$kind] += (int) $r['c'];
            $users[$uuid]['memory'] += (int) $r['memory'];
            $users[$uuid]['disk'] += (int) $r['disk'];
        };

        if ($modules[ModuleGate::GAME] && self::tableExists($pdo, 'featherpanel_servers')) {
            $stmt = $pdo->query("SELECT u.uuid, u.username, u.avatar, COUNT(s.id) AS c,
                    COALESCE(SUM(s.memory), 0) AS memory, COALESCE(SUM(s.disk), 0) AS disk
                FROM featherpanel_servers s JOIN featherpanel_users u ON u.id = s.owner_id AND u.deleted = 'false'
                GROUP BY u.uuid, u.username, u.avatar");
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $add($r, 'servers');
            }
        }
        if ($modules[ModuleGate::WEB] && self::tableExists($pdo, 'featherpanel_webspaces')) {
            $stmt = $pdo->query("SELECT u.uuid, u.username, u.avatar, COUNT(w.id) AS c,
                    COALESCE(SUM(w.memory_limit), 0) AS memory, COALESCE(SUM(w.disk), 0) AS disk
                FROM featherpanel_webspaces w JOIN featherpanel_users u ON u.id = w.owner_id AND u.deleted = 'false'
                GROUP BY u.uuid, u.username, u.avatar");
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $add($r, 'webspaces');
            }
        }
        if ($modules[ModuleGate::VDS] && self::tableExists($pdo, 'featherpanel_vm_instances')) {
            $stmt = $pdo->query("SELECT u.uuid, u.username, u.avatar, COUNT(i.id) AS c,
                    COALESCE(SUM(i.memory), 0) AS memory, COALESCE(SUM(i.disk_gb), 0) * 1024 AS disk
                FROM featherpanel_vm_instances i JOIN featherpanel_users u ON u.uuid = i.user_uuid AND u.deleted = 'false'
                GROUP BY u.uuid, u.username, u.avatar");
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $add($r, 'vds');
            }
        }

        $list = array_values($users);
        usort($list, static function (array $a, array $b): int {
            $ca = $a['servers'] + $a['webspaces'] + $a['vds'];
            $cb = $b['servers'] + $b['webspaces'] + $b['vds'];

            return [$b['memory'], $cb] <=> [$a['memory'], $ca];
        });

        return array_slice($list, 0, $limit);
    }

    /**
     * Allocation against physical capacity. Overallocate is a percentage on top of it; -1 means unlimited.
     */
    private static function nodeCapacity(array $r, string $type): array
    {
        $memory = (int) $r['memory'];
        $disk = (int) $r['disk'];
        $memOver = (int) $r['memory_overallocate'];
        $diskOver = (int) $r['disk_overallocate'];
        $memAlloc = (int) $r['memory_allocated'];
        $diskAlloc = (int) $r['disk_allocated'];

        return [
            'id' => (int) $r['id'],
            'type' => $type,
            'name' => (string) $r['name'],
            'items' => (int) $r['servers'],
            'memory' => $memory,
            'memory_allocated' => $memAlloc,
            'memory_limit' => $memOver < 0 ? null : (int) round($memory * (1 + $memOver / 100)),
            'memory_percent' => $memory > 0 ? round($memAlloc / $memory * 100, 1) : null,
            'disk' => $disk,
            'disk_allocated' => $diskAlloc,
            'disk_limit' => $diskOver < 0 ? null : (int) round($disk * (1 + $diskOver / 100)),
            'disk_percent' => $disk > 0 ? round($diskAlloc / $disk * 100, 1) : null,
            'cpu_allocated' => (int) $r['cpu_allocated'],
            'overcommitted' => ($memory > 0 && $memAlloc > $memory) || ($disk > 0 && $diskAlloc > $disk),
        ];
    }

    /**
     * @return array<string, int> Y-m-d => count
     */
    private static function dailyCounts(\PDO $pdo, string $table, string $column, array $range, ?string $where = null): array
    {
        if (!self::tableExists($pdo, $table)) {
            return [];
        }

        $sql = "SELECT DATE({$column}) AS d, COUNT(*) AS c FROM {$table}
            WHERE {$column} >= :s AND {$column} < :e" . ($where !== null ? " AND ({$where})" : '') . ' GROUP BY d';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['s' => $range['start'], 'e' => $range['end']]);

        $out = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $out[(string) $r['d']] = (int) $r['c'];
        }

        return $out;
    }

    /**
     * Folds daily counts into day, week (starting Monday) or month buckets, with empty buckets kept.
     *
     * @param array<string, array<string, int>> $series
     */
    private static function bucketize(array $series, \DateTimeImmutable $from, \DateTimeImmutable $to, string $bucket): array
    {
        $keyFor = static function (\DateTimeImmutable $d) use ($bucket): string {
            return match ($bucket) {
                'week' => $d->modify('monday this week')->format('Y-m-d'),
                'month' => $d->format('Y-m-01'),
                default => $d->format('Y-m-d'),
            };
        };

        $rows = [];
        for ($d = $from; $d <= $to; $d = $d->modify('+1 day')) {
            $key = $keyFor($d);
            if (!isset($rows[$key])) {
                $rows[$key] = ['date' => $key] + array_fill_keys(array_keys($series), 0);
            }
            $day = $d->format('Y-m-d');
            foreach ($series as $name => $counts) {
                $rows[$key][$name] += $counts[$day] ?? 0;
            }
        }

        return array_values($rows);
    }

    private static function row(\PDO $pdo, string $sql, array $params): array
    {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return is_array($row) ? $row : [];
    }

    private static function tableExists(\PDO $pdo, string $table): bool
    {
        static $cache = [];
        if (!array_key_exists($table, $cache)) {
            $stmt = $pdo->prepare('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :t LIMIT 1');
            $stmt->execute(['t' => $table]);
            $cache[$table] = (bool) $stmt->fetchColumn();
        }

        return $cache[$table];
    }
}
