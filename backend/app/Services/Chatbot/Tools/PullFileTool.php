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

/**
 * Tool to download a file from a URL to the server.
 */
class PullFileTool implements ToolInterface
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
                'action_type' => 'pull_file',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'pull_file',
            ];
        }

        // Get URL and root path
        $url = $params['url'] ?? null;
        $root = $params['root'] ?? '/';
        $fileName = $params['file_name'] ?? null;
        $foreground = isset($params['foreground']) ? (bool) $params['foreground'] : false;
        $useHeader = isset($params['use_header']) ? (bool) $params['use_header'] : true;

        if (!$url) {
            return [
                'success' => false,
                'error' => 'URL is required',
                'action_type' => 'pull_file',
            ];
        }

        // Validate URL format
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return [
                'success' => false,
                'error' => 'Invalid URL format',
                'action_type' => 'pull_file',
            ];
        }

        // Get node
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return [
                'success' => false,
                'error' => 'Node not found',
                'action_type' => 'pull_file',
            ];
        }

        // Pull file via Wings
        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = $wings->getServer()->pullFile(
                $server['uuid'],
                $url,
                $root,
                $fileName,
                $foreground,
                $useHeader
            );

            if (!$response->isSuccessful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to pull file: ' . $response->getError(),
                    'action_type' => 'pull_file',
                ];
            }

            $responseData = $response->getData();
            $pullId = $responseData['id'] ?? null;

            // Log activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'file_pulled',
                'metadata' => json_encode([
                    'url' => $url,
                    'root' => $root,
                    'file_name' => $fileName,
                    'foreground' => $foreground,
                ]),
            ]);

            return [
                'success' => true,
                'action_type' => 'pull_file',
                'server_name' => $server['name'],
                'url' => $url,
                'root' => $root,
                'file_name' => $fileName,
                'pull_id' => $pullId,
                'foreground' => $foreground,
                'message' => $foreground
                    ? "File downloaded from '{$url}' to '{$root}' on server '{$server['name']}'"
                    : "File download initiated from '{$url}' to '{$root}' on server '{$server['name']}' (running in background)",
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('PullFileTool error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to pull file: ' . $e->getMessage(),
                'action_type' => 'pull_file',
            ];
        }
    }

    public function getDescription(): string
    {
        return 'Download a file from a URL to the server. Can run in foreground (wait for completion) or background (async).';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'url' => 'URL to download from (required)',
            'root' => 'Destination directory path (optional, default: /)',
            'file_name' => 'Custom filename (optional, uses URL filename if not provided)',
            'foreground' => 'Run in foreground and wait for completion (optional, boolean, default: false)',
            'use_header' => 'Use headers for download (optional, boolean, default: true)',
        ];
    }
}
