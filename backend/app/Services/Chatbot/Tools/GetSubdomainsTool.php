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
use App\Chat\Server;
use App\Chat\Subdomain;
use App\Chat\SubdomainDomain;
use App\Helpers\ServerGateway;
use App\Config\ConfigInterface;

/**
 * Tool to get subdomains for a server.
 */
class GetSubdomainsTool implements ToolInterface
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
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
            ];
        }

        // Get subdomains
        $subdomains = Subdomain::getByServerId($server['id']);

        // Get available domains
        $config = $this->app->getConfig();
        $maxAllowed = (int) $config->getSetting(ConfigInterface::SUBDOMAIN_MAX_PER_SERVER, '1');
        if ($maxAllowed < 1) {
            $maxAllowed = 1;
        }

        $domains = SubdomainDomain::getActiveDomainsForSpell((int) $server['spell_id']);

        // Format subdomains with domain names
        $formattedSubdomains = [];
        foreach ($subdomains as $subdomain) {
            $domain = SubdomainDomain::getDomainById((int) $subdomain['domain_id']);
            $formattedSubdomains[] = [
                'uuid' => $subdomain['uuid'],
                'subdomain' => $subdomain['subdomain'],
                'domain' => $domain['domain'] ?? '',
                'fqdn' => $subdomain['subdomain'] . '.' . ($domain['domain'] ?? ''),
                'record_type' => $subdomain['record_type'],
                'port' => $subdomain['port'],
                'created_at' => $subdomain['created_at'] ?? null,
            ];
        }

        return [
            'success' => true,
            'server_name' => $server['name'],
            'max_allowed' => $maxAllowed,
            'current_total' => count($formattedSubdomains),
            'subdomains' => $formattedSubdomains,
            'available_domains' => array_map(function ($domain) {
                return [
                    'uuid' => $domain['uuid'],
                    'domain' => $domain['domain'],
                ];
            }, $domains),
        ];
    }

    public function getDescription(): string
    {
        return 'Get all subdomains for a server. Returns subdomain list, available domains, and limits.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
        ];
    }
}
