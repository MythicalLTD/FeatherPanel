<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
 * Tool to perform server power actions (start, stop, restart, kill).
 */
class ServerPowerActionTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        // Get action
        $action = $params['action'] ?? null;
        if (!$action) {
            return [
                'success' => false,
                'error' => 'Action is required. Valid actions: start, stop, restart, kill',
                'action_type' => 'server_power',
            ];
        }

        // Validate action
        $allowedActions = ['start', 'stop', 'restart', 'kill'];
        if (!in_array(strtolower($action), $allowedActions)) {
            return [
                'success' => false,
                'error' => 'Invalid action. Valid actions: start, stop, restart, kill',
                'action_type' => 'server_power',
            ];
        }

        $action = strtolower($action);

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
                'action_type' => 'server_power',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'server_power',
            ];
        }

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return [
                'success' => false,
                'error' => 'Node not found',
                'action_type' => 'server_power',
            ];
        }

        // Execute power action via Wings
        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = null;
            switch ($action) {
                case 'start':
                    $response = $wings->getServer()->startServer($server['uuid']);
                    break;
                case 'stop':
                    $response = $wings->getServer()->stopServer($server['uuid']);
                    break;
                case 'restart':
                    $response = $wings->getServer()->restartServer($server['uuid']);
                    break;
                case 'kill':
                    $response = $wings->getServer()->killServer($server['uuid']);
                    break;
            }

            if (!$response || !$response->isSuccessful()) {
                $error = $response ? $response->getError() : 'Unknown error';

                return [
                    'success' => false,
                    'error' => "Failed to {$action} server: {$error}",
                    'action_type' => 'server_power',
                    'is_destructive' => in_array($action, ['stop', 'restart', 'kill']),
                ];
            }
        } catch (\Exception $e) {
            $this->app->getLogger()->error("ServerPowerActionTool error ({$action}): " . $e->getMessage());

            return [
                'success' => false,
                'error' => "Failed to {$action} server: " . $e->getMessage(),
                'action_type' => 'server_power',
                'is_destructive' => in_array($action, ['stop', 'restart', 'kill']),
            ];
        }

        // Log activity
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'],
            'event' => "server_{$action}",
            'metadata' => json_encode([
                'action' => $action,
            ]),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerPowerAction(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                    'action' => $action,
                ]
            );
        }

        $actionPast = match ($action) {
            'start' => 'started',
            'stop' => 'stopped',
            'restart' => 'restarted',
            'kill' => 'killed',
            default => $action,
        };

        return [
            'success' => true,
            'action_type' => 'server_power',
            'action' => $action,
            'action_past' => $actionPast,
            'server_name' => $server['name'],
            'server_uuid' => $server['uuid'],
            'is_destructive' => in_array($action, ['stop', 'restart', 'kill']),
            'message' => "Server '{$server['name']}' {$actionPast} successfully",
        ];
    }

    public function getDescription(): string
    {
        return 'Perform a power action on a server (start, stop, restart, or kill). Stop, restart, and kill are destructive actions that will interrupt server operation.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'action' => 'Power action to perform: start, stop, restart, or kill (required)',
        ];
    }
}
