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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'FeatherCloudCredentialPair',
    type: 'object',
    properties: [
        new OA\Property(property: 'public_key', type: 'string'),
        new OA\Property(property: 'private_key', type: 'string'),
        new OA\Property(
            property: 'last_rotated_at',
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Timestamp when the keypair was last rotated or updated'
        ),
    ]
)]
#[OA\Schema(
    schema: 'FeatherCloudCredentials',
    type: 'object',
    properties: [
        new OA\Property(property: 'panel_credentials', ref: '#/components/schemas/FeatherCloudCredentialPair'),
        new OA\Property(property: 'cloud_credentials', ref: '#/components/schemas/FeatherCloudCredentialPair'),
    ]
)]
class CloudManagementController
{
    private App $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    #[OA\Get(
        path: '/api/admin/cloud/credentials',
        summary: 'Retrieve FeatherCloud access credentials',
        description: 'Fetch both the panel-issued and FeatherCloud-issued keypairs for integrations.',
        tags: ['Admin - FeatherCloud'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Credentials fetched successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/FeatherCloudCredentials')
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function show(Request $request): Response
    {
        $config = $this->app->getConfig();

        $panelPublic = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '');
        $panelPrivate = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '');
        $panelRotated = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, null);

        $cloudPublic = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, '');
        $cloudPrivate = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, '');
        $cloudRotated = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_LAST_ROTATED, null);

        return ApiResponse::success([
            'panel_credentials' => [
                'public_key' => $panelPublic,
                'private_key' => $panelPrivate,
                'last_rotated_at' => $panelRotated,
            ],
            'cloud_credentials' => [
                'public_key' => $cloudPublic,
                'private_key' => $cloudPrivate,
                'last_rotated_at' => $cloudRotated,
            ],
        ], 'Cloud credentials fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/cloud/credentials/panel',
        summary: 'Store panel-issued credentials',
        description: 'Save or update the panel-side keypair that FeatherCloud uses when authenticating against the panel.',
        tags: ['Admin - FeatherCloud'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['public_key', 'private_key'],
                properties: [
                    new OA\Property(property: 'public_key', type: 'string'),
                    new OA\Property(property: 'private_key', type: 'string'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Panel credentials saved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/FeatherCloudCredentials')
            ),
            new OA\Response(response: 400, description: 'Invalid payload'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Failed to store panel credentials'),
        ]
    )]
    public function storePanel(Request $request): Response
    {
        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        $publicKey = trim((string) ($payload['public_key'] ?? ''));
        $privateKey = trim((string) ($payload['private_key'] ?? ''));

        if ($publicKey === '' || $privateKey === '') {
            return ApiResponse::error('Panel public and private keys are required.', 'MISSING_PANEL_KEYS', 400);
        }

        try {
            $timestamp = gmdate('c');
            $config = $this->app->getConfig();
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, $publicKey);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, $privateKey);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, $timestamp);

            $user = $request->get('user');
            $userUuid = $user['uuid'] ?? null;

            Activity::createActivity([
                'user_uuid' => $userUuid,
                'name' => 'set_cloud_panel_credentials',
                'context' => 'Panel-issued FeatherCloud credentials were updated',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return $this->show($request);
        } catch (\Throwable $exception) {
            $this->app->getLogger()->error('Failed to store panel FeatherCloud credentials: ' . $exception->getMessage());

            return ApiResponse::error('Failed to store panel credentials', 'CLOUD_PANEL_CREDENTIALS_FAILED', 500);
        }
    }

    #[OA\Put(
        path: '/api/admin/cloud/credentials/cloud',
        summary: 'Store FeatherCloud-issued credentials',
        description: 'Save the keypair that FeatherCloud presents back to the panel for authenticated callbacks.',
        tags: ['Admin - FeatherCloud'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['public_key', 'private_key'],
                properties: [
                    new OA\Property(property: 'public_key', type: 'string'),
                    new OA\Property(property: 'private_key', type: 'string'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'FeatherCloud credentials saved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/FeatherCloudCredentials')
            ),
            new OA\Response(response: 400, description: 'Invalid payload'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Failed to store FeatherCloud credentials'),
        ]
    )]
    public function storeCloud(Request $request): Response
    {
        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        $publicKey = trim((string) ($payload['public_key'] ?? ''));
        $privateKey = trim((string) ($payload['private_key'] ?? ''));

        if ($publicKey === '' || $privateKey === '') {
            return ApiResponse::error('FeatherCloud public and private keys are required.', 'MISSING_CLOUD_KEYS', 400);
        }

        try {
            $timestamp = gmdate('c');
            $config = $this->app->getConfig();
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, $publicKey);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, $privateKey);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_LAST_ROTATED, $timestamp);

            $user = $request->get('user');
            $userUuid = $user['uuid'] ?? null;

            Activity::createActivity([
                'user_uuid' => $userUuid,
                'name' => 'set_feathercloud_credentials',
                'context' => 'FeatherCloud-issued credentials were updated',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return $this->show($request);
        } catch (\Throwable $exception) {
            $this->app->getLogger()->error('Failed to store FeatherCloud-issued credentials: ' . $exception->getMessage());

            return ApiResponse::error('Failed to store FeatherCloud credentials', 'CLOUD_FEATHERCLOUD_CREDENTIALS_FAILED', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/cloud/credentials/rotate',
        summary: 'Rotate FeatherCloud access credentials',
        description: 'Generate a new panel-issued public/private keypair used by FeatherCloud integrations.',
        tags: ['Admin - FeatherCloud'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Credentials rotated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/FeatherCloudCredentials')
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Failed to rotate credentials'),
        ]
    )]
    public function rotate(Request $request): Response
    {
        $config = $this->app->getConfig();

        try {
            $publicKey = 'FCPUB-' . strtoupper(bin2hex(random_bytes(18)));
            $privateKey = 'FCPRIV-' . base64_encode(random_bytes(48));
            $timestamp = gmdate('c');

            // Rotate FeatherCloud → Panel keys
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, $publicKey);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, $privateKey);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_LAST_ROTATED, $timestamp);

            // Clear Panel → FeatherCloud keys (they need to be regenerated)
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, null);

            $user = $request->get('user');
            $userUuid = $user['uuid'] ?? null;

            Activity::createActivity([
                'user_uuid' => $userUuid,
                'name' => 'rotate_cloud_credentials',
                'context' => 'FeatherCloud → Panel credentials were rotated, Panel → FeatherCloud keys cleared',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return $this->show($request);
        } catch (\Throwable $exception) {
            $this->app->getLogger()->error('Failed to rotate FeatherCloud credentials: ' . $exception->getMessage());

            return ApiResponse::error('Failed to rotate FeatherCloud credentials', 'CLOUD_CREDENTIALS_ROTATION_FAILED', 500);
        }
    }
}
