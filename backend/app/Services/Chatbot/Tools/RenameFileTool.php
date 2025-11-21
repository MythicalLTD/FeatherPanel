<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerFilesEvent;

/**
 * Tool to rename files or directories on the server.
 */
class RenameFileTool implements ToolInterface
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
                'action_type' => 'rename_file',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'rename_file',
            ];
        }

        // Get files and root path
        $files = $params['files'] ?? null;
        $root = $params['root'] ?? '/';

        if (!$files) {
            return [
                'success' => false,
                'error' => 'Files array is required',
                'action_type' => 'rename_file',
            ];
        }

        if (!is_array($files) || empty($files)) {
            return [
                'success' => false,
                'error' => 'Files must be a non-empty array',
                'action_type' => 'rename_file',
            ];
        }

        // Validate each file has 'from' and 'to'
        foreach ($files as $file) {
            if (!is_array($file) || !isset($file['from']) || !isset($file['to'])) {
                return [
                    'success' => false,
                    'error' => 'Each file must have "from" and "to" properties',
                    'action_type' => 'rename_file',
                ];
            }
        }

        // Get node
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return [
                'success' => false,
                'error' => 'Node not found',
                'action_type' => 'rename_file',
            ];
        }

        // Rename files via Wings
        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = $wings->getServer()->renameFiles($server['uuid'], $root, $files);

            if (!$response->isSuccessful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to rename files: ' . $response->getError(),
                    'action_type' => 'rename_file',
                ];
            }

            // Log activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'file_renamed',
                'metadata' => json_encode([
                    'root' => $root,
                    'files' => $files,
                ]),
            ]);

            // Emit event for each renamed file
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                foreach ($files as $file) {
                    $eventManager->emit(
                        ServerFilesEvent::onServerFileRenamed(),
                        [
                            'user_uuid' => $user['uuid'],
                            'server_uuid' => $server['uuid'],
                            'file_path' => $root . '/' . $file['from'],
                            'new_path' => $root . '/' . $file['to'],
                        ]
                    );
                }
            }

            return [
                'success' => true,
                'action_type' => 'rename_file',
                'server_name' => $server['name'],
                'root' => $root,
                'files' => $files,
                'file_count' => count($files),
                'message' => 'Renamed ' . count($files) . " file(s) on server '{$server['name']}'",
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('RenameFileTool error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to rename files: ' . $e->getMessage(),
                'action_type' => 'rename_file',
            ];
        }
    }

    public function getDescription(): string
    {
        return 'Rename files or directories on the server. Requires files array with "from" and "to" properties, and root path.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'files' => 'Array of rename operations, each with "from" and "to" properties (required)',
            'root' => 'Root directory path (optional, default: /)',
        ];
    }
}
