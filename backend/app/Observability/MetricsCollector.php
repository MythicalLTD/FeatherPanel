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

namespace App\Observability;

use App\Chat\Node;
use App\Chat\Database;
use App\Runtime\WorkerRestart;
use App\Helpers\NodeStatusHelper;

/**
 * Gathers everything the /api/system/metrics endpoint exposes.
 *
 * Every section is isolated: a failing query is counted in
 * featherpanel_metrics_collector_errors and the rest of the scrape still succeeds.
 * Node reachability probes run in parallel and are cached in Redis for 30 seconds so
 * frequent scrapes (or several Prometheus replicas) do not hammer the daemons.
 */
final class MetricsCollector
{
    private const NODE_PROBE_CACHE_KEY = 'featherpanel:obs:node_probes';
    private const NODE_PROBE_CACHE_TTL = 30;

    private PrometheusText $out;

    private ?\Redis $redis;

    /** @var array<int|string, string> node id => node name, filled by the nodes section */
    private array $nodeNames = [];

    public function __construct(?PrometheusText $out = null, ?\Redis $redis = null)
    {
        $this->out = $out ?? new PrometheusText();
        $this->redis = $redis ?? ObservabilityRedis::connection();
    }

    public function collect(): string
    {
        $start = microtime(true);

        $this->section('runtime', fn () => $this->runtime());
        $this->section('database', fn () => $this->database());
        $this->section('redis', fn () => $this->redisInfo());
        $this->section('users', fn () => $this->users());
        $this->section('nodes', fn () => $this->nodes());
        $this->section('servers', fn () => $this->servers());
        $this->section('backups', fn () => $this->backups());
        $this->section('tickets', fn () => $this->tickets());
        $this->section('mail_queue', fn () => $this->mailQueue());
        $this->section('cron', fn () => $this->cron());
        $this->section('queues', fn () => $this->queues());
        $this->section('vds', fn () => $this->vds());
        $this->section('webspaces', fn () => $this->webspaces());
        $this->section('loki', fn () => $this->loki());
        if ($this->redis !== null) {
            $this->section('http', fn () => HttpMetrics::export($this->out, $this->redis));
        }

        $this->out->gauge('featherpanel_metrics_scrape_duration_seconds', 'Time spent collecting this scrape.', round(microtime(true) - $start, 6));

        return $this->out->render();
    }

    public static function bytes(string $value): int
    {
        $value = trim($value);
        if ($value === '' || $value === '-1') {
            return -1;
        }
        $unit = strtolower(substr($value, -1));
        $number = (int) $value;

        return match ($unit) {
            'g' => $number * 1073741824,
            'm' => $number * 1048576,
            'k' => $number * 1024,
            default => $number,
        };
    }

    /** @param callable(): void $fn */
    private function section(string $name, callable $fn): void
    {
        try {
            $fn();
            $this->out->gauge('featherpanel_metrics_collector_success', 'Whether a collector section succeeded during this scrape.', 1, ['collector' => $name]);
        } catch (\Throwable) {
            $this->out->gauge('featherpanel_metrics_collector_success', 'Whether a collector section succeeded during this scrape.', 0, ['collector' => $name]);
        }
    }

    private function pdo(): \PDO
    {
        return Database::getPdoConnection();
    }

    private function runtime(): void
    {
        $this->out->gauge('featherpanel_up', 'The panel answered this scrape.', 1);
        $this->out->gauge('featherpanel_info', 'Panel build information.', 1, [
            'version' => defined('APP_VERSION') ? (string) APP_VERSION : 'unknown',
            'upstream' => defined('APP_UPSTREAM') ? (string) APP_UPSTREAM : 'unknown',
            'php_version' => PHP_VERSION,
            'php_sapi' => PHP_SAPI,
            'php_mode' => WorkerRestart::isWorkerMode() ? 'worker' : 'classic',
        ]);
        $this->out->gauge('featherpanel_php_memory_usage_bytes', 'Memory used by the PHP process/thread that served this scrape.', memory_get_usage(true));
        $this->out->gauge('featherpanel_php_memory_peak_bytes', 'Peak memory of the PHP process/thread that served this scrape.', memory_get_peak_usage(true));
        $limit = self::bytes((string) ini_get('memory_limit'));
        if ($limit > 0) {
            $this->out->gauge('featherpanel_php_memory_limit_bytes', 'PHP memory_limit.', $limit);
        }

        if (function_exists('opcache_get_status')) {
            $status = @opcache_get_status(false);
            $enabled = is_array($status) && !empty($status['opcache_enabled']);
            $this->out->gauge('featherpanel_php_opcache_enabled', 'Whether OPcache is enabled.', $enabled ? 1 : 0);
            if ($enabled) {
                $mem = $status['memory_usage'] ?? [];
                $stats = $status['opcache_statistics'] ?? [];
                $this->out->gauge('featherpanel_php_opcache_used_memory_bytes', 'OPcache shared memory in use.', (int) ($mem['used_memory'] ?? 0));
                $this->out->gauge('featherpanel_php_opcache_free_memory_bytes', 'OPcache shared memory free.', (int) ($mem['free_memory'] ?? 0));
                $this->out->gauge('featherpanel_php_opcache_cached_scripts', 'Scripts cached by OPcache.', (int) ($stats['num_cached_scripts'] ?? 0));
                $this->out->counter('featherpanel_php_opcache_hits_total', 'OPcache hits.', (int) ($stats['hits'] ?? 0));
                $this->out->counter('featherpanel_php_opcache_misses_total', 'OPcache misses.', (int) ($stats['misses'] ?? 0));
            }
        } else {
            $this->out->gauge('featherpanel_php_opcache_enabled', 'Whether OPcache is enabled.', 0);
        }

        $storage = defined('APP_STORAGE_DIR') ? (string) APP_STORAGE_DIR : dirname(__DIR__, 2) . '/storage/';
        $total = @disk_total_space($storage);
        $free = @disk_free_space($storage);
        if ($total !== false && $free !== false && $total > 0) {
            $this->out->gauge('featherpanel_storage_disk_total_bytes', 'Size of the filesystem holding the panel storage directory.', (int) $total);
            $this->out->gauge('featherpanel_storage_disk_free_bytes', 'Free space on the filesystem holding the panel storage directory.', (int) $free);
        }
    }

    private function database(): void
    {
        $start = microtime(true);
        try {
            $pdo = $this->pdo();
            $pdo->query('SELECT 1')->fetchColumn();
        } catch (\Throwable $e) {
            $this->out->gauge('featherpanel_database_up', 'Whether the panel database answers queries.', 0);

            throw $e;
        }
        $this->out->gauge('featherpanel_database_up', 'Whether the panel database answers queries.', 1);
        $this->out->gauge('featherpanel_database_latency_seconds', 'Round trip of SELECT 1 against the panel database.', round(microtime(true) - $start, 6));

        $size = $pdo->query('SELECT COALESCE(SUM(data_length + index_length), 0) FROM information_schema.tables WHERE table_schema = DATABASE()')->fetchColumn();
        $this->out->gauge('featherpanel_database_size_bytes', 'Size of the panel database (data + indexes).', (int) $size);
        $threads = $pdo->query("SHOW GLOBAL STATUS LIKE 'Threads_connected'")->fetch(\PDO::FETCH_NUM);
        if (isset($threads[1])) {
            $this->out->gauge('featherpanel_database_connections', 'Connections open on the database server.', (int) $threads[1]);
        }
    }

    private function redisInfo(): void
    {
        if ($this->redis === null) {
            $this->out->gauge('featherpanel_redis_up', 'Whether Redis answers PING.', 0);

            return;
        }
        $start = microtime(true);
        try {
            $this->redis->ping();
        } catch (\Throwable $e) {
            $this->out->gauge('featherpanel_redis_up', 'Whether Redis answers PING.', 0);

            throw $e;
        }
        $this->out->gauge('featherpanel_redis_up', 'Whether Redis answers PING.', 1);
        $this->out->gauge('featherpanel_redis_latency_seconds', 'Round trip of PING against Redis.', round(microtime(true) - $start, 6));
        $info = $this->redis->info();
        if (is_array($info)) {
            if (isset($info['used_memory'])) {
                $this->out->gauge('featherpanel_redis_used_memory_bytes', 'Memory used by Redis.', (int) $info['used_memory']);
            }
            if (isset($info['connected_clients'])) {
                $this->out->gauge('featherpanel_redis_connected_clients', 'Clients connected to Redis.', (int) $info['connected_clients']);
            }
        }
    }

    private function users(): void
    {
        $row = $this->pdo()->query(
            "SELECT COUNT(*) AS total,
                    COALESCE(SUM(banned = 'true'), 0) AS banned,
                    COALESCE(SUM(two_fa_enabled = 'true'), 0) AS two_fa,
                    COALESCE(SUM(last_seen >= UTC_TIMESTAMP() - INTERVAL 1 DAY), 0) AS active_24h,
                    COALESCE(SUM(last_seen >= UTC_TIMESTAMP() - INTERVAL 30 DAY), 0) AS active_30d
             FROM featherpanel_users WHERE deleted = 'false'"
        )->fetch(\PDO::FETCH_ASSOC) ?: [];
        $this->out->gauge('featherpanel_users', 'Registered (not deleted) users.', (int) ($row['total'] ?? 0));
        $this->out->gauge('featherpanel_users_banned', 'Banned users.', (int) ($row['banned'] ?? 0));
        $this->out->gauge('featherpanel_users_two_factor_enabled', 'Users with two-factor authentication enabled.', (int) ($row['two_fa'] ?? 0));
        $this->out->gauge('featherpanel_users_active', 'Users seen within the window.', (int) ($row['active_24h'] ?? 0), ['window' => '24h']);
        $this->out->gauge('featherpanel_users_active', 'Users seen within the window.', (int) ($row['active_30d'] ?? 0), ['window' => '30d']);
    }

    private function nodes(): void
    {
        $nodes = Node::getAllNodes();
        $maintenance = 0;
        foreach ($nodes as $node) {
            $id = (string) (int) $node['id'];
            $name = (string) ($node['name'] ?? $id);
            $this->nodeNames[$id] = $name;
            $inMaintenance = !empty($node['maintenance_mode']);
            $maintenance += $inMaintenance ? 1 : 0;
            $labels = ['node_id' => $id, 'node' => $name];
            $this->out->gauge('featherpanel_node_info', 'Node metadata.', 1, $labels + [
                'fqdn' => (string) ($node['fqdn'] ?? ''),
                'location_id' => (string) ($node['location_id'] ?? ''),
                'daemon' => (string) ($node['daemon_type'] ?? 'wings'),
            ]);
            $this->out->gauge('featherpanel_node_maintenance', 'Whether the node is in maintenance mode.', $inMaintenance ? 1 : 0, $labels);
            $this->out->gauge('featherpanel_node_memory_limit_bytes', 'Memory the node offers to servers (panel setting).', (int) ($node['memory'] ?? 0) * 1048576, $labels);
            $this->out->gauge('featherpanel_node_disk_limit_bytes', 'Disk the node offers to servers (panel setting).', (int) ($node['disk'] ?? 0) * 1048576, $labels);
        }
        $this->out->gauge('featherpanel_nodes', 'Nodes configured in the panel.', count($nodes));
        $this->out->gauge('featherpanel_nodes_maintenance', 'Nodes in maintenance mode.', $maintenance);

        if (!ObservabilityConfig::get()['metrics_node_probes'] || $nodes === []) {
            return;
        }

        $probes = $this->nodeProbes($nodes);
        $online = 0;
        foreach ($nodes as $node) {
            $id = (string) (int) $node['id'];
            $labels = ['node_id' => $id, 'node' => $this->nodeNames[$id] ?? $id];
            $probe = $probes[$id] ?? null;
            $up = is_array($probe) && ($probe['status'] ?? '') === 'healthy';
            $online += $up ? 1 : 0;
            $this->out->gauge('featherpanel_node_up', 'Whether the node daemon answered the panel (cached for 30s).', $up ? 1 : 0, $labels);
            if (is_array($probe) && isset($probe['latency_ms'])) {
                $this->out->gauge('featherpanel_node_probe_latency_seconds', 'Round trip of the daemon status probe.', round(((int) $probe['latency_ms']) / 1000, 3), $labels);
            }
            $util = is_array($probe) ? ($probe['utilization'] ?? null) : null;
            if ($up && is_array($util)) {
                if (isset($util['memory_total'])) {
                    $this->out->gauge('featherpanel_node_memory_total_bytes', 'Physical memory reported by the node daemon.', (int) $util['memory_total'], $labels);
                }
                if (isset($util['memory_used'])) {
                    $this->out->gauge('featherpanel_node_memory_used_bytes', 'Memory in use reported by the node daemon.', (int) $util['memory_used'], $labels);
                }
                if (isset($util['disk_total'])) {
                    $this->out->gauge('featherpanel_node_disk_total_bytes', 'Disk size reported by the node daemon.', (int) $util['disk_total'], $labels);
                }
                if (isset($util['disk_used'])) {
                    $this->out->gauge('featherpanel_node_disk_used_bytes', 'Disk in use reported by the node daemon.', (int) $util['disk_used'], $labels);
                }
                if (isset($util['cpu_percent'])) {
                    $this->out->gauge('featherpanel_node_cpu_usage_percent', 'CPU usage reported by the node daemon.', round((float) $util['cpu_percent'], 2), $labels);
                }
            }
        }
        $this->out->gauge('featherpanel_nodes_online', 'Nodes whose daemon answered the last probe.', $online);
    }

    /**
     * @param array<int, array<string, mixed>> $nodes
     *
     * @return array<int|string, array<string, mixed>>
     */
    private function nodeProbes(array $nodes): array
    {
        if ($this->redis !== null) {
            try {
                $cached = $this->redis->get(self::NODE_PROBE_CACHE_KEY);
                if (is_string($cached) && $cached !== '') {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) {
                        return $decoded;
                    }
                }
            } catch (\Throwable) {
            }
        }

        $result = [];
        foreach (NodeStatusHelper::probeNodesUtilization($nodes) as $id => $probe) {
            $result[(string) $id] = [
                'status' => (string) $probe['status'],
                'latency_ms' => $probe['latency_ms'] ?? null,
                'utilization' => is_array($probe['utilization'] ?? null) ? array_intersect_key($probe['utilization'], array_flip(['memory_total', 'memory_used', 'disk_total', 'disk_used', 'cpu_percent'])) : null,
            ];
        }

        if ($this->redis !== null) {
            try {
                $this->redis->setex(self::NODE_PROBE_CACHE_KEY, self::NODE_PROBE_CACHE_TTL, (string) json_encode($result));
            } catch (\Throwable) {
            }
        }

        return $result;
    }

    private function servers(): void
    {
        $pdo = $this->pdo();
        $total = 0;
        $rows = $pdo->query("SELECT COALESCE(NULLIF(status, ''), 'unknown') AS status, COUNT(*) AS c FROM featherpanel_servers GROUP BY 1 ORDER BY 2 DESC LIMIT 50")->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as $row) {
            $total += (int) $row['c'];
            $this->out->gauge('featherpanel_servers_by_status', 'Servers by panel status.', (int) $row['c'], ['status' => (string) $row['status']]);
        }
        $this->out->gauge('featherpanel_servers', 'Servers in the panel.', $total);
        $suspended = (int) $pdo->query('SELECT COUNT(*) FROM featherpanel_servers WHERE suspended = 1')->fetchColumn();
        $this->out->gauge('featherpanel_servers_suspended', 'Suspended servers.', $suspended);

        $perNode = $pdo->query('SELECT node_id, COUNT(*) AS c, COALESCE(SUM(memory), 0) AS memory, COALESCE(SUM(disk), 0) AS disk FROM featherpanel_servers GROUP BY node_id')->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($perNode as $row) {
            $id = (string) (int) $row['node_id'];
            $labels = ['node_id' => $id, 'node' => $this->nodeNames[$id] ?? $id];
            $this->out->gauge('featherpanel_node_servers', 'Servers placed on the node.', (int) $row['c'], $labels);
            $this->out->gauge('featherpanel_node_memory_allocated_bytes', 'Memory allocated to servers on the node.', (int) $row['memory'] * 1048576, $labels);
            $this->out->gauge('featherpanel_node_disk_allocated_bytes', 'Disk allocated to servers on the node.', (int) $row['disk'] * 1048576, $labels);
        }
    }

    private function backups(): void
    {
        $row = $this->pdo()->query(
            'SELECT COALESCE(SUM(is_successful = 1), 0) AS ok,
                    COALESCE(SUM(is_successful = 0 AND completed_at IS NOT NULL), 0) AS failed,
                    COALESCE(SUM(completed_at IS NULL), 0) AS running,
                    COALESCE(SUM(CASE WHEN is_successful = 1 THEN bytes ELSE 0 END), 0) AS bytes,
                    UNIX_TIMESTAMP(MAX(CASE WHEN is_successful = 1 THEN completed_at END)) AS last_ok
             FROM featherpanel_server_backups WHERE deleted_at IS NULL'
        )->fetch(\PDO::FETCH_ASSOC) ?: [];
        $this->out->gauge('featherpanel_backups', 'Server backups by state.', (int) ($row['ok'] ?? 0), ['state' => 'successful']);
        $this->out->gauge('featherpanel_backups', 'Server backups by state.', (int) ($row['failed'] ?? 0), ['state' => 'failed']);
        $this->out->gauge('featherpanel_backups', 'Server backups by state.', (int) ($row['running'] ?? 0), ['state' => 'in_progress']);
        $this->out->gauge('featherpanel_backups_size_bytes', 'Total size of successful server backups.', (int) ($row['bytes'] ?? 0));
        if (!empty($row['last_ok'])) {
            $this->out->gauge('featherpanel_backups_last_success_timestamp_seconds', 'Completion time of the newest successful backup.', (int) $row['last_ok']);
        }
    }

    private function tickets(): void
    {
        $pdo = $this->pdo();
        $rows = $pdo->query(
            "SELECT COALESCE(s.name, 'unknown') AS status, COUNT(*) AS c
             FROM featherpanel_tickets t LEFT JOIN featherpanel_ticket_statuses s ON s.id = t.status_id
             WHERE t.closed_at IS NULL GROUP BY 1 LIMIT 50"
        )->fetchAll(\PDO::FETCH_ASSOC);
        $open = 0;
        foreach ($rows as $row) {
            $open += (int) $row['c'];
            $this->out->gauge('featherpanel_tickets_open_by_status', 'Open support tickets by status.', (int) $row['c'], ['status' => (string) $row['status']]);
        }
        $this->out->gauge('featherpanel_tickets_open', 'Open (not closed) support tickets.', $open);
        $this->out->gauge('featherpanel_tickets', 'All support tickets.', (int) $pdo->query('SELECT COUNT(*) FROM featherpanel_tickets')->fetchColumn());
    }

    private function mailQueue(): void
    {
        $pdo = $this->pdo();
        $counts = ['pending' => 0, 'sent' => 0, 'failed' => 0];
        foreach ($pdo->query("SELECT status, COUNT(*) AS c FROM featherpanel_mail_queue WHERE deleted = 'false' GROUP BY status")->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $counts[(string) $row['status']] = (int) $row['c'];
        }
        foreach ($counts as $status => $count) {
            $this->out->gauge('featherpanel_mail_queue', 'Queued mail by status.', $count, ['status' => $status]);
        }
        $oldest = $pdo->query("SELECT UNIX_TIMESTAMP(MIN(created_at)) FROM featherpanel_mail_queue WHERE deleted = 'false' AND status = 'pending'")->fetchColumn();
        $this->out->gauge('featherpanel_mail_queue_oldest_pending_age_seconds', 'Age of the oldest pending mail (0 when none).', $oldest ? max(0, time() - (int) $oldest) : 0);
    }

    private function cron(): void
    {
        $rows = $this->pdo()->query('SELECT task_name, UNIX_TIMESTAMP(last_run_at) AS last_run, last_run_success FROM featherpanel_timed_tasks ORDER BY task_name')->fetchAll(\PDO::FETCH_ASSOC);
        $newest = 0;
        $failed = 0;
        foreach ($rows as $row) {
            $labels = ['task' => (string) $row['task_name']];
            $last = (int) ($row['last_run'] ?? 0);
            $newest = max($newest, $last);
            $ok = (int) $row['last_run_success'] === 1;
            $failed += $ok ? 0 : 1;
            if ($last > 0) {
                $this->out->gauge('featherpanel_cron_task_last_run_timestamp_seconds', 'Last run of a timed task.', $last, $labels);
            }
            $this->out->gauge('featherpanel_cron_task_last_run_success', 'Whether the last run of a timed task succeeded.', $ok ? 1 : 0, $labels);
        }
        $this->out->gauge('featherpanel_cron_tasks', 'Timed tasks known to the panel.', count($rows));
        $this->out->gauge('featherpanel_cron_tasks_failed', 'Timed tasks whose last run failed.', $failed);
        if ($newest > 0) {
            $this->out->gauge('featherpanel_cron_heartbeat_timestamp_seconds', 'Newest run of any timed task (the cron runner is stuck when this stops moving).', $newest);
        }
    }

    private function queues(): void
    {
        $counts = ['pending' => 0, 'processing' => 0, 'completed' => 0, 'failed' => 0, 'skipped' => 0];
        foreach ($this->pdo()->query('SELECT status, COUNT(*) AS c FROM featherpanel_server_auto_start_queue GROUP BY status')->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $counts[(string) $row['status']] = (int) $row['c'];
        }
        foreach ($counts as $status => $count) {
            $this->out->gauge('featherpanel_jobs', 'Background jobs by queue and status.', $count, ['queue' => 'server_auto_start', 'status' => $status]);
        }
    }

    private function vds(): void
    {
        foreach ($this->pdo()->query('SELECT status, COUNT(*) AS c FROM featherpanel_vm_instances GROUP BY status')->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $this->out->gauge('featherpanel_vm_instances_by_status', 'VDS instances by status.', (int) $row['c'], ['status' => (string) ($row['status'] ?? 'unknown')]);
        }
        $this->out->gauge('featherpanel_vm_instances', 'VDS instances.', (int) $this->pdo()->query('SELECT COUNT(*) FROM featherpanel_vm_instances')->fetchColumn());
    }

    private function webspaces(): void
    {
        $this->out->gauge('featherpanel_webspaces', 'Web hosting spaces.', (int) $this->pdo()->query('SELECT COUNT(*) FROM featherpanel_webspaces')->fetchColumn());
    }

    private function loki(): void
    {
        $stats = LokiShipper::stats();
        $config = ObservabilityConfig::get();
        $this->out->gauge('featherpanel_loki_push_enabled', 'Whether direct Loki push is enabled.', $config['loki_enabled'] ? 1 : 0);
        $this->out->gauge('featherpanel_loki_queue_length', 'Log lines waiting to be pushed to Loki.', $stats['queue_length']);
        $this->out->counter('featherpanel_loki_pushed_lines_total', 'Log lines pushed to Loki.', $stats['pushed_total']);
        $this->out->counter('featherpanel_loki_push_failures_total', 'Failed Loki push attempts.', $stats['failures_total']);
        $this->out->counter('featherpanel_loki_dropped_lines_total', 'Log lines dropped because the queue was full.', $stats['dropped_total']);
        if ($stats['last_success_at'] > 0) {
            $this->out->gauge('featherpanel_loki_last_success_timestamp_seconds', 'Time of the last successful Loki push.', $stats['last_success_at']);
        }
    }
}
