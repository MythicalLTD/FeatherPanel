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
use App\Plugins\Events\Events\ServerEvent;

/**
 * Tool to decompress an archive file.
 */
class DecompressArchiveTool implements ToolInterface
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
                'action_type' => 'decompress_archive',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'decompress_archive',
            ];
        }

        // Get file and root path
        $file = $params['file'] ?? null;
        $root = $params['root'] ?? '/';

        if (!$file) {
            return [
                'success' => false,
                'error' => 'Archive file path is required',
                'action_type' => 'decompress_archive',
            ];
        }

        // Get node
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return [
                'success' => false,
                'error' => 'Node not found',
                'action_type' => 'decompress_archive',
            ];
        }

        // Decompress archive via Wings
        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = $wings->getServer()->decompressArchive($server['uuid'], $file, $root);

            if (!$response->isSuccessful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to decompress archive: ' . $response->getError(),
                    'action_type' => 'decompress_archive',
                ];
            }

            // Log activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'archive_decompressed',
                'metadata' => json_encode([
                    'file' => $file,
                    'root' => $root,
                ]),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerFileDecompressed(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'file_path' => $root,
                    ]
                );
            }

            return [
                'success' => true,
                'action_type' => 'decompress_archive',
                'server_name' => $server['name'],
                'file' => $file,
                'root' => $root,
                'message' => "Archive '{$file}' decompressed successfully to '{$root}' on server '{$server['name']}'",
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('DecompressArchiveTool error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to decompress archive: ' . $e->getMessage(),
                'action_type' => 'decompress_archive',
            ];
        }
    }

    public function getDescription(): string
    {
        return 'Decompress an archive file (zip, tar.gz, tar.bz2, tar.xz, etc.) on the server.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'file' => 'Archive file path to decompress (required)',
            'root' => 'Root directory path for extraction (optional, default: /)',
        ];
    }
}
