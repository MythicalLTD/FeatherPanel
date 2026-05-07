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

use App\Chat\Proxy;
use App\Chat\Server;
use App\Helpers\ServerGateway;

/**
 * Tool to get proxy configurations for a server.
 */
class GetServerProxiesTool implements ToolInterface
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
                'proxies' => [],
            ];
        }

        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'error' => 'Access denied to server',
                'proxies' => [],
            ];
        }

        $proxies = Proxy::getByServerId((int) $server['id']);
        $formatted = array_map(static function (array $proxy): array {
            return [
                'id' => (int) ($proxy['id'] ?? 0),
                'domain' => $proxy['domain'] ?? null,
                'ip' => $proxy['ip'] ?? null,
                'port' => isset($proxy['port']) ? (int) $proxy['port'] : null,
                'ssl' => !empty($proxy['ssl']),
                'use_lets_encrypt' => !empty($proxy['use_lets_encrypt']),
                'client_email' => $proxy['client_email'] ?? null,
                'created_at' => $proxy['created_at'] ?? null,
                'updated_at' => $proxy['updated_at'] ?? null,
            ];
        }, $proxies);

        return [
            'server_name' => $server['name'],
            'server_uuid' => $server['uuid'],
            'proxies' => $formatted,
            'count' => count($formatted),
        ];
    }

    public function getDescription(): string
    {
        return 'Get all reverse proxy configurations for a server, including domain, target IP/port, and SSL settings.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
        ];
    }
}
