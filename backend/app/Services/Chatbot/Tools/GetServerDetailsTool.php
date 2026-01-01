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

use App\Chat\Node;
use App\Chat\Spell;
use App\Chat\Server;
use App\Chat\Allocation;
use App\Chat\SpellVariable;
use App\Chat\ServerActivity;
use App\Chat\ServerVariable;
use App\Helpers\ServerGateway;

/**
 * Tool to get detailed server information.
 */
class GetServerDetailsTool implements ToolInterface
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

        // Get additional server information
        $server['node'] = Node::getNodeById($server['node_id']);
        $server['allocation'] = Allocation::getAllocationById($server['allocation_id']);
        $server['spell'] = Spell::getSpellById($server['spell_id']);
        $server['activity'] = array_slice(array_reverse(ServerActivity::getActivitiesByServerId($server['id'])), 0, 10);

        // Get server variables
        $serverVariables = ServerVariable::getServerVariablesByServerId($server['id']);
        $spellVariables = SpellVariable::getVariablesBySpellId($server['spell_id']);

        $spellVariableMap = [];
        foreach ($spellVariables as $spellVar) {
            $spellVariableMap[$spellVar['id']] = $spellVar;
        }

        $mergedVariables = [];
        foreach ($serverVariables as $serverVar) {
            $variableId = $serverVar['variable_id'];
            if (isset($spellVariableMap[$variableId])) {
                $spellVar = $spellVariableMap[$variableId];
                $mergedVariables[] = [
                    'name' => $spellVar['name'],
                    'value' => $serverVar['variable_value'],
                    'env_variable' => $spellVar['env_variable'],
                    'user_editable' => (bool) $spellVar['user_editable'],
                ];
            }
        }

        $server['variables'] = $mergedVariables;

        // Remove sensitive information
        unset(
            $server['node']['daemon_token'],
            $server['node']['daemon_token_id'],
            $server['node']['daemonListen'],
            $server['node']['daemonSFTP'],
            $server['node']['daemonBase'],
            $server['node']['public_ip_v4'],
            $server['node']['public_ip_v6']
        );

        return [
            'success' => true,
            'server' => $server,
        ];
    }

    public function getDescription(): string
    {
        return 'Get detailed information about a server including node, allocation, spell, variables, and recent activity.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
        ];
    }
}
