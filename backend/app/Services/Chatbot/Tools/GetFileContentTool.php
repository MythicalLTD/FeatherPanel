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

use App\Chat\Node;
use App\Chat\Server;
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;

/**
 * Tool to get file content.
 */
class GetFileContentTool implements ToolInterface
{
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
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
            ];
        }

        // Get file path
        $path = $params['path'] ?? null;
        if (!$path) {
            return [
                'success' => false,
                'error' => 'File path is required',
            ];
        }

        // Get node
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return [
                'success' => false,
                'error' => 'Node not found',
            ];
        }

        // Get file content from Wings
        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = $wings->getServer()->getFileContentsRaw($server['uuid'], $path, false);

            if (!$response->isSuccessful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to fetch file: ' . $response->getError(),
                ];
            }

            $fileContent = $response->getRawBody();
            if ($fileContent === null) {
                $fileContent = '';
            }

            // Limit content size for display (first 5000 characters)
            $displayContent = strlen($fileContent) > 5000 ? substr($fileContent, 0, 5000) . "\n... (truncated, file is " . strlen($fileContent) . ' characters)' : $fileContent;

            return [
                'success' => true,
                'server_name' => $server['name'],
                'path' => $path,
                'content' => $displayContent,
                'full_content' => $fileContent,
                'size' => strlen($fileContent),
                'truncated' => strlen($fileContent) > 5000,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to fetch file: ' . $e->getMessage(),
            ];
        }
    }

    public function getDescription(): string
    {
        return 'Read the content of a file on the server. Returns file content (truncated to 5000 chars for display, full content available).';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'path' => 'File path to read (required)',
        ];
    }
}
