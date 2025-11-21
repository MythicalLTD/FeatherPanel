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
use App\Chat\Subdomain;
use App\Chat\Allocation;
use App\Chat\ServerActivity;
use App\Chat\SubdomainDomain;
use App\Helpers\ServerGateway;
use App\Config\ConfigInterface;
use App\Plugins\Events\Events\SubdomainsEvent;
use App\Services\Subdomain\CloudflareSubdomainService;

/**
 * Tool to create a subdomain for a server.
 */
class CreateSubdomainTool implements ToolInterface
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
                'action_type' => 'create_subdomain',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'create_subdomain',
            ];
        }

        // Validate required fields
        if (!isset($params['domain_uuid']) || trim($params['domain_uuid']) === '') {
            return [
                'success' => false,
                'error' => 'Domain UUID is required',
                'action_type' => 'create_subdomain',
            ];
        }

        if (!isset($params['subdomain']) || trim($params['subdomain']) === '') {
            return [
                'success' => false,
                'error' => 'Subdomain name is required',
                'action_type' => 'create_subdomain',
            ];
        }

        $domainUuid = trim($params['domain_uuid']);
        $label = strtolower(trim($params['subdomain']));

        // Validate subdomain format
        if (!preg_match('/^[a-z0-9-]{2,63}$/', $label)) {
            return [
                'success' => false,
                'error' => 'Subdomain may only contain letters, numbers, and hyphen (2-63 characters)',
                'action_type' => 'create_subdomain',
            ];
        }

        // Get domain
        $domain = SubdomainDomain::getDomainByUuid($domainUuid);
        if (!$domain || (int) $domain['is_active'] !== 1) {
            return [
                'success' => false,
                'error' => 'Domain not found or inactive',
                'action_type' => 'create_subdomain',
            ];
        }

        // Check domain is available for this server's spell
        $mapping = $this->getSpellMappingForDomain((int) $domain['id'], (int) $server['spell_id']);
        if ($mapping === null) {
            return [
                'success' => false,
                'error' => 'Domain is not available for this server spell',
                'action_type' => 'create_subdomain',
            ];
        }

        // Check subdomain limit
        $config = $this->app->getConfig();
        $maxAllowed = (int) $config->getSetting(ConfigInterface::SUBDOMAIN_MAX_PER_SERVER, '1');
        if ($maxAllowed < 1) {
            $maxAllowed = 1;
        }

        if (Subdomain::countByServer($server['id']) >= $maxAllowed) {
            return [
                'success' => false,
                'error' => "You have reached the maximum number of subdomains ({$maxAllowed}) for this server",
                'action_type' => 'create_subdomain',
            ];
        }

        // Check if subdomain already exists
        if (Subdomain::getByDomainAndLabel((int) $domain['id'], $label) !== null) {
            return [
                'success' => false,
                'error' => 'This subdomain is already in use for the selected domain',
                'action_type' => 'create_subdomain',
            ];
        }

        // Get allocation
        $allocation = Allocation::getAllocationById((int) $server['allocation_id']);
        if (!$allocation) {
            return [
                'success' => false,
                'error' => 'Server primary allocation not found',
                'action_type' => 'create_subdomain',
            ];
        }

        // Get Cloudflare service
        $accountId = trim((string) ($domain['cloudflare_account_id'] ?? ''));
        if ($accountId === '') {
            return [
                'success' => false,
                'error' => 'Domain is missing a Cloudflare account ID',
                'action_type' => 'create_subdomain',
            ];
        }

        $service = CloudflareSubdomainService::fromConfig($accountId);
        if (!$service->isAvailable()) {
            return [
                'success' => false,
                'error' => 'Cloudflare integration is not configured',
                'action_type' => 'create_subdomain',
            ];
        }

        // Get zone ID
        $zoneId = $domain['cloudflare_zone_id'] ?? null;
        if (!$zoneId) {
            $zoneId = $service->resolveZoneId($domain['domain']);
            if (!$zoneId) {
                return [
                    'success' => false,
                    'error' => 'Failed to resolve Cloudflare zone for domain',
                    'action_type' => 'create_subdomain',
                ];
            }
            SubdomainDomain::updateCloudflareZoneId((int) $domain['id'], $zoneId);
        }

        // Determine record type
        $protocolService = $mapping['protocol_service'] ?? null;
        $recordType = $protocolService ? 'SRV' : 'CNAME';

        // Get target IP
        if (!empty($allocation['ip_alias'])) {
            $target = $allocation['ip_alias'];
        } elseif (!empty($allocation['node_id'])) {
            $node = Node::getNodeById((int) $allocation['node_id']);
            if (!empty($node['public_ip_v4'])) {
                $target = $node['public_ip_v4'];
            } else {
                $target = $allocation['ip'];
            }
        } else {
            $target = $allocation['ip'];
        }

        $port = (int) ($allocation['port'] ?? 0);
        $ttl = (int) ($mapping['ttl'] ?? 120);
        $fqdn = $label . '.' . $domain['domain'];

        $srvRecordName = $recordType === 'SRV' ? ($protocolService . '._' . ($mapping['protocol_type'] ?? 'tcp') . '.' . $fqdn) : $fqdn;

        // Check if record already exists
        if (!$service->ensureRecordDoesNotExist($zoneId, $recordType, $srvRecordName)) {
            return [
                'success' => false,
                'error' => 'A DNS record already exists for this subdomain',
                'action_type' => 'create_subdomain',
            ];
        }

        // Create DNS record
        $recordId = null;
        if ($recordType === 'CNAME') {
            $recordId = $service->createCnameRecord($zoneId, $fqdn, $target, $ttl);
        } else {
            if ($port <= 0) {
                return [
                    'success' => false,
                    'error' => 'Server primary allocation is missing port information required for SRV records',
                    'action_type' => 'create_subdomain',
                ];
            }

            $srvTarget = $target;
            $ipVersion = null;
            if (filter_var($target, FILTER_VALIDATE_IP) !== false) {
                $ipVersion = filter_var($target, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false ? 'AAAA' : 'A';
                if (!$service->ensureRecordDoesNotExist($zoneId, $ipVersion, $fqdn)) {
                    return [
                        'success' => false,
                        'error' => 'An address record already exists for this subdomain',
                        'action_type' => 'create_subdomain',
                    ];
                }
                $addressRecordId = $service->createAddressRecord($zoneId, $fqdn, $target, $ipVersion, $ttl);
                if (!$addressRecordId) {
                    return [
                        'success' => false,
                        'error' => 'Failed to create address record for SRV target',
                        'action_type' => 'create_subdomain',
                    ];
                }
                $srvTarget = $fqdn;
            }

            $recordId = $service->createSrvRecord(
                $zoneId,
                $protocolService,
                $mapping['protocol_type'] ?? 'tcp',
                $label,
                $domain['domain'],
                $srvTarget,
                $port,
                (int) ($mapping['priority'] ?? 1),
                (int) ($mapping['weight'] ?? 1),
                $ttl
            );
        }

        if (!$recordId) {
            return [
                'success' => false,
                'error' => 'Failed to create DNS record on Cloudflare',
                'action_type' => 'create_subdomain',
            ];
        }

        // Create subdomain record
        $subdomainId = Subdomain::create([
            'server_id' => $server['id'],
            'domain_id' => (int) $domain['id'],
            'spell_id' => (int) $server['spell_id'],
            'subdomain' => $label,
            'record_type' => $recordType,
            'port' => $recordType === 'SRV' ? $port : null,
            'cloudflare_record_id' => $recordId,
        ]);

        if ($subdomainId === false) {
            return [
                'success' => false,
                'error' => 'Failed to persist subdomain entry',
                'action_type' => 'create_subdomain',
            ];
        }

        // Get created subdomain
        $created = Subdomain::getByDomainAndLabel((int) $domain['id'], $label);

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if ($node) {
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'server:subdomain.create',
                'metadata' => json_encode([
                    'domain' => $domain['domain'],
                    'subdomain' => $label,
                ]),
            ]);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SubdomainsEvent::onSubdomainCreated(),
                [
                    'user_uuid' => $user['uuid'],
                    'subdomain_uuid' => $created['uuid'],
                    'subdomain_data' => $created,
                    'server_data' => $server,
                ]
            );
        }

        return [
            'success' => true,
            'action_type' => 'create_subdomain',
            'subdomain_uuid' => $created['uuid'],
            'subdomain' => $label,
            'domain' => $domain['domain'],
            'fqdn' => $fqdn,
            'record_type' => $recordType,
            'port' => $created['port'],
            'server_name' => $server['name'],
            'message' => "Subdomain '{$fqdn}' created successfully for server '{$server['name']}'",
        ];
    }

    public function getDescription(): string
    {
        return 'Create a subdomain for a server. Requires domain UUID and subdomain name. Creates DNS records via Cloudflare.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'domain_uuid' => 'Domain UUID (required)',
            'subdomain' => 'Subdomain name (required, 2-63 characters, letters, numbers, and hyphens only)',
        ];
    }

    private function getSpellMappingForDomain(int $domainId, int $spellId): ?array
    {
        foreach (SubdomainDomain::getSpellMappings($domainId) as $mapping) {
            if ((int) $mapping['spell_id'] === $spellId) {
                return $mapping;
            }
        }

        return null;
    }
}
