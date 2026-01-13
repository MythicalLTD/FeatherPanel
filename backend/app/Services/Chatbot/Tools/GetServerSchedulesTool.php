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
