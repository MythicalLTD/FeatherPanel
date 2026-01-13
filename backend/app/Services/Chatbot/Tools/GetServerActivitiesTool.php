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
use App\Chat\ServerActivity;
use App\Helpers\ServerGateway;

/**
 * Tool to get server activities.
 */
class GetServerActivitiesTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        // Get server identifier (UUID or name)
        $serverIdentifier = $params['server_uuid'] ?? $params['server_name'] ?? null;
        $serverId = null;
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
            // Try by UUID first (full UUID)
            $server = Server::getServerByUuid($serverIdentifier);

            // Try by UUID Short if full UUID didn't work
            if (!$server) {
                $server = Server::getServerByUuidShort($serverIdentifier);
            }

            // Try by name if UUID didn't work
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

        // Verify server and access
        if ($server) {
            // Verify user has access
            if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
                return [
                    'error' => 'Access denied to server',
                    'activities' => [],
                ];
            }
            $serverId = (int) $server['id'];
        } else {
            return [
                'error' => 'Server not found. Please specify a server UUID or name, or ensure you are viewing a server page.',
                'activities' => [],
            ];
        }

        // Validate serverId
        if ($serverId <= 0) {
            return [
                'error' => 'Invalid server ID',
                'activities' => [],
            ];
        }

        // Get time filter (hours ago)
        $hoursAgo = isset($params['hours_ago']) ? (int) $params['hours_ago'] : null;
        $limit = isset($params['limit']) ? (int) $params['limit'] : 50;

        // Get activities
        $activities = ServerActivity::getActivitiesByServerId($serverId, $limit);

        // Filter by time if specified
        if ($hoursAgo !== null && $hoursAgo > 0) {
            $cutoffTime = date('Y-m-d H:i:s', strtotime("-{$hoursAgo} hours"));
            $activities = array_filter($activities, function ($activity) use ($cutoffTime) {
                return $activity['timestamp'] >= $cutoffTime;
            });
            $activities = array_values($activities); // Re-index array
        }

        // Format activities for response
        $formatted = [];
        foreach ($activities as $activity) {
            $metadata = null;
            if (!empty($activity['metadata'])) {
                $decoded = json_decode($activity['metadata'], true);
                $metadata = $decoded !== null ? $decoded : $activity['metadata'];
            }

            $formatted[] = [
                'id' => (int) $activity['id'],
                'event' => $activity['event'],
                'timestamp' => $activity['timestamp'],
                'metadata' => $metadata,
                'user_id' => $activity['user_id'] ? (int) $activity['user_id'] : null,
            ];
        }

        return [
            'activities' => $formatted,
            'count' => count($formatted),
            'server_id' => $serverId,
            'filter_hours_ago' => $hoursAgo,
        ];
    }

    public function getDescription(): string
    {
        return 'Get server activities/logs. Can filter by server, time range, and event type. Returns recent activities with timestamps and metadata.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'hours_ago' => 'Filter activities from last N hours (optional, integer)',
            'limit' => 'Maximum number of activities to return (optional, default: 50)',
        ];
    }
}
