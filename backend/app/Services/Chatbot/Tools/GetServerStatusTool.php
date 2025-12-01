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
use App\Chat\Server;
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;

/**
 * Tool to get server status and information.
 */
class GetServerStatusTool implements ToolInterface
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
                'error' => 'Server not found. Please specify a server UUID or name, or ensure you are viewing a server page.',
                'status' => null,
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'error' => 'Access denied to server',
                'status' => null,
            ];
        }

        // Get node information
        $node = \App\Chat\Node::getNodeById($server['node_id']);
        if (!$node) {
            return [
                'error' => 'Node not found',
                'status' => null,
            ];
        }

        // Try to get real-time status from Wings
        $status = 'unknown';
        $resources = null;

        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                10 // 10 second timeout
            );

            $serverResponse = $wings->getServer()->getServer($server['uuid']);
            if ($serverResponse->isSuccessful()) {
                $serverData = $serverResponse->getData();
                $status = $serverData['state'] ?? 'unknown';
                $resources = $serverData['resources'] ?? null;
            }
        } catch (\Exception $e) {
            // If Wings is unavailable, use database status
            $this->app->getLogger()->debug('Failed to get server status from Wings: ' . $e->getMessage());
        }

        // Format response
        $response = [
            'server_name' => $server['name'],
            'server_uuid' => $server['uuid'],
            'server_uuid_short' => $server['uuidShort'],
            'status' => $status,
            'description' => $server['description'] ?? null,
        ];

        // Add resource limits
        if (isset($server['memory'])) {
            $response['memory_limit_mb'] = (int) $server['memory'];
            $response['memory_limit_gb'] = round((int) $server['memory'] / 1024, 2);
        }
        if (isset($server['swap'])) {
            $response['swap_limit_mb'] = (int) $server['swap'];
            $response['swap_limit_gb'] = round((int) $server['swap'] / 1024, 2);
        }
        if (isset($server['disk'])) {
            $response['disk_limit_mb'] = (int) $server['disk'];
            $response['disk_limit_gb'] = round((int) $server['disk'] / 1024, 2);
        }
        if (isset($server['cpu'])) {
            $response['cpu_limit'] = (int) $server['cpu'];
        }

        // Add real-time resource usage if available
        if ($resources) {
            $response['resource_usage'] = [
                'memory_bytes' => $resources['memory_bytes'] ?? null,
                'memory_percent' => $resources['memory_percent'] ?? null,
                'cpu_absolute' => $resources['cpu_absolute'] ?? null,
                'disk_bytes' => $resources['disk_bytes'] ?? null,
                'network' => $resources['network'] ?? null,
            ];
        }

        return $response;
    }

    public function getDescription(): string
    {
        return 'Get server status and information including current state (running/stopped), resource limits, and real-time resource usage if available.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
        ];
    }
}
