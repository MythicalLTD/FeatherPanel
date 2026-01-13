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
        // ServerService handles the timeout per-request (15 minutes like pelican)
        // Large archives over 4GB can take significant time to decompress
        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token']
            );

            $response = $wings->getServer()->decompressArchive($server['uuid'], $file, $root);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                $errorMessage = 'Failed to decompress archive: ' . $error;

                // Provide more helpful error message for timeout/large file issues
                if (strpos(strtolower($error), 'timeout') !== false || strpos(strtolower($error), 'timed out') !== false) {
                    $errorMessage = 'Archive decompression timed out. This may occur with very large archives (>4GB). Please try again.';
                }

                return [
                    'success' => false,
                    'error' => $errorMessage,
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
