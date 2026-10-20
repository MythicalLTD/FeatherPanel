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

namespace App\Controllers\User\Dashboard;

use App\App;
use App\Cache\Cache;
use App\Chat\Server;
use App\Chat\Subuser;
use App\Chat\Database;
use App\Helpers\ModuleGate;
use App\SubuserPermissions;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\ServerUtilization;
use App\Helpers\PlayerStatusService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * One request for the dashboard widgets: live usage and status of every server the user
 * can open (owned or as a subuser), recent backups and upcoming schedules. Wings is asked
 * once per node instead of one websocket per server.
 */
class DashboardOverviewController
{
    private const WINGS_TIMEOUT = 3;

    private const LIST_LIMIT = 8;

    #[OA\Get(
        path: '/api/user/dashboard/overview',
        summary: 'Dashboard overview',
        description: 'Aggregated usage, status, backups and schedules across the servers the current user can access.',
        tags: ['User - Dashboard'],
        responses: [
            new OA\Response(response: 200, description: 'Overview retrieved'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function overview(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        if (!ModuleGate::isEnabled(ModuleGate::GAME)) {
            return ApiResponse::success(self::emptyOverview(), 'Overview retrieved', 200);
        }

        $userId = (int) $user['id'];
        [$servers, $permissions] = self::accessibleServers($userId);
        if ($servers === []) {
            return ApiResponse::success(self::emptyOverview(), 'Overview retrieved', 200);
        }

        $live = ServerUtilization::collect($servers, self::WINGS_TIMEOUT);

        $byStatus = [];
        $usage = [
            'cpu_percent' => 0.0,
            'cpu_limit_percent' => 0,
            'memory_bytes' => 0,
            'memory_limit_bytes' => 0,
            'disk_bytes' => 0,
            'disk_limit_bytes' => 0,
            'network_rx_bytes' => 0,
            'network_tx_bytes' => 0,
            'unlimited' => ['cpu' => 0, 'memory' => 0, 'disk' => 0],
            'reporting' => 0,
        ];
        $serverRows = [];
        foreach ($servers as $server) {
            $uuid = (string) $server['uuid'];
            $stats = $live[$uuid] ?? null;
            $status = self::statusOf($server, $stats);
            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;

            $memoryLimit = (int) ($server['memory'] ?? 0) * 1024 * 1024;
            $diskLimit = (int) ($server['disk'] ?? 0) * 1024 * 1024;
            $cpuLimit = (int) ($server['cpu'] ?? 0);
            $memoryLimit > 0 ? $usage['memory_limit_bytes'] += $memoryLimit : $usage['unlimited']['memory']++;
            $diskLimit > 0 ? $usage['disk_limit_bytes'] += $diskLimit : $usage['unlimited']['disk']++;
            $cpuLimit > 0 ? $usage['cpu_limit_percent'] += $cpuLimit : $usage['unlimited']['cpu']++;

            if ($stats !== null) {
                ++$usage['reporting'];
                $usage['cpu_percent'] += $stats['cpu'];
                $usage['memory_bytes'] += $stats['memory_bytes'];
                $usage['disk_bytes'] += $stats['disk_bytes'];
                $usage['network_rx_bytes'] += $stats['rx_bytes'];
                $usage['network_tx_bytes'] += $stats['tx_bytes'];
            }

            $serverRows[] = [
                'uuidShort' => (string) $server['uuidShort'],
                'name' => (string) $server['name'],
                'status' => $status,
                'cpu' => $stats['cpu'] ?? null,
                'memory_bytes' => $stats['memory_bytes'] ?? null,
                'disk_bytes' => $stats['disk_bytes'] ?? null,
                'uptime_ms' => $stats['uptime_ms'] ?? null,
                'rx_bytes' => $stats['rx_bytes'] ?? null,
                'tx_bytes' => $stats['tx_bytes'] ?? null,
                'cpu_limit' => $cpuLimit,
                'memory_limit_bytes' => $memoryLimit,
                'disk_limit_bytes' => $diskLimit,
                'players' => self::cachedPlayers((string) $server['uuidShort'], $status),
            ];
        }
        $usage['cpu_percent'] = round($usage['cpu_percent'], 1);

        $byId = [];
        foreach ($servers as $server) {
            $byId[(int) $server['id']] = $server;
        }
        $backupIds = array_keys(array_filter($permissions, static fn (?array $p): bool => $p === null || in_array(SubuserPermissions::BACKUP_READ, $p, true)));
        $scheduleIds = array_keys(array_filter($permissions, static fn (?array $p): bool => $p === null || in_array(SubuserPermissions::SCHEDULE_READ, $p, true)));

        return ApiResponse::success([
            'servers' => [
                'total' => count($servers),
                'by_status' => $byStatus,
                'usage' => $usage,
                'items' => $serverRows,
            ],
            // Whether the user may see backups / schedules on any server, so the widgets can
            // hide instead of claiming there are none.
            'can_view' => ['backups' => $backupIds !== [], 'schedules' => $scheduleIds !== []],
            'backups' => self::recentBackups($backupIds, $byId),
            'schedules' => self::upcomingSchedules($scheduleIds, $byId),
        ], 'Overview retrieved', 200);
    }

    /**
     * Servers the user owns or is a subuser on, with the subuser permission list per server
     * id (null for owned servers, meaning every permission).
     *
     * @return array{0: array<int, array>, 1: array<int, ?array>}
     */
    public static function accessibleServers(int $userId): array
    {
        $servers = [];
        $permissions = [];
        foreach (Server::getServersByOwnerId($userId) as $server) {
            $servers[] = $server;
            $permissions[(int) $server['id']] = null;
        }

        $subuserPermissions = [];
        foreach (Subuser::getSubusersByUserId($userId) as $row) {
            $decoded = json_decode((string) ($row['permissions'] ?? ''), true);
            $subuserPermissions[(int) $row['server_id']] = is_array($decoded) ? array_values(array_filter($decoded, 'is_string')) : [];
        }
        if ($subuserPermissions !== []) {
            foreach (Server::getServersByIds(array_keys($subuserPermissions)) as $id => $server) {
                $id = (int) $id;
                if (array_key_exists($id, $permissions)) {
                    continue; // Owned already (stale subuser row).
                }
                $servers[] = $server;
                $permissions[$id] = $subuserPermissions[$id] ?? [];
            }
        }

        return [$servers, $permissions];
    }

    /**
     * Player count from the poller's cache (never queries the game server here).
     *
     * @return array{count: int, max: int}|null
     */
    private static function cachedPlayers(string $uuidShort, string $status): ?array
    {
        if ($status !== 'running') {
            return null;
        }
        try {
            $cached = Cache::get(PlayerStatusService::buildCacheKey($uuidShort));
        } catch (\Throwable) {
            return null;
        }
        if (!is_array($cached) || !isset($cached['player_count'])) {
            return null;
        }

        return ['count' => (int) $cached['player_count'], 'max' => (int) ($cached['max_players'] ?? 0)];
    }

    private static function emptyOverview(): array
    {
        return [
            'servers' => ['total' => 0, 'by_status' => (object) [], 'usage' => null, 'items' => []],
            'can_view' => ['backups' => false, 'schedules' => false],
            'backups' => [],
            'schedules' => [],
        ];
    }

    /** Same order of precedence as the server rows: lifecycle states first, then the live state. */
    private static function statusOf(array $server, ?array $stats): string
    {
        if ((int) ($server['suspended'] ?? 0) === 1) {
            return 'suspended';
        }
        $stored = (string) ($server['status'] ?? '');
        if (in_array($stored, ['installing', 'install_failed', 'restoring_backup', 'transferring', 'suspended'], true)) {
            return $stored;
        }
        $state = $stats['state'] ?? '';
        if ($state !== '') {
            return $state;
        }

        return 'unknown';
    }

    /**
     * @param int[] $serverIds servers whose backups the user may see
     * @param array<int, array> $byId
     */
    private static function recentBackups(array $serverIds, array $byId): array
    {
        if ($serverIds === []) {
            return [];
        }
        try {
            $placeholders = implode(',', array_fill(0, count($serverIds), '?'));
            $stmt = Database::getPdoConnection()->prepare(
                'SELECT uuid, server_id, name, bytes, is_successful, is_locked, completed_at, created_at
                 FROM featherpanel_server_backups
                 WHERE server_id IN (' . $placeholders . ') AND deleted_at IS NULL
                 ORDER BY COALESCE(completed_at, created_at) DESC
                 LIMIT ' . self::LIST_LIMIT
            );
            $stmt->execute(array_map('intval', $serverIds));
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Dashboard backups failed: ' . $e->getMessage());

            return [];
        }

        return array_map(static function (array $row) use ($byId): array {
            $server = $byId[(int) $row['server_id']] ?? [];
            $state = $row['completed_at'] === null ? 'running' : ((int) $row['is_successful'] === 1 ? 'completed' : 'failed');

            return [
                'uuid' => (string) $row['uuid'],
                'name' => (string) $row['name'],
                'bytes' => (int) $row['bytes'],
                'state' => $state,
                'locked' => (int) $row['is_locked'] === 1,
                'completed_at' => $row['completed_at'],
                'created_at' => $row['created_at'],
                'server' => ['uuidShort' => (string) ($server['uuidShort'] ?? ''), 'name' => (string) ($server['name'] ?? '')],
            ];
        }, $rows);
    }

    /**
     * @param int[] $serverIds servers whose schedules the user may see
     * @param array<int, array> $byId
     */
    private static function upcomingSchedules(array $serverIds, array $byId): array
    {
        if ($serverIds === []) {
            return [];
        }
        try {
            $placeholders = implode(',', array_fill(0, count($serverIds), '?'));
            $stmt = Database::getPdoConnection()->prepare(
                'SELECT id, server_id, name, next_run_at, last_run_at, only_when_online, is_processing
                 FROM featherpanel_server_schedules
                 WHERE server_id IN (' . $placeholders . ') AND is_active = 1 AND next_run_at IS NOT NULL
                 ORDER BY next_run_at ASC
                 LIMIT ' . self::LIST_LIMIT
            );
            $stmt->execute(array_map('intval', $serverIds));
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Dashboard schedules failed: ' . $e->getMessage());

            return [];
        }

        return array_map(static function (array $row) use ($byId): array {
            $server = $byId[(int) $row['server_id']] ?? [];

            return [
                'id' => (int) $row['id'],
                'name' => (string) $row['name'],
                'next_run_at' => $row['next_run_at'],
                'last_run_at' => $row['last_run_at'],
                'only_when_online' => (int) $row['only_when_online'] === 1,
                'processing' => (int) $row['is_processing'] === 1,
                'server' => ['uuidShort' => (string) ($server['uuidShort'] ?? ''), 'name' => (string) ($server['name'] ?? '')],
            ];
        }, $rows);
    }
}
