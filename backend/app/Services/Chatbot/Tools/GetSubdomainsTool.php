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
