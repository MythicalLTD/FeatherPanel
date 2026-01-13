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
use App\Chat\Backup;
use App\Chat\Server;
use App\Helpers\ServerGateway;

/**
 * Tool to get server backups.
 */
class GetServerBackupsTool implements ToolInterface
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
                'backups' => [],
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'error' => 'Access denied to server',
                'backups' => [],
            ];
        }

        // Get limit
        $limit = isset($params['limit']) ? (int) $params['limit'] : 20;

        // Get backups
        $backups = Backup::getBackupsByServerId((int) $server['id']);

        // Apply limit
        if ($limit > 0) {
            $backups = array_slice($backups, 0, $limit);
        }

        // Format backups
        $formatted = [];
        foreach ($backups as $backup) {
            $formatted[] = [
                'id' => (int) $backup['id'],
                'uuid' => $backup['uuid'],
                'name' => $backup['name'] ?? null,
                'is_successful' => (bool) $backup['is_successful'],
                'is_locked' => (bool) $backup['is_locked'],
                'disk' => $backup['disk'] ?? null,
                'created_at' => $backup['created_at'],
                'updated_at' => $backup['updated_at'],
            ];
        }

        return [
            'server_name' => $server['name'],
            'server_uuid' => $server['uuid'],
            'backups' => $formatted,
            'count' => count($formatted),
            'successful_count' => count(array_filter($formatted, fn ($b) => $b['is_successful'])),
            'locked_count' => count(array_filter($formatted, fn ($b) => $b['is_locked'])),
        ];
    }

    public function getDescription(): string
    {
        return 'Get server backups. Returns recent backups with their status (successful/failed), lock status, and creation dates.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'limit' => 'Maximum number of backups to return (optional, default: 20)',
        ];
    }
}
