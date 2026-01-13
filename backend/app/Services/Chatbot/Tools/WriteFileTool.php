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
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerFilesEvent;

/**
 * Tool to write file content.
 */
class WriteFileTool implements ToolInterface
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
                'action_type' => 'write_file',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'write_file',
            ];
        }

        // Get file path
        $path = $params['path'] ?? null;
        if (!$path) {
            return [
                'success' => false,
                'error' => 'File path is required',
                'action_type' => 'write_file',
            ];
        }

        // Get file content
        $content = $params['content'] ?? null;
        if ($content === null) {
            return [
                'success' => false,
                'error' => 'File content is required',
                'action_type' => 'write_file',
            ];
        }

        // Get node
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return [
                'success' => false,
                'error' => 'Node not found',
                'action_type' => 'write_file',
            ];
        }

        // Write file to Wings
        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = $wings->getServer()->writeFile($server['uuid'], $path, $content);

            if (!$response->isSuccessful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to write file: ' . $response->getError(),
                    'action_type' => 'write_file',
                ];
            }

            // Log activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'file_written',
                'metadata' => json_encode([
                    'path' => $path,
                    'content_length' => strlen($content),
                ]),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerFilesEvent::onServerFileSaved(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'file_path' => $path,
                    ]
                );
            }

            return [
                'success' => true,
                'action_type' => 'write_file',
                'server_name' => $server['name'],
                'path' => $path,
                'content_length' => strlen($content),
                'message' => "File '{$path}' written successfully on server '{$server['name']}'",
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('WriteFileTool error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to write file: ' . $e->getMessage(),
                'action_type' => 'write_file',
            ];
        }
    }

    public function getDescription(): string
    {
        return 'Write content to a file on the server. Creates the file if it does not exist, overwrites if it does.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'path' => 'File path to write to (required)',
            'content' => 'File content to write (required)',
        ];
    }
}
