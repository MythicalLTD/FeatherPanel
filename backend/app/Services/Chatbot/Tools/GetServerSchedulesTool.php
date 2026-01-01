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

namespace App\Services\Chatbot\Tools;

use App\App;
use App\Chat\Server;
use App\Chat\ServerSchedule;
use App\Helpers\ServerGateway;

/**
 * Tool to get server schedules.
 */
class GetServerSchedulesTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        // Get server identifier
        $serverIdentifier = $params['server_uuid'] ?? $params['server_name'] ?? null;
        $server = null;

        // If no identifier provided, try to get server from pageContext
        if (!$serverIdentifier && isset($pageContext['server'])) {
            $contextServer = $pageContext['server'];
            $serverUuidShort = $contextServer['uuidShort'] ?? null;

            if ($serverUuidShort) {
                $server = Server::getServerByUuidShort($serverUuidShort);
            }
        }

        // Resolve server if identifier provided
        if ($serverIdentifier && !$server) {
            $server = Server::getServerByUuid($serverIdentifier);

            if (!$server) {
                $server = Server::getServerByUuidShort($serverIdentifier);
            }

            if (!$server) {
                $servers = Server::searchServers(
                    page: 1,
                    limit: 10,
                    search: $serverIdentifier,
                    ownerId: $user['id']
                );
                if (!empty($servers)) {
                    $server = $servers[0];
                }
            }
        }

        if (!$server) {
            return [
                'error' => 'Server not found. Please specify a server UUID or name, or ensure you are viewing a server page.',
                'schedules' => [],
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'error' => 'Access denied to server',
                'schedules' => [],
            ];
        }

        // Get only active schedules if requested
        $activeOnly = isset($params['active_only']) && $params['active_only'] === true;

        // Get schedules
        if ($activeOnly) {
            $schedules = ServerSchedule::getActiveSchedulesByServerId((int) $server['id']);
        } else {
            $schedules = ServerSchedule::getSchedulesByServerId((int) $server['id']);
        }

        // Format schedules
        $formatted = [];
        foreach ($schedules as $schedule) {
            $formatted[] = [
                'id' => (int) $schedule['id'],
                'name' => $schedule['name'],
                'cron_expression' => sprintf(
                    '%s %s %s %s %s',
                    $schedule['cron_minute'],
                    $schedule['cron_hour'],
                    $schedule['cron_day_of_month'],
                    $schedule['cron_month'],
                    $schedule['cron_day_of_week']
                ),
                'is_active' => (bool) $schedule['is_active'],
                'only_when_online' => (bool) $schedule['only_when_online'],
                'next_run_at' => $schedule['next_run_at'] ?? null,
                'created_at' => $schedule['created_at'],
            ];
        }

        return [
            'server_name' => $server['name'],
            'server_uuid' => $server['uuid'],
            'schedules' => $formatted,
            'count' => count($formatted),
            'active_count' => count(array_filter($formatted, fn ($s) => $s['is_active'])),
        ];
    }

    public function getDescription(): string
    {
        return 'Get server schedules (scheduled tasks). Returns all schedules with their cron expressions, status, and next run times. Can filter to show only active schedules.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'active_only' => 'Only return active schedules (optional, boolean, default: false)',
        ];
    }
}
