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
use App\Chat\Allocation;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;
use App\Services\Wings\Wings;

/**
 * Tool to auto-allocate a free allocation to a server.
 */
class AutoAllocateTool implements ToolInterface
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
                'action_type' => 'auto_allocate',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'auto_allocate',
            ];
        }

        // Check allocation limit
        $currentAllocations = count(Allocation::getByServerId($server['id']));
        $allocationLimit = (int) ($server['allocation_limit'] ?? 100);

        if ($currentAllocations >= $allocationLimit) {
            return [
                'success' => false,
                'error' => "Allocation limit reached ({$allocationLimit} allocations)",
                'action_type' => 'auto_allocate',
            ];
        }

        // Get available free allocations
        $availableAllocations = Allocation::getAvailable(100, 0);

        if (empty($availableAllocations)) {
            return [
                'success' => false,
                'error' => 'No free allocations available',
                'action_type' => 'auto_allocate',
            ];
        }

        // Randomly select 1 allocation to assign
        shuffle($availableAllocations);
        $selectedAllocation = $availableAllocations[0];

        // Assign the selected allocation to the server
        $success = Allocation::assignToServer($selectedAllocation['id'], $server['id']);
        if (!$success) {
            return [
                'success' => false,
                'error' => 'Failed to assign allocation',
                'action_type' => 'auto_allocate',
            ];
        }

        // Get the updated allocation
        $updatedAllocation = Allocation::getById($selectedAllocation['id']);
        if (!$updatedAllocation) {
            return [
                'success' => false,
                'error' => 'Failed to retrieve assigned allocation',
                'action_type' => 'auto_allocate',
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
                    $this->app->getLogger()->warning('Failed to sync server with Wings after auto-allocation: ' . $response->getError());
                }
            } catch (\Exception $e) {
                $this->app->getLogger()->error('Failed to sync server with Wings: ' . $e->getMessage());
            }

            // Log activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'allocation_auto_allocated',
                'metadata' => json_encode([
                    'allocation_ip' => $updatedAllocation['ip'],
                    'allocation_port' => $updatedAllocation['port'],
                ]),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerAllocationCreated(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'allocation_id' => $updatedAllocation['id'],
                    ]
                );
            }
        }

        return [
            'success' => true,
            'action_type' => 'auto_allocate',
            'allocation_id' => $updatedAllocation['id'],
            'allocation_ip' => $updatedAllocation['ip'],
            'allocation_port' => $updatedAllocation['port'],
            'server_name' => $server['name'],
            'message' => "Successfully assigned allocation {$updatedAllocation['ip']}:{$updatedAllocation['port']} to server '{$server['name']}'",
        ];
    }

    public function getDescription(): string
    {
        return 'Automatically assign a free allocation to a server. Only assigns one allocation at a time.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
        ];
    }
}
