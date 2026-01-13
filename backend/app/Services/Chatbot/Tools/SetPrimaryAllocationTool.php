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
use App\Chat\Allocation;
use App\Chat\ServerActivity;
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerAllocationEvent;

/**
 * Tool to set a primary allocation for a server.
 */
class SetPrimaryAllocationTool implements ToolInterface
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
                'action_type' => 'set_primary_allocation',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'set_primary_allocation',
            ];
        }

        // Get allocation ID
        $allocationId = $params['allocation_id'] ?? null;
        if (!$allocationId) {
            return [
                'success' => false,
                'error' => 'Allocation ID is required',
                'action_type' => 'set_primary_allocation',
            ];
        }

        // Get allocation
        $allocation = Allocation::getById((int) $allocationId);
        if (!$allocation) {
            return [
                'success' => false,
                'error' => 'Allocation not found',
                'action_type' => 'set_primary_allocation',
            ];
        }

        // Verify allocation belongs to this server
        if ((int) $allocation['server_id'] !== $server['id']) {
            return [
                'success' => false,
                'error' => 'Allocation does not belong to this server',
                'action_type' => 'set_primary_allocation',
            ];
        }

        // Update the server's primary allocation
        $success = Server::updateServerById($server['id'], ['allocation_id' => (int) $allocationId]);
        if (!$success) {
            return [
                'success' => false,
                'error' => 'Failed to set primary allocation',
                'action_type' => 'set_primary_allocation',
            ];
        }

        // Sync with Wings
        $node = Node::getNodeById($server['node_id']);
        if ($node) {
            try {
                $wings = new Wings(
                    $node['fqdn'],
                    $node['daemonListen'],
                    $node['scheme'],
                    $node['daemon_token'],
                    30
                );

                $response = $wings->getServer()->syncServer($server['uuid']);
                if (!$response->isSuccessful()) {
                    $this->app->getLogger()->warning('Failed to sync server with Wings after setting primary allocation: ' . $response->getError());
                }
            } catch (\Exception $e) {
                $this->app->getLogger()->error('Failed to sync server with Wings: ' . $e->getMessage());
            }

            // Log activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'allocation_primary_set',
                'metadata' => json_encode([
                    'allocation_ip' => $allocation['ip'],
                    'allocation_port' => $allocation['port'],
                ]),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerAllocationEvent::onServerAllocationSetPrimary(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'allocation_id' => $allocationId,
                        'is_primary' => true,
                    ]
                );
            }
        }

        return [
            'success' => true,
            'action_type' => 'set_primary_allocation',
            'allocation_id' => $allocationId,
            'allocation_ip' => $allocation['ip'],
            'allocation_port' => $allocation['port'],
            'server_name' => $server['name'],
            'message' => "Primary allocation set to {$allocation['ip']}:{$allocation['port']} for server '{$server['name']}'",
        ];
    }

    public function getDescription(): string
    {
        return 'Set a specific allocation as the primary allocation for a server. Requires allocation ID.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'allocation_id' => 'Allocation ID to set as primary (required)',
        ];
    }
}
