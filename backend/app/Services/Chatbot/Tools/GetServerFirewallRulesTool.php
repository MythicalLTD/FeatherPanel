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
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;
use App\Config\ConfigInterface;
use App\Helpers\WingsUrlHelper;

/**
 * Tool to get firewall rules for a server.
 */
class GetServerFirewallRulesTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

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
                'rules' => [],
            ];
        }

        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'error' => 'Access denied to server',
                'rules' => [],
            ];
        }

        $enabled = $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL, 'false');
        if ($enabled !== 'true') {
            return [
                'error' => 'Firewall management is disabled',
                'rules' => [],
            ];
        }

        $node = Node::getNodeById((int) $server['node_id']);
        if (!$node) {
            return [
                'error' => 'Node not found',
                'rules' => [],
            ];
        }

        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                10,
                WingsUrlHelper::isBehindProxy($node)
            );

            $response = $wings->getServer()->getFirewallRules($server['uuid']);
            if (!$response->isSuccessful()) {
                return [
                    'error' => 'Failed to fetch firewall rules: ' . ($response->getError() ?: 'Unknown error'),
                    'rules' => [],
                ];
            }

            $data = $response->getData();
            $rules = is_array($data['data'] ?? null) ? $data['data'] : [];

            return [
                'server_name' => $server['name'],
                'server_uuid' => $server['uuid'],
                'rules' => $rules,
                'count' => count($rules),
            ];
        } catch (\Exception $e) {
            return [
                'error' => 'Failed to fetch firewall rules: ' . $e->getMessage(),
                'rules' => [],
            ];
        }
    }

    public function getDescription(): string
    {
        return 'Get all firewall rules for a server, including allow/block rules, ports, protocols, and priorities.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
        ];
    }
}
