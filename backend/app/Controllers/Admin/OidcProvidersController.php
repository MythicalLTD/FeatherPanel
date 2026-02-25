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
use App\Chat\OidcProvider;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'OidcProvider',
    type: 'object',
    properties: [
        new OA\Property(property: 'uuid', type: 'string', format: 'uuid', description: 'Provider UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'Display name'),
        new OA\Property(property: 'issuer_url', type: 'string', description: 'OIDC issuer URL'),
        new OA\Property(property: 'client_id', type: 'string', description: 'OIDC client ID'),
        new OA\Property(property: 'scopes', type: 'string', description: 'Space-separated scopes'),
        new OA\Property(property: 'email_claim', type: 'string', description: 'Email claim name'),
        new OA\Property(property: 'subject_claim', type: 'string', description: 'Subject claim name'),
        new OA\Property(property: 'group_claim', type: 'string', nullable: true, description: 'Group/role claim name'),
        new OA\Property(property: 'group_value', type: 'string', nullable: true, description: 'Required group/role value'),
        new OA\Property(property: 'auto_provision', type: 'string', enum: ['true', 'false'], description: 'Auto provision users'),
        new OA\Property(property: 'require_email_verified', type: 'string', enum: ['true', 'false'], description: 'Require email_verified'),
        new OA\Property(property: 'enabled', type: 'string', enum: ['true', 'false'], description: 'Whether this provider is enabled'),
    ]
)]
class OidcProvidersController
{
    #[OA\Get(
        path: '/api/admin/oidc/providers',
        summary: 'List OIDC providers',
        tags: ['Admin - OIDC'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Providers retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'providers', type: 'array', items: new OA\Items(ref: '#/components/schemas/OidcProvider')),
                    ]
                )
            ),
        ]
    )]
    public function index(Request $request): Response
    {
        $providers = OidcProvider::getAllProviders();

        return ApiResponse::success(
            ['providers' => self::stripClientSecretFromList($providers)],
            'Providers fetched successfully',
            200
        );
    }

    #[OA\Put(
        path: '/api/admin/oidc/providers',
        summary: 'Create OIDC provider',
        tags: ['Admin - OIDC'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/OidcProvider')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Provider created successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $required = ['name', 'issuer_url', 'client_id', 'client_secret'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || !is_string($data[$field]) || trim($data[$field]) === '') {
                return ApiResponse::error("Missing required field: {$field}", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        $issuerUrl = self::validateIssuerUrl($data['issuer_url']);
        if ($issuerUrl === null) {
            return ApiResponse::error('Issuer URL must be a valid HTTPS URL and must not use a private or reserved host', 'INVALID_ISSUER_URL', 400);
        }

        $app = App::getInstance(true);
        $clientSecretPlain = trim($data['client_secret']);
        $clientSecretEncrypted = $app->encryptValue($clientSecretPlain);

        $uuid = OidcProvider::generateUuid();

        $insert = [
            'uuid' => $uuid,
            'name' => trim($data['name']),
            'issuer_url' => $issuerUrl,
            'client_id' => trim($data['client_id']),
            'client_secret' => $clientSecretEncrypted,
            'scopes' => isset($data['scopes']) && is_string($data['scopes']) ? trim($data['scopes']) : 'openid email profile',
            'email_claim' => isset($data['email_claim']) && is_string($data['email_claim']) ? trim($data['email_claim']) : 'email',
            'subject_claim' => isset($data['subject_claim']) && is_string($data['subject_claim']) ? trim($data['subject_claim']) : 'sub',
            'group_claim' => isset($data['group_claim']) && is_string($data['group_claim']) ? trim($data['group_claim']) : null,
            'group_value' => isset($data['group_value']) && is_string($data['group_value']) ? trim($data['group_value']) : null,
            'auto_provision' => isset($data['auto_provision']) && $data['auto_provision'] === 'true' ? 'true' : 'false',
            'require_email_verified' => isset($data['require_email_verified']) && $data['require_email_verified'] === 'true' ? 'true' : 'false',
            'enabled' => isset($data['enabled']) && $data['enabled'] === 'true' ? 'true' : 'false',
        ];

        $id = OidcProvider::createProvider($insert);
        if (!$id) {
            return ApiResponse::error('Failed to create provider', 'CREATE_FAILED', 500);
        }

        $provider = OidcProvider::getProviderByUuid($uuid);

        return ApiResponse::success(
            ['provider' => self::stripClientSecret($provider ?? [])],
            'Provider created successfully',
            200
        );
    }

    #[OA\Patch(
        path: '/api/admin/oidc/providers/{uuid}',
        summary: 'Update OIDC provider',
        tags: ['Admin - OIDC'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/OidcProvider')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Provider updated successfully'),
            new OA\Response(response: 404, description: 'Provider not found'),
        ]
    )]
    public function update(Request $request, string $uuid): Response
    {
        $existing = OidcProvider::getProviderByUuid($uuid);
        if (!$existing) {
            return ApiResponse::error('Provider not found', 'NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $update = [];

        $fields = [
            'name',
            'issuer_url',
            'client_id',
            'client_secret',
            'scopes',
            'email_claim',
            'subject_claim',
            'group_claim',
            'group_value',
            'auto_provision',
            'require_email_verified',
            'enabled',
        ];

        $app = App::getInstance(true);
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $value = $data[$field];
                if (is_string($value)) {
                    $value = trim($value);
                }
                if (in_array($field, ['auto_provision', 'require_email_verified', 'enabled'], true)) {
                    $value = $value === 'true' ? 'true' : 'false';
                }
                if ($field === 'issuer_url' && is_string($value)) {
                    $validated = self::validateIssuerUrl($value);
                    if ($validated === null) {
                        return ApiResponse::error('Issuer URL must be a valid HTTPS URL and must not use a private or reserved host', 'INVALID_ISSUER_URL', 400);
                    }
                    $value = $validated;
                }
                if ($field === 'client_secret') {
                    if (!is_string($value) || trim($value) === '') {
                        return ApiResponse::error('client_secret cannot be empty when provided', 'INVALID_CLIENT_SECRET', 400);
                    }
                    $update[$field] = $app->encryptValue($value);
                    continue;
                }
                $update[$field] = $value;
            }
        }

        if (empty($update)) {
            return ApiResponse::success(['provider' => self::stripClientSecret($existing)], 'No changes applied', 200);
        }

        if (!OidcProvider::updateProvider($uuid, $update)) {
            return ApiResponse::error('Failed to update provider', 'UPDATE_FAILED', 500);
        }

        $provider = OidcProvider::getProviderByUuid($uuid);

        return ApiResponse::success(
            ['provider' => self::stripClientSecret($provider ?? [])],
            'Provider updated successfully',
            200
        );
    }

    #[OA\Delete(
        path: '/api/admin/oidc/providers/{uuid}',
        summary: 'Delete OIDC provider',
        tags: ['Admin - OIDC'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Provider deleted successfully'),
            new OA\Response(response: 404, description: 'Provider not found'),
        ]
    )]
    public function delete(Request $request, string $uuid): Response
    {
        $existing = OidcProvider::getProviderByUuid($uuid);
        if (!$existing) {
            return ApiResponse::error('Provider not found', 'NOT_FOUND', 404);
        }

        if (!OidcProvider::deleteProvider($uuid)) {
            return ApiResponse::error('Failed to delete provider', 'DELETE_FAILED', 500);
        }

        return ApiResponse::success([], 'Provider deleted successfully', 200);
    }

    private static function stripClientSecret(array $provider): array
    {
        $out = $provider;
        unset($out['client_secret']);

        return $out;
    }

    /**
     * @param array<int, array<string, mixed>> $providers
     *
     * @return array<int, array<string, mixed>>
     */
    private static function stripClientSecretFromList(array $providers): array
    {
        return array_map(self::stripClientSecret(...), $providers);
    }

    /**
     * Validate and normalize issuer URL: must be HTTPS and host must not be private/reserved.
     *
     * @return string|null Normalized URL (with trailing slash trimmed) or null if invalid
     */
    private static function validateIssuerUrl(string $raw): ?string
    {
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return null;
        }
        $parsed = parse_url($trimmed);
        if ($parsed === false || !isset($parsed['scheme'], $parsed['host'])) {
            return null;
        }
        if (strtolower($parsed['scheme']) !== 'https') {
            return null;
        }
        $host = $parsed['host'];
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                $parts = array_map('intval', explode('.', $host));
                if (count($parts) === 4) {
                    if ($parts[0] === 127) {
                        return null;
                    }
                    if ($parts[0] === 10) {
                        return null;
                    }
                    if ($parts[0] === 192 && $parts[1] === 168) {
                        return null;
                    }
                    if ($parts[0] === 169 && $parts[1] === 254) {
                        return null;
                    }
                    if ($parts[0] === 172 && $parts[1] >= 16 && $parts[1] <= 31) {
                        return null;
                    }
                }
            } else {
                $norm = inet_pton($host);
                if ($norm !== false) {
                    $hex = bin2hex($norm);
                    if (strlen($hex) === 32) {
                        if ($hex === '00000000000000000000000000000001' || str_starts_with($hex, 'fe80') || str_starts_with($hex, 'fc') || str_starts_with($hex, 'fd')) {
                            return null;
                        }
                    }
                    if (str_starts_with($hex, '00000000000000000000ffff7f')) {
                        return null;
                    }
                }
            }
        }

        return rtrim($trimmed, '/');
    }
}
