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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Spell;
use App\Chat\Activity;
use App\Chat\Subdomain;
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
    schema: 'SubdomainManagerSpellMapping',
    type: 'object',
    properties: [
        new OA\Property(property: 'spell_id', type: 'integer'),
        new OA\Property(property: 'protocol_service', type: 'string', nullable: true),
        new OA\Property(property: 'protocol_type', type: 'string'),
        new OA\Property(property: 'priority', type: 'integer'),
        new OA\Property(property: 'weight', type: 'integer'),
        new OA\Property(property: 'ttl', type: 'integer'),
        new OA\Property(
            property: 'spell',
            type: 'object',
            nullable: true,
            properties: [
                new OA\Property(property: 'id', type: 'integer'),
                new OA\Property(property: 'uuid', type: 'string'),
                new OA\Property(property: 'name', type: 'string'),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'SubdomainManagerDomain',
    type: 'object',
    properties: [
        new OA\Property(property: 'uuid', type: 'string'),
        new OA\Property(property: 'domain', type: 'string'),
        new OA\Property(property: 'description', type: 'string', nullable: true),
        new OA\Property(property: 'is_active', type: 'integer'),
        new OA\Property(property: 'cloudflare_zone_id', type: 'string', nullable: true),
        new OA\Property(property: 'cloudflare_account_id', type: 'string', nullable: true),
        new OA\Property(property: 'subdomain_count', type: 'integer'),
        new OA\Property(property: 'spells', type: 'array', items: new OA\Items(ref: '#/components/schemas/SubdomainManagerSpellMapping')),
        new OA\Property(property: 'created_at', type: 'string'),
        new OA\Property(property: 'updated_at', type: 'string'),
    ]
)]
#[OA\Schema(
    schema: 'SubdomainManagerSubdomain',
    type: 'object',
    properties: [
        new OA\Property(property: 'uuid', type: 'string'),
        new OA\Property(property: 'subdomain', type: 'string'),
        new OA\Property(property: 'record_type', type: 'string'),
        new OA\Property(property: 'port', type: 'integer', nullable: true),
        new OA\Property(property: 'server_id', type: 'integer'),
        new OA\Property(property: 'spell_id', type: 'integer'),
        new OA\Property(property: 'cloudflare_record_id', type: 'string', nullable: true),
        new OA\Property(property: 'created_at', type: 'string'),
    ]
)]
class SubdomainsController
{
    #[OA\Get(
        path: '/api/admin/subdomains',
        summary: 'List subdomain manager domains',
        description: 'Retrieve paginated list of subdomain manager domains with spell mappings.',
        tags: ['Admin - Subdomains'],
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)),
            new OA\Parameter(name: 'limit', in: 'query', schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 25)),
            new OA\Parameter(name: 'search', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'includeInactive', in: 'query', schema: new OA\Schema(type: 'boolean', default: true)),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Domains retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'domains', type: 'array', items: new OA\Items(ref: '#/components/schemas/SubdomainManagerDomain')),
                        new OA\Property(property: 'pagination', type: 'object', properties: [
                            new OA\Property(property: 'current_page', type: 'integer'),
                            new OA\Property(property: 'per_page', type: 'integer'),
                            new OA\Property(property: 'total_records', type: 'integer'),
                            new OA\Property(property: 'total_pages', type: 'integer'),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function index(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = (int) $request->query->get('limit', 25);
        $limit = max(1, min(100, $limit));
        $search = (string) $request->query->get('search', '');
        $includeInactive = filter_var($request->query->get('includeInactive', 'true'), FILTER_VALIDATE_BOOLEAN);

        $domains = SubdomainDomain::getDomains($page, $limit, $search, $includeInactive);
        $total = SubdomainDomain::getDomainsCount($search, $includeInactive);

        $domains = array_map(static function (array $domain): array {
            $domain['spells'] = array_map(static function (array $mapping): array {
                $spell = Spell::getSpellById((int) $mapping['spell_id']);
                $mapping['spell'] = $spell ? [
                    'id' => $spell['id'],
                    'uuid' => $spell['uuid'],
                    'name' => $spell['name'],
                ] : null;

                return $mapping;
            }, SubdomainDomain::getSpellMappings((int) $domain['id']));

            $domain['subdomain_count'] = Subdomain::count(['domain_id' => $domain['id']]);

            return $domain;
        }, $domains);

        $totalPages = (int) ceil($total / $limit);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SubdomainsEvent::onSubdomainDomainsRetrieved(),
                [
                    'domains' => $domains,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => $total,
                    ],
                    'filters' => [
                        'search' => $search,
                        'includeInactive' => $includeInactive,
                    ],
                ]
            );
        }

        return ApiResponse::success([
            'domains' => $domains,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
            ],
        ], 'Domains fetched successfully');
    }

    #[OA\Get(
        path: '/api/admin/subdomains/{uuid}',
        summary: 'Get subdomain manager domain',
        description: 'Retrieve information about a subdomain manager domain including subdomains.',
        tags: ['Admin - Subdomains'],
        parameters: [
            new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Domain retrieved successfully'),
            new OA\Response(response: 404, description: 'Domain not found'),
        ]
    )]
    public function show(Request $request, string $uuid): Response
    {
        $domain = SubdomainDomain::getDomainWithSpellsByUuid($uuid);
        if (!$domain) {
            return ApiResponse::error('Domain not found', 'DOMAIN_NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        $domain['spells'] = array_map(static function (array $mapping): array {
            $spell = Spell::getSpellById((int) $mapping['spell_id']);
            $mapping['spell'] = $spell ? [
                'id' => $spell['id'],
                'uuid' => $spell['uuid'],
                'name' => $spell['name'],
            ] : null;

            return $mapping;
        }, $domain['spells']);

        $domain['subdomain_count'] = Subdomain::count(['domain_id' => $domain['id']]);
        $domain['subdomains'] = Subdomain::getByDomainId((int) $domain['id']);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SubdomainsEvent::onSubdomainDomainRetrieved(),
                [
                    'domain_uuid' => $uuid,
                    'domain_data' => $domain,
                ]
            );
        }

        return ApiResponse::success(['domain' => $domain], 'Domain retrieved successfully');
    }

    #[OA\Put(
        path: '/api/admin/subdomains',
        summary: 'Create subdomain manager domain',
        tags: ['Admin - Subdomains'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                type: 'object',
                required: ['domain'],
                properties: [
                    new OA\Property(property: 'domain', type: 'string'),
                    new OA\Property(property: 'description', type: 'string', nullable: true),
                    new OA\Property(property: 'is_active', type: 'boolean'),
                    new OA\Property(property: 'cloudflare_zone_id', type: 'string', nullable: true),
                    new OA\Property(property: 'cloudflare_account_id', type: 'string'),
                    new OA\Property(property: 'spells', type: 'array', items: new OA\Items(type: 'object', properties: [
                        new OA\Property(property: 'spell_id', type: 'integer'),
                        new OA\Property(property: 'protocol_service', type: 'string', nullable: true),
                        new OA\Property(property: 'protocol_type', type: 'string', enum: ['tcp', 'udp', 'tls']),
                        new OA\Property(property: 'priority', type: 'integer'),
                        new OA\Property(property: 'weight', type: 'integer'),
                        new OA\Property(property: 'ttl', type: 'integer'),
                    ])),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Domain created successfully'),
            new OA\Response(response: 400, description: 'Validation failed'),
        ]
    )]
    public function create(Request $request): Response
    {
        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', Response::HTTP_BAD_REQUEST);
        }

        $validation = $this->validateDomainPayload($payload);
        if ($validation !== true) {
            return ApiResponse::error($validation, 'VALIDATION_FAILED', Response::HTTP_BAD_REQUEST);
        }

        $domainId = SubdomainDomain::createDomain($payload, $payload['spells'] ?? []);
        if ($domainId === false) {
            return ApiResponse::error('Failed to create domain', 'DOMAIN_CREATE_FAILED', Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $domain = SubdomainDomain::getDomainById($domainId);
        if ($domain && empty($domain['cloudflare_zone_id'])) {
            $service = CloudflareSubdomainService::fromConfig($domain['cloudflare_account_id'] ?? null);
            if ($service->isAvailable()) {
                $zoneId = $service->resolveZoneId($domain['domain']);
                if ($zoneId) {
                    SubdomainDomain::updateCloudflareZoneId($domainId, $zoneId);
                    $domain['cloudflare_zone_id'] = $zoneId;
                }
            }
        }

        $this->logActivity($request, 'create_subdomain_domain', 'Created subdomain domain: ' . $payload['domain']);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $createdDomain = SubdomainDomain::getDomainWithSpellsByUuid($domain['uuid']);
            $eventManager->emit(
                SubdomainsEvent::onSubdomainDomainCreated(),
                [
                    'domain_data' => $createdDomain,
                    'created_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success([
            'domain' => SubdomainDomain::getDomainWithSpellsByUuid($domain['uuid']),
        ], 'Domain created successfully', Response::HTTP_CREATED);
    }

    #[OA\Patch(
        path: '/api/admin/subdomains/{uuid}',
        summary: 'Update subdomain manager domain',
        tags: ['Admin - Subdomains'],
        parameters: [
            new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(type: 'object')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Domain updated successfully'),
            new OA\Response(response: 404, description: 'Domain not found'),
        ]
    )]
    public function update(Request $request, string $uuid): Response
    {
        $domain = SubdomainDomain::getDomainWithSpellsByUuid($uuid);
        if (!$domain) {
            return ApiResponse::error('Domain not found', 'DOMAIN_NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', Response::HTTP_BAD_REQUEST);
        }

        $validation = $this->validateDomainPayload($payload, true);
        if ($validation !== true) {
            return ApiResponse::error($validation, 'VALIDATION_FAILED', Response::HTTP_BAD_REQUEST);
        }

        $spells = $payload['spells'] ?? null;
        if ($spells === null) {
            // keep existing spell definitions if not provided
            $spells = array_map(static fn (array $mapping) => [
                'spell_id' => $mapping['spell_id'],
                'protocol_service' => $mapping['protocol_service'],
                'protocol_type' => $mapping['protocol_type'],
                'priority' => $mapping['priority'],
                'weight' => $mapping['weight'],
                'ttl' => $mapping['ttl'],
            ], $domain['spells']);
        }

        $oldDomain = $domain;
        if (!SubdomainDomain::updateDomainByUuid($uuid, $payload, $spells)) {
            return ApiResponse::error('Failed to update domain', 'DOMAIN_UPDATE_FAILED', Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $this->logActivity($request, 'update_subdomain_domain', 'Updated subdomain domain: ' . ($payload['domain'] ?? $domain['domain']));

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $updatedDomain = SubdomainDomain::getDomainWithSpellsByUuid($uuid);
            $eventManager->emit(
                SubdomainsEvent::onSubdomainDomainUpdated(),
                [
                    'domain_uuid' => $uuid,
                    'old_data' => $oldDomain,
                    'new_data' => $updatedDomain,
                    'updated_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success([
            'domain' => SubdomainDomain::getDomainWithSpellsByUuid($uuid),
        ], 'Domain updated successfully');
    }

    #[OA\Delete(
        path: '/api/admin/subdomains/{uuid}',
        summary: 'Delete subdomain manager domain',
        tags: ['Admin - Subdomains'],
        parameters: [
            new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Domain deleted successfully'),
            new OA\Response(response: 400, description: 'Domain still has subdomains'),
            new OA\Response(response: 404, description: 'Domain not found'),
        ]
    )]
    public function delete(Request $request, string $uuid): Response
    {
        $domain = SubdomainDomain::getDomainWithSpellsByUuid($uuid);
        if (!$domain) {
            return ApiResponse::error('Domain not found', 'DOMAIN_NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        if (Subdomain::count(['domain_id' => $domain['id']]) > 0) {
            return ApiResponse::error('Domain still has active subdomains', 'DOMAIN_HAS_SUBDOMAINS', Response::HTTP_BAD_REQUEST);
        }

        if (!SubdomainDomain::deleteDomainByUuid($uuid)) {
            return ApiResponse::error('Failed to delete domain', 'DOMAIN_DELETE_FAILED', Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $this->logActivity($request, 'delete_subdomain_domain', 'Deleted subdomain domain: ' . $domain['domain']);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SubdomainsEvent::onSubdomainDomainDeleted(),
                [
                    'domain_uuid' => $uuid,
                    'domain_data' => $domain,
                    'deleted_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success([], 'Domain deleted successfully');
    }

    #[OA\Get(
        path: '/api/admin/subdomains/settings',
        summary: 'Get subdomain manager settings',
        tags: ['Admin - Subdomains'],
        responses: [
            new OA\Response(response: 200, description: 'Settings retrieved successfully'),
        ]
    )]
    public function settings(Request $request): Response
    {
        if ($request->getMethod() === 'PATCH') {
            return $this->updateSettings($request);
        }

        $config = App::getInstance(true)->getConfig();
        $storedApiKey = trim((string) $config->getSetting(ConfigInterface::SUBDOMAIN_CF_API_KEY, ''));

        return ApiResponse::success([
            'settings' => [
                'cloudflare_email' => $config->getSetting(ConfigInterface::SUBDOMAIN_CF_EMAIL, ''),
                'cloudflare_api_key_set' => $storedApiKey !== '',
                'max_subdomains_per_server' => (int) $config->getSetting(ConfigInterface::SUBDOMAIN_MAX_PER_SERVER, '1'),
            ],
        ], 'Settings fetched successfully');
    }

    #[OA\Get(
        path: '/api/admin/subdomains/spells',
        summary: 'List spells available for subdomain manager',
        tags: ['Admin - Subdomains'],
        responses: [
            new OA\Response(response: 200, description: 'Spells retrieved successfully'),
        ]
    )]
    public function spells(): Response
    {
        $spells = Spell::getAllSpells();

        return ApiResponse::success([
            'spells' => array_map(static fn (array $spell) => [
                'id' => $spell['id'],
                'uuid' => $spell['uuid'],
                'name' => $spell['name'],
                'realm_id' => $spell['realm_id'],
            ], $spells),
        ], 'Spells fetched successfully');
    }

    #[OA\Get(
        path: '/api/admin/subdomains/{uuid}/subdomains',
        summary: 'List subdomains attached to a domain',
        tags: ['Admin - Subdomains'],
        parameters: [
            new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Subdomains retrieved successfully'),
            new OA\Response(response: 404, description: 'Domain not found'),
        ]
    )]
    public function listSubdomains(string $uuid): Response
    {
        $domain = SubdomainDomain::getDomainWithSpellsByUuid($uuid);
        if (!$domain) {
            // Emit error event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    SubdomainsEvent::onSubdomainDomainNotFound(),
                    [
                        'domain_uuid' => $uuid,
                        'error_message' => 'Domain not found',
                    ]
                );
            }

            return ApiResponse::error('Domain not found', 'DOMAIN_NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        return ApiResponse::success([
            'subdomains' => Subdomain::getByDomainId((int) $domain['id']),
        ], 'Subdomains fetched successfully');
    }

    private function updateSettings(Request $request): Response
    {
        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', Response::HTTP_BAD_REQUEST);
        }

        $config = App::getInstance(true)->getConfig();

        $currentEmail = trim((string) $config->getSetting(ConfigInterface::SUBDOMAIN_CF_EMAIL, ''));
        $currentApiKey = trim((string) $config->getSetting(ConfigInterface::SUBDOMAIN_CF_API_KEY, ''));
        $currentMax = (int) $config->getSetting(ConfigInterface::SUBDOMAIN_MAX_PER_SERVER, '1');

        $emailProvided = array_key_exists('cloudflare_email', $payload);
        $apiKeyProvided = array_key_exists('cloudflare_api_key', $payload);
        $maxProvided = array_key_exists('max_subdomains_per_server', $payload);

        $email = $emailProvided ? trim((string) $payload['cloudflare_email']) : $currentEmail;
        $apiKey = $apiKeyProvided ? trim((string) $payload['cloudflare_api_key']) : $currentApiKey;
        $max = $maxProvided ? (int) $payload['max_subdomains_per_server'] : $currentMax;

        if ($maxProvided && $max < 1) {
            return ApiResponse::error('Max subdomains per server must be at least 1', 'VALIDATION_FAILED', Response::HTTP_BAD_REQUEST);
        }

        if ($email === '' || $apiKey === '') {
            return ApiResponse::error('Cloudflare email and global API key are required', 'VALIDATION_FAILED', Response::HTTP_BAD_REQUEST);
        }

        if ($emailProvided) {
            $config->setSetting(ConfigInterface::SUBDOMAIN_CF_EMAIL, $email);
        }

        if ($apiKeyProvided) {
            $config->setSetting(ConfigInterface::SUBDOMAIN_CF_API_KEY, $apiKey);
        }

        if ($maxProvided) {
            $config->setSetting(ConfigInterface::SUBDOMAIN_MAX_PER_SERVER, (string) $max);
        }

        $this->logActivity($request, 'update_subdomain_settings', 'Updated subdomain manager settings');

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SubdomainsEvent::onSubdomainSettingsUpdated(),
                [
                    'settings' => [
                        'cloudflare_email' => $email,
                        'cloudflare_api_key_set' => $apiKey !== '',
                        'max_subdomains_per_server' => $max,
                    ],
                    'updated_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success([], 'Settings updated successfully');
    }

    private function validateDomainPayload(array $payload, bool $isUpdate = false): bool | string
    {
        if (!$isUpdate || array_key_exists('domain', $payload)) {
            $domain = trim((string) ($payload['domain'] ?? ''));
            if ($domain === '' || filter_var($domain, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) === false) {
                return 'Domain must be a valid hostname';
            }
        }

        if (!$isUpdate || array_key_exists('cloudflare_account_id', $payload)) {
            $accountId = trim((string) ($payload['cloudflare_account_id'] ?? ''));
            if ($accountId === '') {
                return 'Cloudflare account ID is required';
            }
        }

        if (!$isUpdate && !isset($payload['spells'])) {
            return 'At least one spell mapping is required';
        }

        if (array_key_exists('spells', $payload)) {
            if (!is_array($payload['spells'])) {
                return 'Spells must be an array';
            }

            if (!$isUpdate && empty($payload['spells'])) {
                return 'At least one spell mapping is required';
            }

            foreach ($payload['spells'] as $mapping) {
                if (!is_array($mapping) || !isset($mapping['spell_id'])) {
                    return 'Each spell mapping must include spell_id';
                }

                $spellId = (int) $mapping['spell_id'];
                if ($spellId <= 0 || !Spell::getSpellById($spellId)) {
                    return 'Invalid spell_id: ' . $spellId;
                }

                if (isset($mapping['protocol_service']) && $mapping['protocol_service'] !== null) {
                    $service = trim((string) $mapping['protocol_service']);
                    if ($service !== '' && !preg_match('/^[_a-z0-9-]+$/i', $service)) {
                        return 'Protocol service may only contain letters, numbers, hyphen and underscore';
                    }
                }

                if (isset($mapping['protocol_type'])) {
                    $type = strtolower((string) $mapping['protocol_type']);
                    if (!in_array($type, ['tcp', 'udp', 'tls'], true)) {
                        return 'Protocol type must be tcp, udp or tls';
                    }
                }
            }
        }

        return true;
    }

    private function logActivity(Request $request, string $name, string $context): void
    {
        $user = $request->get('user');
        if (!$user || !isset($user['uuid'])) {
            return;
        }

        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => $name,
            'context' => $context,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
    }
}
