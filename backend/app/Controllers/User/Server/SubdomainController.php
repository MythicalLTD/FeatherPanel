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

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Node;
use App\Chat\Subdomain;
use App\Chat\Allocation;
use App\SubuserPermissions;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Chat\SubdomainDomain;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use App\Plugins\Events\Events\SubdomainsEvent;
use Symfony\Component\HttpFoundation\Response;
use App\Services\Subdomain\CloudflareSubdomainService;

#[OA\Schema(
    schema: 'ServerSubdomainAvailableDomain',
    type: 'object',
    properties: [
        new OA\Property(property: 'uuid', type: 'string'),
        new OA\Property(property: 'domain', type: 'string'),
        new OA\Property(property: 'protocol_service', type: 'string', nullable: true),
        new OA\Property(property: 'protocol_type', type: 'string'),
        new OA\Property(property: 'priority', type: 'integer'),
        new OA\Property(property: 'weight', type: 'integer'),
        new OA\Property(property: 'ttl', type: 'integer'),
    ]
)]
#[OA\Schema(
    schema: 'ServerSubdomainEntry',
    type: 'object',
    properties: [
        new OA\Property(property: 'uuid', type: 'string'),
        new OA\Property(property: 'domain', type: 'string'),
        new OA\Property(property: 'subdomain', type: 'string'),
        new OA\Property(property: 'record_type', type: 'string'),
        new OA\Property(property: 'port', type: 'integer', nullable: true),
        new OA\Property(property: 'created_at', type: 'string'),
    ]
)]
#[OA\Schema(
    schema: 'ServerSubdomainOverview',
    type: 'object',
    properties: [
        new OA\Property(property: 'max_allowed', type: 'integer'),
        new OA\Property(property: 'current_total', type: 'integer'),
        new OA\Property(property: 'domains', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerSubdomainAvailableDomain')),
        new OA\Property(property: 'subdomains', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerSubdomainEntry')),
    ]
)]
class SubdomainController
{
    use CheckSubuserPermissionsTrait;

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/subdomains',
        summary: 'List subdomains and available domains',
        description: 'Returns the subdomains created for a server and the domains available for its spell.',
        tags: ['User - Server Subdomains'],
        parameters: [
            new OA\Parameter(name: 'uuidShort', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Subdomains retrieved successfully'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Server not found'),
        ]
    )]
    public function index(Request $request, array $server): Response
    {
        $permission = $this->checkPermission($request, $server, SubuserPermissions::SUBDOMAIN_MANAGE);
        if ($permission !== null) {
            return $permission;
        }

        $config = App::getInstance(true)->getConfig();
        $maxAllowed = (int) $config->getSetting(ConfigInterface::SUBDOMAIN_MAX_PER_SERVER, '1');
        if ($maxAllowed < 1) {
            $maxAllowed = 1;
        }

        $domains = array_map(function (array $domain) use ($server): array {
            $mapping = $this->getSpellMappingForDomain($domain['id'], (int) $server['spell_id']);

            return [
                'uuid' => $domain['uuid'],
                'domain' => $domain['domain'],
                'protocol_service' => $mapping['protocol_service'] ?? null,
                'protocol_type' => $mapping['protocol_type'] ?? 'tcp',
                'priority' => $mapping['priority'] ?? 1,
                'weight' => $mapping['weight'] ?? 1,
                'ttl' => $mapping['ttl'] ?? 120,
            ];
        }, SubdomainDomain::getActiveDomainsForSpell((int) $server['spell_id']));

        $subdomains = array_map(function (array $entry): array {
            $domain = SubdomainDomain::getDomainById((int) $entry['domain_id']);

            return [
                'uuid' => $entry['uuid'],
                'domain' => $domain['domain'] ?? '',
                'subdomain' => $entry['subdomain'],
                'record_type' => $entry['record_type'],
                'port' => $entry['port'],
                'created_at' => $entry['created_at'] ?? null,
            ];
        }, Subdomain::getByServerId((int) $server['id']));

        return ApiResponse::success([
            'overview' => [
                'max_allowed' => $maxAllowed,
                'current_total' => count($subdomains),
                'domains' => $domains,
                'subdomains' => $subdomains,
            ],
        ]);
    }

    #[OA\Put(
        path: '/api/user/servers/{uuidShort}/subdomains',
        summary: 'Create a subdomain',
        tags: ['User - Server Subdomains'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['domain_uuid', 'subdomain'],
                properties: [
                    new OA\Property(property: 'domain_uuid', type: 'string'),
                    new OA\Property(property: 'subdomain', type: 'string'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Subdomain created successfully'),
            new OA\Response(response: 400, description: 'Validation failed'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Domain not found'),
        ]
    )]
    public function create(Request $request, array $server): Response
    {
        $permission = $this->checkPermission($request, $server, SubuserPermissions::SUBDOMAIN_MANAGE);
        if ($permission !== null) {
            return $permission;
        }

        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', Response::HTTP_BAD_REQUEST);
        }

        $domainUuid = isset($payload['domain_uuid']) ? trim((string) $payload['domain_uuid']) : '';
        $label = isset($payload['subdomain']) ? strtolower(trim((string) $payload['subdomain'])) : '';

        if ($domainUuid === '' || $label === '') {
            return ApiResponse::error('Domain UUID and subdomain are required', 'VALIDATION_FAILED', Response::HTTP_BAD_REQUEST);
        }

        if (!preg_match('/^[a-z0-9-]{2,63}$/', $label)) {
            return ApiResponse::error('Subdomain may only contain letters, numbers, and hyphen (2-63 characters)', 'INVALID_SUBDOMAIN', Response::HTTP_BAD_REQUEST);
        }

        $domain = SubdomainDomain::getDomainByUuid($domainUuid);
        if (!$domain || (int) $domain['is_active'] !== 1) {
            return ApiResponse::error('Domain not found or inactive', 'DOMAIN_NOT_AVAILABLE', Response::HTTP_NOT_FOUND);
        }

        $mapping = $this->getSpellMappingForDomain((int) $domain['id'], (int) $server['spell_id']);
        if ($mapping === null) {
            return ApiResponse::error('Domain is not available for this server spell', 'DOMAIN_NOT_ALLOWED', Response::HTTP_BAD_REQUEST);
        }

        $config = App::getInstance(true)->getConfig();
        $maxAllowed = (int) $config->getSetting(ConfigInterface::SUBDOMAIN_MAX_PER_SERVER, '1');
        if ($maxAllowed < 1) {
            $maxAllowed = 1;
        }

        if (Subdomain::countByServer((int) $server['id']) >= $maxAllowed) {
            return ApiResponse::error('You have reached the maximum number of subdomains for this server', 'SUBDOMAIN_LIMIT_REACHED', Response::HTTP_BAD_REQUEST);
        }

        if (Subdomain::getByDomainAndLabel((int) $domain['id'], $label) !== null) {
            return ApiResponse::error('This subdomain is already in use for the selected domain', 'SUBDOMAIN_EXISTS', Response::HTTP_CONFLICT);
        }

        $allocation = Allocation::getAllocationById((int) $server['allocation_id']);
        if (!$allocation) {
            return ApiResponse::error('Server primary allocation not found', 'PRIMARY_ALLOCATION_NOT_FOUND', Response::HTTP_BAD_REQUEST);
        }

        $accountId = trim((string) ($domain['cloudflare_account_id'] ?? ''));
        if ($accountId === '') {
            return ApiResponse::error('Domain is missing a Cloudflare account ID', 'CLOUDFLARE_ACCOUNT_ID_MISSING', Response::HTTP_BAD_REQUEST);
        }

        $service = CloudflareSubdomainService::fromConfig($accountId);
        if (!$service->isAvailable()) {
            return ApiResponse::error('Cloudflare integration is not configured', 'CLOUDFLARE_NOT_CONFIGURED', Response::HTTP_BAD_REQUEST);
        }

        $zoneId = $domain['cloudflare_zone_id'] ?? null;
        if (!$zoneId) {
            $zoneId = $service->resolveZoneId($domain['domain']);
            if (!$zoneId) {
                return ApiResponse::error('Failed to resolve Cloudflare zone for domain', 'CLOUDFLARE_ZONE_ERROR', Response::HTTP_BAD_REQUEST);
            }
            SubdomainDomain::updateCloudflareZoneId((int) $domain['id'], $zoneId);
        }

        $protocolService = $mapping['protocol_service'] ?? null;
        $recordType = $protocolService ? 'SRV' : 'CNAME';

        // If ip_alias is not set, use the node public ipv4; else use ip_alias or fallback to allocation ip
        if (!empty($allocation['ip_alias'])) {
            // Just use those assuming it exists in cloudflare already!
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

        if (!$service->ensureRecordDoesNotExist($zoneId, $recordType, $srvRecordName)) {
            return ApiResponse::error('A DNS record already exists for this subdomain', 'RECORD_EXISTS', Response::HTTP_CONFLICT);
        }

        $recordId = null;

        if ($recordType === 'CNAME') {
            $recordId = $service->createCnameRecord($zoneId, $fqdn, $target, $ttl);
        } else {
            $protocolType = $mapping['protocol_type'] ?? 'tcp';
            if ($port <= 0) {
                return ApiResponse::error('Server primary allocation is missing port information required for SRV records', 'ALLOCATION_PORT_MISSING', Response::HTTP_BAD_REQUEST);
            }

            $srvTarget = $target;
            $ipVersion = null;
            if (filter_var($target, FILTER_VALIDATE_IP) !== false) {
                $ipVersion = filter_var($target, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false ? 'AAAA' : 'A';
                if (!$service->ensureRecordDoesNotExist($zoneId, $ipVersion, $fqdn)) {
                    return ApiResponse::error('An address record already exists for this subdomain', 'ADDRESS_RECORD_EXISTS', Response::HTTP_CONFLICT);
                }
                $addressRecordId = $service->createAddressRecord($zoneId, $fqdn, $target, $ipVersion, $ttl);
                if (!$addressRecordId) {
                    return ApiResponse::error('Failed to create address record for SRV target', 'CLOUDFLARE_ADDRESS_CREATE_FAILED', Response::HTTP_BAD_REQUEST);
                }
                $srvTarget = $fqdn;
            }

            $recordId = $service->createSrvRecord(
                $zoneId,
                $protocolService,
                $protocolType,
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
            return ApiResponse::error('Failed to create DNS record on Cloudflare', 'CLOUDFLARE_CREATE_FAILED', Response::HTTP_BAD_REQUEST);
        }

        $subdomainId = Subdomain::create([
            'server_id' => (int) $server['id'],
            'domain_id' => (int) $domain['id'],
            'spell_id' => (int) $server['spell_id'],
            'subdomain' => $label,
            'record_type' => $recordType,
            'port' => $recordType === 'SRV' ? $port : null,
            'cloudflare_record_id' => $recordId,
        ]);

        if ($subdomainId === false) {
            return ApiResponse::error('Failed to persist subdomain entry', 'SUBDOMAIN_CREATE_FAILED', Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $this->logServerActivity($request, $server, 'server:subdomain.create', [
            'domain' => $domain['domain'],
            'subdomain' => $label,
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $created = Subdomain::getByDomainAndLabel((int) $domain['id'], $label);
            if ($created) {
                $eventManager->emit(
                    SubdomainsEvent::onSubdomainCreated(),
                    [
                        'subdomain_uuid' => $created['uuid'],
                        'subdomain_data' => $created,
                        'server_data' => $server,
                        'user' => $request->attributes->get('user'),
                    ]
                );
            }
        }

        $created = Subdomain::getByDomainAndLabel((int) $domain['id'], $label);
        $formatted = null;
        if ($created) {
            $formatted = [
                'uuid' => $created['uuid'],
                'domain' => $domain['domain'],
                'subdomain' => $created['subdomain'],
                'record_type' => $created['record_type'],
                'port' => $created['port'],
                'created_at' => $created['created_at'] ?? null,
            ];
        }

        return ApiResponse::success([
            'subdomain' => $formatted,
        ], 'Subdomain created successfully', Response::HTTP_CREATED);
    }

    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/subdomains/{uuid}',
        summary: 'Delete a subdomain',
        tags: ['User - Server Subdomains'],
        parameters: [
            new OA\Parameter(name: 'uuidShort', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Subdomain deleted successfully'),
            new OA\Response(response: 404, description: 'Subdomain not found'),
        ]
    )]
    public function delete(Request $request, array $server, string $uuid): Response
    {
        $permission = $this->checkPermission($request, $server, SubuserPermissions::SUBDOMAIN_MANAGE);
        if ($permission !== null) {
            return $permission;
        }

        $subdomain = Subdomain::getByUuidAndServer($uuid, (int) $server['id']);
        if (!$subdomain) {
            return ApiResponse::error('Subdomain not found', 'SUBDOMAIN_NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        $domain = SubdomainDomain::getDomainById((int) $subdomain['domain_id']);
        if (!$domain) {
            return ApiResponse::error('Domain not found', 'DOMAIN_NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        $accountId = trim((string) ($domain['cloudflare_account_id'] ?? ''));
        if ($accountId === '') {
            return ApiResponse::error('Domain is missing a Cloudflare account ID', 'CLOUDFLARE_ACCOUNT_ID_MISSING', Response::HTTP_BAD_REQUEST);
        }

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

        Subdomain::deleteByUuid($uuid);

        $this->logServerActivity($request, $server, 'server:subdomain.delete', [
            'domain' => $domain['domain'],
            'subdomain' => $subdomain['subdomain'],
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SubdomainsEvent::onSubdomainDeleted(),
                [
                    'subdomain_uuid' => $uuid,
                    'subdomain_data' => $subdomain,
                    'server_data' => $server,
                    'user' => $request->attributes->get('user'),
                ]
            );
        }

        return ApiResponse::success([], 'Subdomain deleted successfully');
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

    private function logServerActivity(Request $request, array $server, string $event, array $metadata = []): void
    {
        $user = $request->attributes->get('user');
        $userId = $user['id'] ?? null;

        ServerActivity::createActivity([
            'server_id' => (int) $server['id'],
            'node_id' => (int) $server['node_id'],
            'user_id' => $userId,
            'ip' => CloudFlareRealIP::getRealIP(),
            'event' => $event,
            'metadata' => $metadata,
        ]);
    }
}
