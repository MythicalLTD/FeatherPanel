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
use App\Chat\Allocation;
use App\Chat\ServerActivity;
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerAllocationEvent;

/**
 * Tool to delete an allocation from a server.
 */
class DeleteAllocationTool implements ToolInterface
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
                'action_type' => 'delete_allocation',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'delete_allocation',
            ];
        }

        // Get allocation ID
        $allocationId = $params['allocation_id'] ?? null;
        if (!$allocationId) {
            return [
                'success' => false,
                'error' => 'Allocation ID is required',
                'action_type' => 'delete_allocation',
            ];
        }

        // Get allocation
        $allocation = Allocation::getById((int) $allocationId);
        if (!$allocation) {
            return [
                'success' => false,
                'error' => 'Allocation not found',
                'action_type' => 'delete_allocation',
            ];
        }

        // Verify allocation belongs to this server
        if ((int) $allocation['server_id'] !== $server['id']) {
            return [
                'success' => false,
                'error' => 'Allocation does not belong to this server',
                'action_type' => 'delete_allocation',
            ];
        }

        // Check if this is the primary allocation
        if ((int) $allocation['id'] === (int) $server['allocation_id']) {
            return [
                'success' => false,
                'error' => 'Cannot delete primary allocation. Set another allocation as primary first.',
                'action_type' => 'delete_allocation',
            ];
        }

        // Unassign the allocation from the server
        $success = Allocation::unassignFromServer((int) $allocationId);
        if (!$success) {
            return [
                'success' => false,
                'error' => 'Failed to delete allocation',
                'action_type' => 'delete_allocation',
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
                    $this->app->getLogger()->warning('Failed to sync server with Wings after allocation deletion: ' . $response->getError());
                }
            } catch (\Exception $e) {
                $this->app->getLogger()->error('Failed to sync server with Wings: ' . $e->getMessage());
            }

            // Log activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'allocation_deleted',
                'metadata' => json_encode([
                    'allocation_ip' => $allocation['ip'],
                    'allocation_port' => $allocation['port'],
                ]),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerAllocationEvent::onServerAllocationDeleted(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'allocation_id' => $allocationId,
                    ]
                );
            }
        }

        return [
            'success' => true,
            'action_type' => 'delete_allocation',
            'allocation_id' => $allocationId,
            'allocation_ip' => $allocation['ip'],
            'allocation_port' => $allocation['port'],
            'server_name' => $server['name'],
            'message' => "Allocation {$allocation['ip']}:{$allocation['port']} removed successfully from server '{$server['name']}'",
        ];
    }

    public function getDescription(): string
    {
        return 'Delete an allocation from a server. Requires allocation ID. Cannot delete the primary allocation.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'allocation_id' => 'Allocation ID to delete (required)',
        ];
    }
}
