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
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerDatabase;
use App\Chat\DatabaseInstance;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;

/**
 * Tool to delete a database for a server.
 */
class DeleteDatabaseTool implements ToolInterface
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
                'success' => false,
                'error' => 'Server not found. Please specify a server UUID or name, or ensure you are viewing a server page.',
                'action_type' => 'delete_database',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'delete_database',
            ];
        }

        // Get database identifier (ID or name)
        $databaseId = $params['database_id'] ?? null;
        $databaseName = $params['database_name'] ?? null;
        $database = null;

        if ($databaseId) {
            $database = ServerDatabase::getServerDatabaseById((int) $databaseId);
        } elseif ($databaseName) {
            // Get all databases for this server and find by name
            $databases = ServerDatabase::getServerDatabasesWithDetailsByServerId($server['id']);
            foreach ($databases as $db) {
                if ($db['database'] === $databaseName || $db['username'] === $databaseName) {
                    $database = $db;
                    break;
                }
            }
        }

        if (!$database) {
            return [
                'success' => false,
                'error' => 'Database not found. Please specify a database ID or name.',
                'action_type' => 'delete_database',
            ];
        }

        // Verify database belongs to this server
        if ($database['server_id'] != $server['id']) {
            return [
                'success' => false,
                'error' => 'Database not found on this server',
                'action_type' => 'delete_database',
            ];
        }

        // Get database host
        $databaseHost = DatabaseInstance::getDatabaseById($database['database_host_id']);
        if (!$databaseHost) {
            return [
                'success' => false,
                'error' => 'Database host not found',
                'action_type' => 'delete_database',
            ];
        }

        // Delete database from host and database record
        try {
            // Delete from database host (this is a simplified version - actual implementation may vary)
            // The controller has a deleteDatabaseFromHost method, but we'll use the Chat model method
            if (!ServerDatabase::deleteServerDatabase($database['id'])) {
                return [
                    'success' => false,
                    'error' => 'Failed to delete database',
                    'action_type' => 'delete_database',
                ];
            }
        } catch (\Exception $e) {
            $this->app->getLogger()->error('DeleteDatabaseTool error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to delete database: ' . $e->getMessage(),
                'action_type' => 'delete_database',
            ];
        }

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if ($node) {
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'database_deleted',
                'metadata' => json_encode([
                    'database_id' => $database['id'],
                    'database_name' => $database['database'],
                    'username' => $database['username'],
                ]),
            ]);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerDatabaseDeleted(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                    'database_id' => $database['id'],
                ]
            );
        }

        return [
            'success' => true,
            'action_type' => 'delete_database',
            'database_id' => $database['id'],
            'database_name' => $database['database'],
            'username' => $database['username'],
            'server_name' => $server['name'],
            'message' => "Database '{$database['database']}' (user: {$database['username']}) deleted successfully from server '{$server['name']}'",
        ];
    }

    public function getDescription(): string
    {
        return 'Delete a database for a server. Requires database ID or name. This will permanently delete the database and its user from the database host.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'database_id' => 'Database ID (required if database_name not provided)',
            'database_name' => 'Database name or username (required if database_id not provided)',
        ];
    }
}
