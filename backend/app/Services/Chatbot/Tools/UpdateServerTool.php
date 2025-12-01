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
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;

/**
 * Tool to update server settings.
 */
class UpdateServerTool implements ToolInterface
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
                'action_type' => 'update_server',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'update_server',
            ];
        }

        // Prepare update data (only name and description)
        $updateData = [];

        if (isset($params['name'])) {
            $name = trim($params['name']);
            if (empty($name)) {
                return [
                    'success' => false,
                    'error' => 'Server name cannot be empty',
                    'action_type' => 'update_server',
                ];
            }
            if (strlen($name) > 255) {
                return [
                    'success' => false,
                    'error' => 'Server name is too long (max 255 characters)',
                    'action_type' => 'update_server',
                ];
            }
            $updateData['name'] = $name;
        }

        if (isset($params['description'])) {
            $description = trim($params['description']);
            if (strlen($description) > 1000) {
                return [
                    'success' => false,
                    'error' => 'Server description is too long (max 1000 characters)',
                    'action_type' => 'update_server',
                ];
            }
            $updateData['description'] = $description;
        }

        if (empty($updateData)) {
            return [
                'success' => false,
                'error' => 'No valid fields to update. You can update: name, description',
                'action_type' => 'update_server',
            ];
        }

        // Update server
        if (!Server::updateServerById($server['id'], $updateData)) {
            return [
                'success' => false,
                'error' => 'Failed to update server',
                'action_type' => 'update_server',
            ];
        }

        // Get updated server
        $updatedServer = Server::getServerById($server['id']);

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if ($node) {
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'server_updated',
                'metadata' => json_encode([
                    'updated_fields' => array_keys($updateData),
                ]),
            ]);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerUpdated(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                ]
            );
        }

        return [
            'success' => true,
            'action_type' => 'update_server',
            'server_id' => $updatedServer['id'],
            'server_name' => $updatedServer['name'],
            'updated_fields' => array_keys($updateData),
            'message' => "Server '{$updatedServer['name']}' updated successfully",
        ];
    }

    public function getDescription(): string
    {
        return 'Update server information. Can update name and description. Requires at least one field to update.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'name' => 'Server name (optional)',
            'description' => 'Server description (optional)',
        ];
    }
}
