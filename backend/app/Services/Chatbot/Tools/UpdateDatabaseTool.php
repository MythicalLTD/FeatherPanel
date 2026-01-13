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
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerDatabase;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;

/**
 * Tool to update a database for a server.
 */
class UpdateDatabaseTool implements ToolInterface
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
                'action_type' => 'update_database',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'update_database',
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
                'action_type' => 'update_database',
            ];
        }

        // Verify database belongs to this server
        if ($database['server_id'] != $server['id']) {
            return [
                'success' => false,
                'error' => 'Database not found on this server',
                'action_type' => 'update_database',
            ];
        }

        // Prepare update data
        $updateData = [];

        if (isset($params['remote'])) {
            $updateData['remote'] = $params['remote'];
        }

        if (isset($params['max_connections'])) {
            $updateData['max_connections'] = (int) $params['max_connections'];
        }

        if (empty($updateData)) {
            return [
                'success' => false,
                'error' => 'No valid fields to update. You can update: remote, max_connections',
                'action_type' => 'update_database',
            ];
        }

        // Update database
        if (!ServerDatabase::updateServerDatabase($database['id'], $updateData)) {
            return [
                'success' => false,
                'error' => 'Failed to update database',
                'action_type' => 'update_database',
            ];
        }

        // Get updated database
        $updatedDatabase = ServerDatabase::getServerDatabaseById($database['id']);

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if ($node) {
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'database_updated',
                'metadata' => json_encode([
                    'database_id' => $database['id'],
                    'database_name' => $database['database'],
                    'updated_fields' => array_keys($updateData),
                ]),
            ]);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerDatabaseUpdated(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                    'database_id' => $updatedDatabase['id'],
                ]
            );
        }

        return [
            'success' => true,
            'action_type' => 'update_database',
            'database_id' => $updatedDatabase['id'],
            'database_name' => $updatedDatabase['database'],
            'username' => $updatedDatabase['username'],
            'server_name' => $server['name'],
            'message' => "Database '{$updatedDatabase['database']}' (user: {$updatedDatabase['username']}) updated successfully on server '{$server['name']}'",
        ];
    }

    public function getDescription(): string
    {
        return 'Update a database for a server. Can update remote access and max connections settings. Requires database ID or name and at least one field to update.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'database_id' => 'Database ID (required if database_name not provided)',
            'database_name' => 'Database name or username (required if database_id not provided)',
            'remote' => 'Remote access allowed (optional, string - typically "%" for all hosts or specific IP)',
            'max_connections' => 'Maximum connections (optional, integer)',
        ];
    }
}
