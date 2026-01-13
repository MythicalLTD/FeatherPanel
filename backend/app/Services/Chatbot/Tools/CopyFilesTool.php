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
use App\Plugins\Events\Events\ServerEvent;

/**
 * Tool to copy files or directories on the server.
 */
class CopyFilesTool implements ToolInterface
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
                'action_type' => 'copy_files',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'copy_files',
            ];
        }

        // Get files and destination location
        $files = $params['files'] ?? null;
        $location = $params['location'] ?? null;

        if (!$files) {
            return [
                'success' => false,
                'error' => 'Files array is required',
                'action_type' => 'copy_files',
            ];
        }

        if (!is_array($files) || empty($files)) {
            return [
                'success' => false,
                'error' => 'Files must be a non-empty array',
                'action_type' => 'copy_files',
            ];
        }

        if (!$location) {
            return [
                'success' => false,
                'error' => 'Destination location is required',
                'action_type' => 'copy_files',
            ];
        }

        // Get node
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return [
                'success' => false,
                'error' => 'Node not found',
                'action_type' => 'copy_files',
            ];
        }

        // Copy files via Wings
        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = $wings->getServer()->copyFiles($server['uuid'], $location, $files);

            if (!$response->isSuccessful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to copy files: ' . $response->getError(),
                    'action_type' => 'copy_files',
                ];
            }

            // Log activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'files_copied',
                'metadata' => json_encode([
                    'location' => $location,
                    'files' => $files,
                    'file_count' => count($files),
                ]),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerFilesCopied(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'file_paths' => $files,
                    ]
                );
            }

            return [
                'success' => true,
                'action_type' => 'copy_files',
                'server_name' => $server['name'],
                'location' => $location,
                'files' => $files,
                'file_count' => count($files),
                'message' => 'Copied ' . count($files) . " file(s) to '{$location}' on server '{$server['name']}'",
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('CopyFilesTool error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to copy files: ' . $e->getMessage(),
                'action_type' => 'copy_files',
            ];
        }
    }

    public function getDescription(): string
    {
        return 'Copy files or directories to a new location on the server. Requires files array and destination location.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'files' => 'Array of file/directory paths to copy (required)',
            'location' => 'Destination location path (required)',
        ];
    }
}
