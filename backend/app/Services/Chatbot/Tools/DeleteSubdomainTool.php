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
use App\Chat\Subdomain;
use App\Chat\Allocation;
use App\Chat\ServerActivity;
use App\Chat\SubdomainDomain;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\SubdomainsEvent;
use App\Services\Subdomain\CloudflareSubdomainService;

/**
 * Tool to delete a subdomain for a server.
 */
class DeleteSubdomainTool implements ToolInterface
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
                'action_type' => 'delete_subdomain',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'delete_subdomain',
            ];
        }

        // Get subdomain identifier (UUID or subdomain name)
        $subdomainUuid = $params['subdomain_uuid'] ?? null;
        $subdomainName = $params['subdomain_name'] ?? null;
        $subdomain = null;

        if ($subdomainUuid) {
            $subdomain = Subdomain::getByUuidAndServer($subdomainUuid, $server['id']);
        } elseif ($subdomainName) {
            // Get all subdomains for this server and find by name
            $subdomains = Subdomain::getByServerId($server['id']);
            foreach ($subdomains as $sd) {
                if ($sd['subdomain'] === $subdomainName) {
                    $subdomain = $sd;
                    break;
                }
            }
        }

        if (!$subdomain) {
            return [
                'success' => false,
                'error' => 'Subdomain not found. Please specify a subdomain UUID or name.',
                'action_type' => 'delete_subdomain',
            ];
        }

        // Get domain
        $domain = SubdomainDomain::getDomainById((int) $subdomain['domain_id']);
        if (!$domain) {
            return [
                'success' => false,
                'error' => 'Domain not found',
                'action_type' => 'delete_subdomain',
            ];
        }

        // Delete from Cloudflare
        $accountId = trim((string) ($domain['cloudflare_account_id'] ?? ''));
        if ($accountId !== '') {
            $service = CloudflareSubdomainService::fromConfig($accountId);
            $zoneId = $domain['cloudflare_zone_id'] ?? null;
            if ($service->isAvailable() && $zoneId) {
                $recordId = $subdomain['cloudflare_record_id'] ?? null;
                if ($recordId) {
                    $service->deleteRecord($zoneId, $recordId);
                } else {
                    $mapping = $this->getSpellMappingForDomain((int) $domain['id'], (int) $server['spell_id']);
                    $recordName = $subdomain['record_type'] === 'SRV'
                        ? (($mapping['protocol_service'] ?? '') . '._' . ($mapping['protocol_type'] ?? 'tcp') . '.' . $subdomain['subdomain'] . '.' . $domain['domain'])
                        : $subdomain['subdomain'] . '.' . $domain['domain'];
                    $service->deleteRecordByName($zoneId, $subdomain['record_type'], $recordName);
                }

                // Clean up address records for SRV
                if ($subdomain['record_type'] === 'SRV') {
                    $allocation = Allocation::getAllocationById((int) $server['allocation_id']);
                    $ipAlias = $allocation['ip_alias'] ?? '';
                    $requiresAddressCleanup = $ipAlias === '' || filter_var($ipAlias, FILTER_VALIDATE_IP) !== false;

                    if ($requiresAddressCleanup) {
                        $hostName = $subdomain['subdomain'] . '.' . $domain['domain'];
                        $service->deleteRecordByName($zoneId, 'A', $hostName);
                        $service->deleteRecordByName($zoneId, 'AAAA', $hostName);
                    }
                }
            }
        }

        // Delete subdomain record
        if (!Subdomain::deleteByUuid($subdomain['uuid'])) {
            return [
                'success' => false,
                'error' => 'Failed to delete subdomain record',
                'action_type' => 'delete_subdomain',
            ];
        }

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if ($node) {
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'server:subdomain.delete',
                'metadata' => json_encode([
                    'domain' => $domain['domain'],
                    'subdomain' => $subdomain['subdomain'],
                ]),
            ]);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SubdomainsEvent::onSubdomainDeleted(),
                [
                    'user_uuid' => $user['uuid'],
                    'subdomain_uuid' => $subdomain['uuid'],
                    'subdomain_data' => $subdomain,
                    'server_data' => $server,
                ]
            );
        }

        return [
            'success' => true,
            'action_type' => 'delete_subdomain',
            'subdomain_uuid' => $subdomain['uuid'],
            'subdomain' => $subdomain['subdomain'],
            'domain' => $domain['domain'],
            'fqdn' => $subdomain['subdomain'] . '.' . $domain['domain'],
            'server_name' => $server['name'],
            'message' => "Subdomain '{$subdomain['subdomain']}.{$domain['domain']}' deleted successfully from server '{$server['name']}'",
        ];
    }

    public function getDescription(): string
    {
        return 'Delete a subdomain for a server. Requires subdomain UUID or name. Deletes DNS records from Cloudflare.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'subdomain_uuid' => 'Subdomain UUID (required if subdomain_name not provided)',
            'subdomain_name' => 'Subdomain name (required if subdomain_uuid not provided)',
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
