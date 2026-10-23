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

use App\Chat\Server;
use App\Helpers\ModuleGate;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\ServerResourceSample;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Last 24 hours of five minute CPU, memory and disk samples, for the dashboard
 * (every server the user can open) and for a single server's console header.
 *
 * Points are compact arrays: [unix_seconds, cpu_percent, memory_bytes, disk_bytes].
 */
class ResourceHistoryController
{
    private const WINDOW_SECONDS = 86400;

    /** Upper bound for the dashboard response; the sparklines only cover what fits on screen anyway. */
    private const MAX_SERVERS = 100;

    #[OA\Get(
        path: '/api/user/dashboard/resource-history',
        summary: 'Resource history for the dashboard',
        description: 'Five minute CPU, memory and disk samples over the last 24 hours for every server the user owns or is a subuser on, plus totals per sample.',
        tags: ['User - Dashboard'],
        responses: [
            new OA\Response(response: 200, description: 'History retrieved'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function dashboard(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        [$from, $to] = self::window();
        $empty = ['interval_seconds' => ServerResourceSample::INTERVAL_SECONDS, 'from' => $from, 'to' => $to, 'servers' => (object) [], 'totals' => []];
        if (!ModuleGate::isEnabled(ModuleGate::GAME)) {
            return ApiResponse::success($empty, 'History retrieved', 200);
        }

        [$servers] = DashboardOverviewController::accessibleServers((int) $user['id']);
        $servers = array_slice($servers, 0, self::MAX_SERVERS);
        if ($servers === []) {
            return ApiResponse::success($empty, 'History retrieved', 200);
        }

        $uuidShortById = [];
        foreach ($servers as $server) {
            $uuidShortById[(int) $server['id']] = (string) $server['uuidShort'];
        }

        $series = [];
        $totals = [];
        foreach (ServerResourceSample::since(array_keys($uuidShortById), $from) as $serverId => $samples) {
            $uuidShort = $uuidShortById[$serverId] ?? null;
            if ($uuidShort === null) {
                continue;
            }
            foreach ($samples as $sample) {
                $series[$uuidShort][] = self::point($sample);
                $t = $sample['t'];
                $totals[$t] ??= [$t, 0.0, 0, 0, 0];
                $totals[$t][1] += $sample['cpu'];
                $totals[$t][2] += $sample['memory_bytes'];
                $totals[$t][3] += $sample['disk_bytes'];
                ++$totals[$t][4];
            }
        }
        ksort($totals);
        $totals = array_map(static function (array $row): array {
            $row[1] = round($row[1], 1);

            return $row;
        }, array_values($totals));

        return ApiResponse::success([
            'interval_seconds' => ServerResourceSample::INTERVAL_SECONDS,
            'from' => $from,
            'to' => $to,
            'servers' => $series === [] ? (object) [] : $series,
            // [unix_seconds, cpu_sum, memory_sum, disk_sum, servers_reporting]
            'totals' => $totals,
        ], 'History retrieved', 200);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/resource-history',
        summary: 'Resource history for one server',
        description: 'CPU, memory and disk history: five minute samples over 24 hours (range=24h, default) or hourly averages over 7 days (range=7d).',
        tags: ['User - Servers'],
        parameters: [
            new OA\Parameter(name: 'uuidShort', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'range', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['24h', '7d'])),
        ],
        responses: [
            new OA\Response(response: 200, description: 'History retrieved'),
            new OA\Response(response: 404, description: 'Server not found'),
        ]
    )]
    public function server(Request $request, string $uuidShort): Response
    {
        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // 24h: five minute points. 7d: hourly averages (168 points instead of 2016).
        $range = $request->query->get('range') === '7d' ? '7d' : '24h';
        if ($range === '7d') {
            $interval = 3600;
            $to = time() - (time() % $interval);
            $from = $to - 7 * 86400 + $interval;
        } else {
            $interval = ServerResourceSample::INTERVAL_SECONDS;
            [$from, $to] = self::window();
        }
        $samples = ServerResourceSample::since([(int) $server['id']], $from)[(int) $server['id']] ?? [];
        if ($range === '7d') {
            $samples = ServerResourceSample::downsample($samples, $interval);
        }
        $points = array_map(static fn (array $sample): array => self::point($sample), $samples);

        return ApiResponse::success([
            'range' => $range,
            'interval_seconds' => $interval,
            'from' => $from,
            'to' => $to,
            'points' => $points,
        ], 'History retrieved', 200);
    }

    /** @return array{0: int, 1: int} first and last bucket of the window */
    private static function window(): array
    {
        $to = ServerResourceSample::bucket(time());

        return [$to - self::WINDOW_SECONDS + ServerResourceSample::INTERVAL_SECONDS, $to];
    }

    /** @param array{t: int, cpu: float, memory_bytes: int, disk_bytes: int} $sample */
    private static function point(array $sample): array
    {
        return [$sample['t'], $sample['cpu'], $sample['memory_bytes'], $sample['disk_bytes']];
    }
}
