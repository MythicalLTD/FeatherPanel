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
