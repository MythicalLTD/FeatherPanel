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
use App\Chat\ServerDatabase;
use App\Helpers\ServerGateway;

/**
 * Tool to get database credentials for a server.
 */
class GetDatabaseCredentialsTool implements ToolInterface
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

        if (!$server) {
            return [
                'error' => 'Server not found. Please specify a server UUID or name, or ensure you are viewing a server page.',
                'databases' => [],
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'error' => 'Access denied to server',
                'databases' => [],
            ];
        }

        // Get databases for server
        $databases = ServerDatabase::getServerDatabasesWithDetailsByServerId((int) $server['id']);

        // Format response
        $formatted = [];
        foreach ($databases as $db) {
            $formatted[] = [
                'id' => (int) $db['id'],
                'database_name' => $db['database'],
                'username' => $db['username'],
                'password' => $db['password'], // Include password as user requested credentials
                'database_host' => $db['database_host'],
                'database_port' => (int) $db['database_port'],
                'database_type' => $db['database_type'],
                'remote' => $db['remote'],
                'max_connections' => (int) $db['max_connections'],
                'created_at' => $db['created_at'],
            ];
        }

        return [
            'server_name' => $server['name'],
            'server_uuid' => $server['uuid'],
            'databases' => $formatted,
            'count' => count($formatted),
        ];
    }

    public function getDescription(): string
    {
        return 'Get database credentials (database name, username, password, host, port) for a server. Returns all databases associated with the specified server.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
        ];
    }
}
