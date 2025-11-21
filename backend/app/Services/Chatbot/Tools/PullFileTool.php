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
