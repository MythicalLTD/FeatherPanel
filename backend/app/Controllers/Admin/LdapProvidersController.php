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
use App\Chat\LdapProvider;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\LdapAuthenticator;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\LdapProvidersEvent;

#[OA\Schema(
    schema: 'LdapProvider',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'uuid', type: 'string'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'host', type: 'string'),
        new OA\Property(property: 'port', type: 'integer'),
        new OA\Property(property: 'use_tls', type: 'string', enum: ['true', 'false']),
        new OA\Property(property: 'use_ssl', type: 'string', enum: ['true', 'false']),
        new OA\Property(property: 'bind_dn', type: 'string'),
        new OA\Property(property: 'base_dn', type: 'string'),
        new OA\Property(property: 'user_filter', type: 'string'),
        new OA\Property(property: 'username_attribute', type: 'string'),
        new OA\Property(property: 'email_attribute', type: 'string'),
        new OA\Property(property: 'auto_provision', type: 'string', enum: ['true', 'false']),
        new OA\Property(property: 'enabled', type: 'string', enum: ['true', 'false']),
    ]
)]
class LdapProvidersController
{
    #[OA\Get(
        path: '/api/admin/ldap/providers',
        summary: 'List all LDAP providers',
        tags: ['Admin - LDAP'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'List of LDAP providers',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'providers', type: 'array', items: new OA\Items(ref: '#/components/schemas/LdapProvider')),
                    ]
                )
            ),
        ]
    )]
    public function index(Request $request): Response
    {
        $providers = LdapProvider::getAllProviders();

        return ApiResponse::success(
            ['providers' => array_map(fn ($p) => self::stripBindPassword($p), $providers)],
            'Providers fetched successfully',
            200
        );
    }

    #[OA\Put(
        path: '/api/admin/ldap/providers',
        summary: 'Create a new LDAP provider',
        tags: ['Admin - LDAP'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/LdapProvider')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Provider created successfully'),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function create(Request $request): Response
    {
        $admin = $request->get('user');
        $data = json_decode($request->getContent(), true);

        $required = ['name', 'host', 'base_dn'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                return ApiResponse::error("Missing required field: $field", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        $app = App::getInstance(true);

        // Encrypt bind password if provided
        $bindPasswordEncrypted = null;
        if (!empty($data['bind_password'])) {
            $bindPasswordEncrypted = $app->encryptValue($data['bind_password']);
        }

        $uuid = LdapProvider::generateUuid();

        $insert = [
            'uuid' => $uuid,
            'name' => trim($data['name']),
            'host' => trim($data['host']),
            'port' => (int) ($data['port'] ?? 389),
            'use_tls' => ($data['use_tls'] ?? 'false') === 'true' ? 'true' : 'false',
            'use_ssl' => ($data['use_ssl'] ?? 'false') === 'true' ? 'true' : 'false',
            'bind_dn' => !empty($data['bind_dn']) ? trim($data['bind_dn']) : null,
            'bind_password' => $bindPasswordEncrypted,
            'base_dn' => trim($data['base_dn']),
            'user_filter' => trim($data['user_filter'] ?? '(uid={username})'),
            'username_attribute' => trim($data['username_attribute'] ?? 'uid'),
            'email_attribute' => trim($data['email_attribute'] ?? 'mail'),
            'first_name_attribute' => !empty($data['first_name_attribute']) ? trim($data['first_name_attribute']) : 'givenName',
            'last_name_attribute' => !empty($data['last_name_attribute']) ? trim($data['last_name_attribute']) : 'sn',
            'group_filter' => !empty($data['group_filter']) ? trim($data['group_filter']) : null,
            'group_attribute' => !empty($data['group_attribute']) ? trim($data['group_attribute']) : 'memberOf',
            'required_group' => !empty($data['required_group']) ? trim($data['required_group']) : null,
            'auto_provision' => ($data['auto_provision'] ?? 'false') === 'true' ? 'true' : 'false',
            'sync_attributes' => ($data['sync_attributes'] ?? 'false') === 'true' ? 'true' : 'false',
            'generate_email_if_missing' => ($data['generate_email_if_missing'] ?? 'false') === 'true' ? 'true' : 'false',
            'enabled' => ($data['enabled'] ?? 'true') === 'true' ? 'true' : 'false',
        ];

        $id = LdapProvider::createProvider($insert);
        if (!$id) {
            return ApiResponse::error('Failed to create provider', 'CREATE_FAILED', 500);
        }

        $provider = LdapProvider::getProviderByUuid($uuid);

        self::emitEvent(LdapProvidersEvent::onLdapProviderCreated(), [
            'user_uuid' => $admin['uuid'] ?? null,
            'provider' => self::stripBindPassword($provider ?? []),
        ]);

        return ApiResponse::success(
            ['provider' => self::stripBindPassword($provider ?? [])],
            'Provider created successfully',
            200
        );
    }

    #[OA\Post(
        path: '/api/admin/ldap/providers/{uuid}',
        summary: 'Update an LDAP provider',
        tags: ['Admin - LDAP'],
        parameters: [
            new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/LdapProvider')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Provider updated successfully'),
            new OA\Response(response: 404, description: 'Provider not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function update(Request $request, string $uuid): Response
    {
        $admin = $request->get('user');
        $existing = LdapProvider::getProviderByUuid($uuid);
        if (!$existing) {
            return ApiResponse::error('Provider not found', 'NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        $update = [];
        $changed = [];

        $stringFields = ['name', 'host', 'bind_dn', 'base_dn', 'user_filter', 'username_attribute', 'email_attribute', 'first_name_attribute', 'last_name_attribute', 'group_filter', 'group_attribute', 'required_group'];
        foreach ($stringFields as $field) {
            if (isset($data[$field])) {
                $newValue = $data[$field] === null || trim($data[$field]) === '' ? null : trim($data[$field]);
                if ($newValue !== ($existing[$field] ?? null)) {
                    $update[$field] = $newValue;
                    $changed[] = $field;
                }
            }
        }

        if (isset($data['port'])) {
            $newPort = (int) $data['port'];
            if ($newPort !== (int) $existing['port']) {
                $update['port'] = $newPort;
                $changed[] = 'port';
            }
        }

        $boolFields = ['use_tls', 'use_ssl', 'auto_provision', 'sync_attributes', 'generate_email_if_missing', 'enabled'];
        foreach ($boolFields as $field) {
            if (isset($data[$field])) {
                $newValue = ($data[$field] === 'true' || $data[$field] === true) ? 'true' : 'false';
                if ($newValue !== ($existing[$field] ?? 'false')) {
                    $update[$field] = $newValue;
                    $changed[] = $field;
                }
            }
        }

        // Handle bind password separately
        if (isset($data['bind_password']) && trim($data['bind_password']) !== '') {
            $app = App::getInstance(true);
            $update['bind_password'] = $app->encryptValue($data['bind_password']);
            $changed[] = 'bind_password';
        }

        if (empty($update)) {
            return ApiResponse::success(
                ['provider' => self::stripBindPassword($existing)],
                'No changes detected',
                200
            );
        }

        if (!LdapProvider::updateProvider($uuid, $update)) {
            return ApiResponse::error('Failed to update provider', 'UPDATE_FAILED', 500);
        }

        $provider = LdapProvider::getProviderByUuid($uuid);

        self::emitEvent(LdapProvidersEvent::onLdapProviderUpdated(), [
            'user_uuid' => $admin['uuid'] ?? null,
            'provider' => self::stripBindPassword($provider ?? []),
            'changed_fields' => $changed,
        ]);

        return ApiResponse::success(
            ['provider' => self::stripBindPassword($provider ?? [])],
            'Provider updated successfully',
            200
        );
    }

    #[OA\Delete(
        path: '/api/admin/ldap/providers/{uuid}',
        summary: 'Delete an LDAP provider',
        tags: ['Admin - LDAP'],
        parameters: [
            new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Provider deleted successfully'),
            new OA\Response(response: 404, description: 'Provider not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function delete(Request $request, string $uuid): Response
    {
        $admin = $request->get('user');
        $existing = LdapProvider::getProviderByUuid($uuid);
        if (!$existing) {
            return ApiResponse::error('Provider not found', 'NOT_FOUND', 404);
        }

        if (!LdapProvider::deleteProvider($uuid)) {
            return ApiResponse::error('Failed to delete provider', 'DELETE_FAILED', 500);
        }

        self::emitEvent(LdapProvidersEvent::onLdapProviderDeleted(), [
            'user_uuid' => $admin['uuid'] ?? null,
            'provider' => self::stripBindPassword($existing),
        ]);

        return ApiResponse::success([], 'Provider deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/ldap/providers/{uuid}/test',
        summary: 'Test LDAP provider connection',
        tags: ['Admin - LDAP'],
        parameters: [
            new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Connection test result'),
            new OA\Response(response: 404, description: 'Provider not found'),
        ]
    )]
    public function testConnection(Request $request, string $uuid): Response
    {
        $provider = LdapProvider::getProviderByUuid($uuid);
        if (!$provider) {
            return ApiResponse::error('Provider not found', 'NOT_FOUND', 404);
        }

        $ldap = new LdapAuthenticator($provider);
        $success = $ldap->testConnection();

        if ($success) {
            return ApiResponse::success(
                ['success' => true],
                'Connection successful',
                200
            );
        }

        return ApiResponse::error(
            'Connection failed: ' . ($ldap->getLastError() ?? 'Unknown error'),
            'CONNECTION_FAILED',
            400,
            ['success' => false, 'error' => $ldap->getLastError()]
        );
    }

    /**
     * Strip sensitive bind password from provider data.
     */
    private static function stripBindPassword(array $provider): array
    {
        unset($provider['bind_password']);

        return $provider;
    }

    /**
     * Emit plugin event.
     */
    private static function emitEvent(string $event, array $data): void
    {
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit($event, $data);
        }
    }
}
