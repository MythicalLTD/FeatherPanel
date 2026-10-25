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

namespace App\Controllers\Admin;

use App\Chat\Node;
use App\Chat\Database;
use App\FastChat\Redis;
use App\Helpers\ApiResponse;
use App\Helpers\NodeStatusHelper;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * One page view of everything the panel depends on. Every check is isolated so one
 * broken dependency shows up as "down" instead of failing the whole page.
 */
class HealthController
{
    /** Some tasks only run daily, so a single task is stale after a day and a bit. */
    private const CRON_STALE_SECONDS = 93600;

    /** If no task at all ran for this long, the cron runner itself is not running. */
    private const CRON_HEARTBEAT_SECONDS = 900;

    public function index(Request $request): Response
    {
        $checks = [
            'database' => $this->check(fn () => $this->database()),
            'redis' => $this->check(fn () => $this->redis()),
            'nodes' => $this->check(fn () => $this->nodes()),
            'crons' => $this->check(fn () => $this->crons()),
            'queue' => $this->check(fn () => $this->queue()),
            'disk' => $this->check(fn () => $this->disk()),
        ];
        $overall = 'ok';
        foreach ($checks as $check) {
            if ($check['status'] === 'down') {
                $overall = 'down';
                break;
            }
            if ($check['status'] === 'warn') {
                $overall = 'warn';
            }
        }

        return ApiResponse::success([
            'status' => $overall,
            'checked_at' => gmdate('c'),
            'checks' => $checks,
            'versions' => $this->versions(),
        ], 'Health checked');
    }

    /** @param callable(): array $fn */
    private function check(callable $fn): array
    {
        $start = microtime(true);
        try {
            $result = $fn();
        } catch (\Throwable $e) {
            $result = ['status' => 'down', 'message' => mb_substr($e->getMessage(), 0, 300)];
        }
        $result['took_ms'] = (int) round((microtime(true) - $start) * 1000);

        return $result;
    }

    private function database(): array
    {
        $pdo = Database::getPdoConnection();
        $pdo->query('SELECT 1')->fetchColumn();
        $size = $pdo->query('SELECT COALESCE(SUM(data_length + index_length), 0) FROM information_schema.tables WHERE table_schema = DATABASE()')->fetchColumn();
        $threads = $pdo->query("SHOW STATUS LIKE 'Threads_connected'")->fetch(\PDO::FETCH_NUM);

        return [
            'status' => 'ok',
            'details' => [
                'size_bytes' => (int) $size,
                'connections' => isset($threads[1]) ? (int) $threads[1] : null,
            ],
        ];
    }

    private function redis(): array
    {
        $client = (new Redis())->getRedis();
        $pong = (string) $client->ping();
        $info = $client->info();
        $flat = [];
        array_walk_recursive($info, function ($value, $key) use (&$flat) {
            $flat[$key] = $value;
        });

        return [
            'status' => stripos($pong, 'PONG') !== false ? 'ok' : 'warn',
            'details' => [
                'version' => $flat['redis_version'] ?? null,
                'used_memory' => isset($flat['used_memory']) ? (int) $flat['used_memory'] : null,
                'clients' => isset($flat['connected_clients']) ? (int) $flat['connected_clients'] : null,
            ],
        ];
    }

    private function nodes(): array
    {
        $nodes = Node::getAllNodes();
        $probes = NodeStatusHelper::probeNodesUtilization($nodes);
        $list = [];
        $down = 0;
        foreach ($nodes as $node) {
            $probe = $probes[(int) $node['id']] ?? ['status' => 'unhealthy', 'error' => 'No response'];
            $healthy = ($probe['status'] ?? '') === 'healthy';
            if (!$healthy) {
                ++$down;
            }
            $list[] = [
                'id' => (int) $node['id'],
                'name' => (string) $node['name'],
                'fqdn' => (string) ($node['fqdn'] ?? ''),
                'healthy' => $healthy,
                'error' => $healthy ? null : ($probe['error'] ?? null),
            ];
        }

        return [
            'status' => $down === 0 ? 'ok' : ($down === count($list) ? 'down' : 'warn'),
            'details' => ['total' => count($list), 'unhealthy' => $down, 'nodes' => $list],
        ];
    }

    private function crons(): array
    {
        $rows = Database::getPdoConnection()
            ->query('SELECT task_name, last_run_at, last_run_success, last_run_message FROM featherpanel_timed_tasks ORDER BY task_name')
            ->fetchAll(\PDO::FETCH_ASSOC);
        $now = time();
        $tasks = [];
        $stale = 0;
        $failed = 0;
        $newest = 0;
        foreach ($rows as $row) {
            $last = $row['last_run_at'] ? strtotime($row['last_run_at'] . ' UTC') : null;
            $newest = max($newest, (int) $last);
            $isStale = $last === null || $now - $last > self::CRON_STALE_SECONDS;
            $ok = in_array((string) $row['last_run_success'], ['1', 'true'], true);
            $stale += $isStale ? 1 : 0;
            $failed += $ok ? 0 : 1;
            $tasks[] = [
                'name' => (string) $row['task_name'],
                'last_run_at' => $last ? gmdate('c', $last) : null,
                'success' => $ok,
                'stale' => $isStale,
                'message' => $row['last_run_message'] !== null ? mb_substr((string) $row['last_run_message'], 0, 200) : null,
            ];
        }
        $status = 'ok';
        if ($rows === [] || $now - $newest > self::CRON_HEARTBEAT_SECONDS) {
            $status = 'down';
        } elseif ($stale > 0 || $failed > 0) {
            $status = 'warn';
        }

        return ['status' => $status, 'details' => ['last_heartbeat_at' => $newest > 0 ? gmdate('c', $newest) : null, 'total' => count($rows), 'stale' => $stale, 'failed' => $failed, 'tasks' => $tasks]];
    }

    private function queue(): array
    {
        $pdo = Database::getPdoConnection();
        $mail = $pdo->query("SELECT SUM(status = 'pending') AS pending, SUM(status = 'failed') AS failed, MIN(CASE WHEN status = 'pending' THEN created_at END) AS oldest FROM featherpanel_mail_queue WHERE deleted = 'false'")
            ->fetch(\PDO::FETCH_ASSOC) ?: [];
        $autoStart = (int) $pdo->query("SELECT COUNT(*) FROM featherpanel_server_auto_start_queue WHERE status IN ('pending', 'processing')")->fetchColumn();
        $pending = (int) ($mail['pending'] ?? 0);
        $oldest = !empty($mail['oldest']) ? strtotime((string) $mail['oldest']) : null;
        // Mail that waits more than 30 minutes means the mail cron is stuck.
        $stuck = $oldest !== null && $oldest !== false && time() - $oldest > 1800;

        return [
            'status' => $stuck ? 'warn' : 'ok',
            'details' => [
                'mail_pending' => $pending,
                'mail_failed' => (int) ($mail['failed'] ?? 0),
                'mail_oldest_pending_at' => $oldest ? gmdate('c', $oldest) : null,
                'server_auto_start_pending' => $autoStart,
            ],
        ];
    }

    private function disk(): array
    {
        $paths = ['storage' => dirname(__DIR__, 3) . '/storage', 'root' => '/'];
        $out = [];
        $status = 'ok';
        foreach ($paths as $label => $path) {
            $total = @disk_total_space($path);
            $free = @disk_free_space($path);
            if ($total === false || $free === false || $total <= 0) {
                continue;
            }
            $usedPercent = round((1 - $free / $total) * 100, 1);
            if ($usedPercent >= 95) {
                $status = 'down';
            } elseif ($usedPercent >= 85 && $status === 'ok') {
                $status = 'warn';
            }
            $out[] = ['label' => $label, 'path' => $path, 'total' => (int) $total, 'free' => (int) $free, 'used_percent' => $usedPercent];
        }

        return ['status' => $status, 'details' => ['volumes' => $out]];
    }

    private function versions(): array
    {
        $mysql = null;
        try {
            $mysql = (string) Database::getPdoConnection()->query('SELECT VERSION()')->fetchColumn();
        } catch (\Throwable) {
        }

        return [
            'panel' => defined('APP_VERSION') ? (string) APP_VERSION : null,
            'php' => PHP_VERSION,
            'database' => $mysql,
            'os' => php_uname('s') . ' ' . php_uname('r'),
        ];
    }
}
