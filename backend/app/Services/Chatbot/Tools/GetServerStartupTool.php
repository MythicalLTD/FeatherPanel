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

use App\Chat\Spell;
use App\Chat\Server;
use App\Chat\SpellVariable;
use App\Chat\ServerVariable;
use App\Helpers\ServerGateway;

/**
 * Tool to get startup configuration and variables for a server.
 */
class GetServerStartupTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $serverIdentifier = $params['server_uuid'] ?? $params['server_name'] ?? null;
        $server = null;

        if (!$serverIdentifier && isset($pageContext['server'])) {
            $contextServer = $pageContext['server'];
            $serverUuidShort = $contextServer['uuidShort'] ?? null;

            if ($serverUuidShort) {
                $server = Server::getServerByUuidShort($serverUuidShort);
            }
        }

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
            ];
        }

        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'error' => 'Access denied to server',
            ];
        }

        $spell = Spell::getSpellById((int) $server['spell_id']);
        $serverVariables = ServerVariable::getServerVariablesByServerId((int) $server['id']);
        $spellVariables = SpellVariable::getVariablesBySpellId((int) $server['spell_id']);

        $spellVariableMap = [];
        foreach ($spellVariables as $spellVariable) {
            $spellVariableMap[(int) $spellVariable['id']] = $spellVariable;
        }

        $variables = [];
        foreach ($serverVariables as $serverVariable) {
            $variableId = (int) ($serverVariable['variable_id'] ?? 0);
            $spellVariable = $spellVariableMap[$variableId] ?? null;

            $variables[] = [
                'variable_id' => $variableId,
                'name' => $spellVariable['name'] ?? null,
                'env_variable' => $spellVariable['env_variable'] ?? null,
                'value' => $serverVariable['variable_value'] ?? null,
                'default_value' => $spellVariable['default_value'] ?? null,
                'user_viewable' => isset($spellVariable['user_viewable']) ? (bool) $spellVariable['user_viewable'] : null,
                'user_editable' => isset($spellVariable['user_editable']) ? (bool) $spellVariable['user_editable'] : null,
                'rules' => $spellVariable['rules'] ?? null,
            ];
        }

        return [
            'server_name' => $server['name'],
            'server_uuid' => $server['uuid'],
            'startup' => $server['startup'] ?? null,
            'docker_image' => $server['image'] ?? null,
            'spell_name' => $spell['name'] ?? null,
            'spell_startup' => $spell['startup'] ?? null,
            'variables' => $variables,
            'variable_count' => count($variables),
        ];
    }

    public function getDescription(): string
    {
        return 'Get startup configuration for a server, including startup command, Docker image, spell startup, and environment variables.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
        ];
    }
}
