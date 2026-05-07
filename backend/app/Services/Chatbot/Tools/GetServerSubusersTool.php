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

use App\Chat\Server;
use App\Chat\Subuser;
use App\Helpers\ServerGateway;

/**
 * Tool to get subusers for a server.
 */
class GetServerSubusersTool implements ToolInterface
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
                'subusers' => [],
            ];
        }

        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'error' => 'Access denied to server',
                'subusers' => [],
            ];
        }

        $subusers = Subuser::getSubusersWithDetailsByServerId((int) $server['id']);
        $formatted = array_map(static function (array $subuser): array {
            $permissions = json_decode((string) ($subuser['permissions'] ?? '[]'), true);
            if (!is_array($permissions)) {
                $permissions = [];
            }

            return [
                'id' => (int) $subuser['id'],
                'user_id' => (int) $subuser['user_id'],
                'username' => $subuser['username'] ?? null,
                'email' => $subuser['email'] ?? null,
                'permissions' => $permissions,
                'permission_count' => count($permissions),
                'created_at' => $subuser['created_at'] ?? null,
            ];
        }, $subusers);

        return [
            'server_name' => $server['name'],
            'server_uuid' => $server['uuid'],
            'subusers' => $formatted,
            'count' => count($formatted),
        ];
    }

    public function getDescription(): string
    {
        return 'Get all subusers for a server including usernames, emails, and permission sets.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
        ];
    }
}
