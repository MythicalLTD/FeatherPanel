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
use App\Chat\Spell;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerVariable;
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;

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

        // Prepare update data
        $updateData = [];
        $variablesPayload = null;

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

        if (isset($params['startup'])) {
            $startup = trim($params['startup']);
            if (empty($startup)) {
                return [
                    'success' => false,
                    'error' => 'Startup command cannot be empty',
                    'action_type' => 'update_server',
                ];
            }
            $updateData['startup'] = $startup;
        }

        if (isset($params['image'])) {
            $image = trim($params['image']);
            if (empty($image)) {
                return [
                    'success' => false,
                    'error' => 'Docker image cannot be empty',
                    'action_type' => 'update_server',
                ];
            }
            $updateData['image'] = $image;
        }

        if (isset($params['spell_id'])) {
            $spellId = (int) $params['spell_id'];
            if ($spellId <= 0) {
                return [
                    'success' => false,
                    'error' => 'Invalid spell_id',
                    'action_type' => 'update_server',
                ];
            }
            $spell = Spell::getSpellById($spellId);
            if (!$spell) {
                return [
                    'success' => false,
                    'error' => 'Spell not found',
                    'action_type' => 'update_server',
                ];
            }
            $updateData['spell_id'] = $spellId;
            $updateData['realms_id'] = (int) $spell['realm_id'];
        }

        if (isset($params['variables']) && is_array($params['variables'])) {
            $variablesPayload = [];
            foreach ($params['variables'] as $item) {
                if (is_array($item) && isset($item['variable_id']) && array_key_exists('variable_value', $item)) {
                    $variablesPayload[] = [
                        'variable_id' => (int) $item['variable_id'],
                        'variable_value' => (string) $item['variable_value'],
                    ];
                }
            }
        }

        if (empty($updateData) && $variablesPayload === null) {
            return [
                'success' => false,
                'error' => 'No valid fields to update. You can update: name, description, startup, image, spell_id, variables',
                'action_type' => 'update_server',
            ];
        }

        // Update server
        if (!empty($updateData)) {
            if (!Server::updateServerById($server['id'], $updateData)) {
                return [
                    'success' => false,
                    'error' => 'Failed to update server',
                    'action_type' => 'update_server',
                ];
            }
        }

        // Update variables if provided
        if ($variablesPayload !== null) {
            $serverVariables = ServerVariable::getServerVariablesByServerId($server['id']);
            foreach ($variablesPayload as $var) {
                // Find existing server variable by variable_id
                $existingVar = null;
                foreach ($serverVariables as $sv) {
                    if ((int) $sv['variable_id'] === (int) $var['variable_id']) {
                        $existingVar = $sv;
                        break;
                    }
                }

                if ($existingVar) {
                    // Update existing variable
                    ServerVariable::updateServerVariable((int) $existingVar['id'], [
                        'variable_value' => $var['variable_value'],
                    ]);
                } else {
                    // Create new variable
                    ServerVariable::createServerVariable([
                        'server_id' => $server['id'],
                        'variable_id' => $var['variable_id'],
                        'variable_value' => $var['variable_value'],
                    ]);
                }
            }
        }

        // Sync with Wings if server settings changed
        if (!empty($updateData)) {
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
                        $this->app->getLogger()->warning('Failed to sync server with Wings after update: ' . $response->getError());
                    }
                } catch (\Exception $e) {
                    $this->app->getLogger()->error('Failed to sync server with Wings: ' . $e->getMessage());
                }
            }
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
                    'variables_updated' => $variablesPayload !== null,
                ]),
            ]);
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
        return 'Update server settings. Can update name, description, startup command, Docker image, spell, and variables. Requires at least one field to update.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'name' => 'Server name (optional)',
            'description' => 'Server description (optional)',
            'startup' => 'Startup command (optional)',
            'image' => 'Docker image (optional)',
            'spell_id' => 'Spell ID to change server spell (optional)',
            'variables' => 'Array of variables to update (optional). Each item: {"variable_id": int, "variable_value": string}',
        ];
    }
}
