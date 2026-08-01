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
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\FeatherCloud\FeatherCloudClient;
use App\Plugins\Events\Events\CloudManagementEvent;
use App\Services\FeatherCloud\MythicMemberResolver;
use App\Services\FeatherCloud\FeatherCloudException;

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

        $credentials = [
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
        ];

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                CloudManagementEvent::onCloudCredentialsRetrieved(),
                [
                    'credentials' => $credentials,
                ]
            );
        }

        return ApiResponse::success($credentials, 'Cloud credentials fetched successfully', 200);
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

            $user = $request->attributes->get('user');
            $this->logCloudActivity($request, 'set_cloud_panel_credentials', 'Panel-issued FeatherCloud credentials were updated');

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    CloudManagementEvent::onPanelCredentialsStored(),
                    [
                        'credentials' => [
                            'public_key' => $publicKey,
                            'private_key' => '[REDACTED]',
                            'last_rotated_at' => $timestamp,
                        ],
                        'stored_by' => $user,
                    ]
                );
            }

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

            $user = $request->attributes->get('user');
            $this->logCloudActivity($request, 'set_feathercloud_credentials', 'FeatherCloud-issued credentials were updated');

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    CloudManagementEvent::onCloudCredentialsStored(),
                    [
                        'credentials' => [
                            'public_key' => $publicKey,
                            'private_key' => '[REDACTED]',
                            'last_rotated_at' => $timestamp,
                        ],
                        'stored_by' => $user,
                    ]
                );
            }

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

            // Panel identity keys used during OAuth (`public_identity_key` / `private_key`).
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, $publicKey);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, $privateKey);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, $timestamp);

            // FeatherCloud-issued API keys must come from OAuth; never substitute random values here
            // Mythic-issued callback keys must come from OAuth; never invent them here.
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_LAST_ROTATED, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_LAST_SYNCED_AT, null);

            $user = $request->attributes->get('user');
            MythicMemberResolver::clearLinkState();
            $this->logCloudActivity(
                $request,
                'rotate_cloud_credentials',
                'Panel FeatherCloud identity keys rotated; FeatherCloud-issued credentials cleared - OAuth link required again'
            );

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    CloudManagementEvent::onCloudCredentialsRotated(),
                    [
                        'credential_type' => 'panel',
                        'rotated_by' => $user,
                    ]
                );
            }

            return $this->show($request);
        } catch (\Throwable $exception) {
            $this->app->getLogger()->error('Failed to rotate FeatherCloud credentials: ' . $exception->getMessage());

            return ApiResponse::error('Failed to rotate FeatherCloud credentials', 'CLOUD_CREDENTIALS_ROTATION_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/cloud/oauth2/link',
        summary: 'Get FeatherCloud OAuth2 link URL',
        description: 'Generate the OAuth2 link URL for connecting this panel to FeatherCloud. This URL includes all necessary panel information and credentials.',
        tags: ['Admin - FeatherCloud'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'OAuth2 link URL generated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'oauth2_url', type: 'string', description: 'The OAuth2 URL to redirect to'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Failed to generate OAuth2 URL'),
        ]
    )]
    public function getOAuth2Link(Request $request): Response
    {
        try {
            $config = $this->app->getConfig();
            $config->setSetting(ConfigInterface::FEATHERCLOUD_RELINK_PENDING_AT, gmdate('c'));

            // Get panel information
            $panelName = $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
            // app_url may exist in DB as an empty string, which bypasses the default argument to getSetting()
            $panelUrl = trim((string) ($config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems') ?? ''));
            if ($panelUrl === '') {
                $panelUrl = rtrim($request->getSchemeAndHttpHost() . $request->getBasePath(), '/');
            }
            if ($panelUrl === '') {
                $panelUrl = 'https://featherpanel.mythical.systems';
            }
            $logoUrl = $config->getSetting(ConfigInterface::APP_LOGO_WHITE, 'https://github.com/featherpanel-com.png');

            // Reuse the existing identity pair for linked panels. Only create a new pair
            // for a truly brand-new connection with no stored identity keys at all.
            $panelPublic = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '') ?? ''));
            $panelPrivate = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '') ?? ''));

            if ($panelPublic === '' && $panelPrivate === '') {
                $panelPublic = 'FCPUB-' . strtoupper(bin2hex(random_bytes(18)));
                $panelPrivate = 'FCPRIV-' . base64_encode(random_bytes(48));
                $timestamp = gmdate('c');

                $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, $panelPublic);
                $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, $panelPrivate);
                $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, $timestamp);

                $this->logCloudActivity(
                    $request,
                    'generate_cloud_panel_credentials',
                    'Panel-issued FeatherCloud credentials were auto-generated for OAuth2 linking'
                );
            } elseif ($panelPublic === '' || $panelPrivate === '') {
                return ApiResponse::error(
                    'Panel identity keys are incomplete. Re-link or manually repair the existing connection instead of generating a replacement pair.',
                    'INCOMPLETE_PANEL_CREDENTIALS',
                    409
                );
            }

            // OAuth lives on my.mythicalsystems.org Panel API is panels.mythicalsystems.org
            $callbackUrl = rtrim($panelUrl, '/') . '/admin/cloud-management/finish';
            $oauth2BaseUrl = FeatherCloudClient::resolveOAuthUrl();
            $params = [
                'panel_url' => $panelUrl,
                'panel_name' => $panelName,
                'panel_logo' => $logoUrl,
                'logo_url' => $logoUrl, // legacy alias
                'public_identity_key' => $panelPublic,
                'public_key' => $panelPublic, // legacy alias
                'private_key' => $panelPrivate,
                'callback_url' => $callbackUrl,
                'redirect_url' => $callbackUrl, // legacy alias
            ];

            $oauth2Url = $oauth2BaseUrl . (str_contains($oauth2BaseUrl, '?') ? '&' : '?') . http_build_query($params);

            return ApiResponse::success([
                'oauth2_url' => $oauth2Url,
                'api_base_url' => FeatherCloudClient::resolveBaseUrl(),
                'oauth_base_url' => $oauth2BaseUrl,
            ], 'OAuth2 link URL generated successfully', 200);
        } catch (\Throwable $exception) {
            $this->app->getLogger()->error('Failed to generate FeatherCloud OAuth2 link URL: ' . $exception->getMessage());

            return ApiResponse::error('Failed to generate OAuth2 link URL', 'OAUTH2_LINK_GENERATION_FAILED', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/cloud/oauth2/callback',
        summary: 'Save FeatherCloud OAuth2 callback credentials',
        description: 'Save the cloud_api_key and cloud_api_secret received from FeatherCloud OAuth2 callback. These credentials are used by the panel to access FeatherCloud services.',
        tags: ['Admin - FeatherCloud'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['cloud_api_key', 'cloud_api_secret'],
                properties: [
                    new OA\Property(property: 'cloud_api_key', type: 'string', description: 'The cloud API key generated by FeatherCloud'),
                    new OA\Property(property: 'cloud_api_secret', type: 'string', description: 'The cloud API secret generated by FeatherCloud'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Cloud credentials saved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(property: 'timestamp', type: 'string', format: 'date-time'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Invalid payload or missing credentials'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Failed to save cloud credentials'),
        ]
    )]
    public function saveOAuth2Callback(Request $request): Response
    {
        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        $status = strtolower(trim((string) ($payload['status'] ?? 'success')));
        if (in_array($status, ['error', 'cancelled', 'cancel'], true)) {
            return ApiResponse::error(
                'OAuth was not completed (' . $status . '). Existing link left unchanged.',
                'OAUTH2_CALLBACK_NOT_SUCCESS',
                400
            );
        }

        // Mythic finish contract:
        // public_identity_key + private_key = panel FCPUB/FCPRIV (X-Panel-* auth)
        // cloud_api_key + cloud_api_secret = optional Mythic→panel ACCESS keys
        // mythic_user_id / user_uuid + team_uuid = required identity linkage
        $identityPublic = trim((string) (
            $payload['public_identity_key']
            ?? $payload['panel_public_key']
            ?? ''
        ));
        $identityPrivate = trim((string) (
            $payload['panel_private_key']
            ?? ''
        ));

        // Prefer explicit private_key as identity when Mythic sent public_identity_key,
        // or when the value is clearly an FCPRIV key.
        $rawPrivate = trim((string) ($payload['private_key'] ?? ''));
        if ($identityPrivate === '' && $rawPrivate !== '') {
            if ($identityPublic !== '' || str_starts_with($rawPrivate, 'FCPRIV-')) {
                $identityPrivate = $rawPrivate;
            }
        }

        $accessPublic = trim((string) ($payload['cloud_api_key'] ?? $payload['access_public_key'] ?? ''));
        $accessPrivate = trim((string) ($payload['cloud_api_secret'] ?? $payload['access_private_key'] ?? ''));

        // Legacy finish: public_key/api_key + api_secret/private_key without public_identity_key.
        if ($identityPublic === '' && $identityPrivate === '') {
            $legacyPublic = trim((string) ($payload['public_key'] ?? $payload['api_key'] ?? ''));
            $legacyPrivate = trim((string) ($payload['api_secret'] ?? $payload['private_key'] ?? ''));
            if (str_starts_with($legacyPublic, 'FCPUB-') && str_starts_with($legacyPrivate, 'FCPRIV-')) {
                $identityPublic = $legacyPublic;
                $identityPrivate = $legacyPrivate;
            } elseif ($accessPublic === '' && $accessPrivate === '' && $legacyPublic !== '' && $legacyPrivate !== '') {
                $accessPublic = $legacyPublic;
                $accessPrivate = $legacyPrivate;
            }
        }

        $mythicUserId = trim((string) (
            $payload['mythic_user_id']
            ?? $payload['user_uuid']
            ?? $payload['authorizer_user_id']
            ?? $payload['user_id']
            ?? ''
        ));
        $teamUuid = trim((string) ($payload['team_uuid'] ?? ''));
        if ($teamUuid === '' && is_array($payload['team'] ?? null)) {
            $teamUuid = trim((string) ($payload['team']['uuid'] ?? ''));
        }
        if ($teamUuid === '') {
            $teamUuid = trim((string) ($payload['team_id'] ?? ''));
        }

        $config = $this->app->getConfig();
        $storedIdentityPublic = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '') ?? ''));
        $storedIdentityPrivate = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '') ?? ''));
        $relinkPendingAt = $config->getSetting(ConfigInterface::FEATHERCLOUD_RELINK_PENDING_AT, null);
        if ($identityPublic === '') {
            $identityPublic = $storedIdentityPublic;
        }
        if ($identityPrivate === '') {
            $identityPrivate = $storedIdentityPrivate;
        }

        if ($identityPublic === '' || $identityPrivate === '') {
            return ApiResponse::error(
                'Missing required OAuth params: public_identity_key and private_key.',
                'MISSING_IDENTITY_KEYS',
                400
            );
        }

        if ($mythicUserId === '' || $teamUuid === '') {
            return ApiResponse::error(
                'Missing required OAuth params: mythic_user_id (or user_uuid) and team_uuid.',
                'MISSING_LINK_IDENTITY',
                400
            );
        }

        try {
            $timestamp = gmdate('c');
            $hasStoredIdentityPair = $storedIdentityPublic !== '' && $storedIdentityPrivate !== '';
            $allowIdentityReplacement = self::isRecentPendingRelink($relinkPendingAt);

            if ($hasStoredIdentityPair) {
                if (
                    !hash_equals($storedIdentityPublic, $identityPublic)
                    || !hash_equals($storedIdentityPrivate, $identityPrivate)
                ) {
                    if (!$allowIdentityReplacement) {
                        return ApiResponse::error(
                            'Invalid panel credentials.',
                            'INVALID_PANEL_CREDENTIALS',
                            403
                        );
                    }

                    $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, $identityPublic);
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, $identityPrivate);
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, $timestamp);
                }
            } else {
                $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, $identityPublic);
                $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, $identityPrivate);
                $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, $timestamp);
            }

            if ($accessPublic !== '' && $accessPrivate !== '') {
                $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, $accessPublic);
                $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, $accessPrivate);
                $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_LAST_ROTATED, $timestamp);
            }

            $config->setSetting(ConfigInterface::FEATHERCLOUD_LAST_SYNCED_AT, $timestamp);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_LINKED_AT, $timestamp);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_RELINK_PENDING_AT, null);

            $user = $request->attributes->get('user');
            $featherUuid = is_array($user) ? trim((string) ($user['uuid'] ?? '')) : '';

            MythicMemberResolver::persistLinkIdentity(
                $teamUuid,
                $mythicUserId,
                $featherUuid !== '' ? $featherUuid : null,
                [
                    'mythic_user_email' => $payload['mythic_user_email'] ?? null,
                    'mythic_user_name' => $payload['mythic_user_name'] ?? null,
                    'team_name' => $payload['team_name'] ?? null,
                    'team_slug' => $payload['team_slug'] ?? null,
                    'cloud_id' => $payload['cloud_id'] ?? null,
                    'cloud_name' => $payload['cloud_name'] ?? null,
                ]
            );

            $membersSynced = 0;
            try {
                $client = new FeatherCloudClient();
                if ($client->isConfigured()) {
                    $sync = MythicMemberResolver::syncTeamMembers(
                        $client,
                        $featherUuid !== '' ? $featherUuid : null
                    );
                    $membersSynced = (int) ($sync['synced'] ?? 0);
                }
            } catch (\Throwable $syncException) {
                $this->app->getLogger()->warning(
                    'Mythic OAuth save succeeded but member sync failed: ' . $syncException->getMessage()
                );
            }

            $this->logCloudActivity(
                $request,
                'oauth2_cloud_credentials_saved',
                'Mythic Cloud OAuth finish identity keys + mythic_user_id + team_uuid saved'
            );

            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    CloudManagementEvent::onCloudCredentialsStored(),
                    [
                        'credentials' => [
                            'public_key' => $identityPublic,
                            'private_key' => '[REDACTED]',
                            'last_rotated_at' => $timestamp,
                        ],
                        'stored_by' => $user,
                        'source' => 'oauth2_callback',
                        'team_uuid' => $teamUuid,
                        'mythic_user_id' => $mythicUserId,
                    ]
                );
            }

            return ApiResponse::success([
                'message' => 'OAuth2 callback processed successfully',
                'timestamp' => $timestamp,
                'linked' => true,
                'team_uuid' => $teamUuid,
                'mythic_user_id' => $mythicUserId,
                'members_synced' => $membersSynced,
                'access_keys_stored' => $accessPublic !== '' && $accessPrivate !== '',
            ], 'Cloud credentials saved successfully', 200);
        } catch (\Throwable $exception) {
            $this->app->getLogger()->error('Failed to save FeatherCloud OAuth2 callback credentials: ' . $exception->getMessage());

            return ApiResponse::error('Failed to save cloud credentials', 'OAUTH2_CALLBACK_SAVE_FAILED', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/cloud/disconnect',
        summary: 'Disconnect Mythic Cloud link',
        description: 'Fully clear Mythic link state (identity keys, access keys, team, authorizer, member map) so the panel acts as never linked.',
        tags: ['Admin - FeatherCloud'],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'wipe_identity_keys',
                        type: 'boolean',
                        description: 'Ignored disconnect always wipes identity keys for a clean unlink'
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Disconnected successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function disconnect(Request $request): Response
    {
        try {
            $config = $this->app->getConfig();

            // Full wipe act as if Mythic was never linked.
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_LAST_ROTATED, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_LAST_SYNCED_AT, null);
            $config->setSetting(ConfigInterface::FEATHERCLOUD_RELINK_PENDING_AT, null);
            MythicMemberResolver::clearLinkState();

            $this->logCloudActivity(
                $request,
                'disconnect_cloud',
                'Mythic Cloud fully disconnected (identity + access + link metadata wiped)'
            );

            return ApiResponse::success([
                'linked' => false,
                'panel_credentials' => [
                    'public_key' => '',
                    'private_key' => '',
                    'last_rotated_at' => null,
                ],
                'cloud_credentials' => [
                    'public_key' => '',
                    'private_key' => '',
                    'last_rotated_at' => null,
                ],
            ], 'Mythic Cloud disconnected', 200);
        } catch (\Throwable $exception) {
            $this->app->getLogger()->error('Failed to disconnect Mythic Cloud: ' . $exception->getMessage());

            return ApiResponse::error('Failed to disconnect Mythic Cloud', 'CLOUD_DISCONNECT_FAILED', 500);
        }
    }

    #[OA\Put(
        path: '/api/admin/cloud/settings',
        summary: 'Update Mythic Cloud client settings',
        description: 'Configure Panel API base URL, OAuth URL, and module flags. Mythic member ids are resolved automatically never collected from admins.',
        tags: ['Admin - FeatherCloud'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'api_base_url', type: 'string'),
                    new OA\Property(property: 'oauth_url', type: 'string'),
                    new OA\Property(property: 'marketplace_enabled', type: 'boolean'),
                    new OA\Property(property: 'eggs_enabled', type: 'boolean'),
                    new OA\Property(property: 'pastes_enabled', type: 'boolean'),
                    new OA\Property(property: 'issues_enabled', type: 'boolean'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Settings updated'),
            new OA\Response(response: 400, description: 'Invalid payload'),
        ]
    )]
    public function updateSettings(Request $request): Response
    {
        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        // Reject manual Mythic user-id writes mapping is automatic via OAuth + email sync.
        if (array_key_exists('member_user_uuid', $payload)) {
            return ApiResponse::error(
                MythicMemberResolver::UNMAPPED_MESSAGE,
                'MANUAL_MYTHIC_USER_ID_REJECTED',
                400
            );
        }

        try {
            $config = $this->app->getConfig();

            if (array_key_exists('api_base_url', $payload)) {
                $apiBase = trim((string) $payload['api_base_url']);
                if ($apiBase !== '' && !filter_var($apiBase, FILTER_VALIDATE_URL)) {
                    return ApiResponse::error('Invalid api_base_url', 'INVALID_API_BASE_URL', 400);
                }
                $config->setSetting(ConfigInterface::FEATHERCLOUD_API_BASE_URL, $apiBase !== '' ? rtrim($apiBase, '/') : null);
            }

            if (array_key_exists('oauth_url', $payload)) {
                $oauthUrl = trim((string) $payload['oauth_url']);
                if ($oauthUrl !== '' && !filter_var($oauthUrl, FILTER_VALIDATE_URL)) {
                    return ApiResponse::error('Invalid oauth_url', 'INVALID_OAUTH_URL', 400);
                }
                $config->setSetting(ConfigInterface::FEATHERCLOUD_OAUTH_URL, $oauthUrl !== '' ? rtrim($oauthUrl, '/') : null);
            }

            foreach (
                [
                    'marketplace_enabled' => ConfigInterface::FEATHERCLOUD_MARKETPLACE_ENABLED,
                    'eggs_enabled' => ConfigInterface::FEATHERCLOUD_EGGS_ENABLED,
                    'pastes_enabled' => ConfigInterface::FEATHERCLOUD_PASTES_ENABLED,
                    'issues_enabled' => ConfigInterface::FEATHERCLOUD_ISSUES_ENABLED,
                ] as $field => $setting
            ) {
                if (array_key_exists($field, $payload)) {
                    $config->setSetting($setting, filter_var($payload[$field], FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false');
                }
            }

            return ApiResponse::success($this->settingsPayload($request), 'Mythic Cloud settings updated', 200);
        } catch (\Throwable $exception) {
            $this->app->getLogger()->error('Failed to update Mythic Cloud settings: ' . $exception->getMessage());

            return ApiResponse::error('Failed to update Mythic Cloud settings', 'CLOUD_SETTINGS_UPDATE_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/cloud/settings',
        summary: 'Get Mythic Cloud client settings',
        tags: ['Admin - FeatherCloud'],
        responses: [
            new OA\Response(response: 200, description: 'Settings fetched'),
        ]
    )]
    public function getSettings(Request $request): Response
    {
        return ApiResponse::success($this->settingsPayload($request), 'Mythic Cloud settings fetched', 200);
    }

    #[OA\Post(
        path: '/api/admin/cloud/members/sync',
        summary: 'Sync Mythic team members for email → id mapping',
        tags: ['Admin - FeatherCloud'],
        responses: [
            new OA\Response(response: 200, description: 'Members synced'),
        ]
    )]
    public function syncMembers(Request $request): Response
    {
        try {
            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return ApiResponse::error(
                    'Mythic Cloud credentials are not configured. Connect Mythic Cloud first.',
                    'CLOUD_CREDENTIALS_NOT_CONFIGURED',
                    503
                );
            }

            $user = $request->attributes->get('user');
            $featherUuid = is_array($user) ? trim((string) ($user['uuid'] ?? '')) : '';
            $result = MythicMemberResolver::syncTeamMembers(
                $client,
                $featherUuid !== '' ? $featherUuid : null
            );

            return ApiResponse::success([
                'synced' => $result['synced'],
                'synced_at' => $result['map']['synced_at'] ?? gmdate('c'),
            ], 'Mythic team members synced', 200);
        } catch (\Throwable $exception) {
            $this->app->getLogger()->error('Failed to sync Mythic team members: ' . $exception->getMessage());

            return ApiResponse::error('Failed to sync Mythic team members', 'CLOUD_MEMBER_SYNC_FAILED', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/cloud/sync',
        summary: 'Sync Mythic summary and purchases',
        description: 'Pulls /panel/summary and /panel/products using stored FCPUB/FCPRIV and refreshes local cache.',
        tags: ['Admin - FeatherCloud']
    )]
    public function syncNow(Request $request): Response
    {
        try {
            $result = \App\Controllers\System\CloudV1Controller::runSync();

            return ApiResponse::success($result, 'Cloud sync completed', 200);
        } catch (FeatherCloudException $e) {
            $status = $e->getHttpStatusCode();
            if ($status === 401) {
                $status = 503;
            }

            return ApiResponse::error($e->getMessage(), $e->getErrorCode(), $status);
        } catch (\Throwable $e) {
            $this->app->getLogger()->error('Admin cloud sync failed: ' . $e->getMessage());

            return ApiResponse::error('Cloud sync failed: ' . $e->getMessage(), 'CLOUD_SYNC_FAILED', 500);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function settingsPayload(?Request $request = null): array
    {
        $config = $this->app->getConfig();
        $mappedMythicId = MythicMemberResolver::resolveFromRequest($request);
        $linkedAt = $config->getSetting(ConfigInterface::FEATHERCLOUD_LINKED_AT, null);
        $teamUuid = $config->getSetting(ConfigInterface::FEATHERCLOUD_TEAM_UUID, '') ?: null;
        $mythicUserId = $config->getSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_MYTHIC_USER_ID, '') ?: null;
        $hasIdentity = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '') ?? '')) !== ''
            && trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '') ?? '')) !== '';
        $hasAccess = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, '') ?? '')) !== ''
            && trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, '') ?? '')) !== '';
        $linked = $hasIdentity && ($linkedAt || ($teamUuid && $mythicUserId));

        return [
            'api_base_url' => FeatherCloudClient::resolveBaseUrl(),
            'oauth_url' => FeatherCloudClient::resolveOAuthUrl(),
            'linked' => (bool) $linked,
            'linked_at' => $linkedAt,
            'has_access_keys' => $hasAccess,
            'has_identity_keys' => $hasIdentity,
            'team_uuid' => $teamUuid,
            'team_name' => $config->getSetting(ConfigInterface::FEATHERCLOUD_TEAM_NAME, '') ?: null,
            'team_slug' => $config->getSetting(ConfigInterface::FEATHERCLOUD_TEAM_SLUG, '') ?: null,
            'cloud_id' => $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_ID, '') ?: null,
            'cloud_name' => $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_NAME, '') ?: null,
            'mythic_user_id' => $mythicUserId,
            'mythic_user_email' => $config->getSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_EMAIL, '') ?: null,
            'mythic_user_name' => $config->getSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_NAME, '') ?: null,
            'current_user_mapped' => $mappedMythicId !== null,
            'current_user_mythic_id' => $mappedMythicId,
            'marketplace_enabled' => ($config->getSetting(ConfigInterface::FEATHERCLOUD_MARKETPLACE_ENABLED, 'true') ?? 'true') === 'true',
            'eggs_enabled' => ($config->getSetting(ConfigInterface::FEATHERCLOUD_EGGS_ENABLED, 'true') ?? 'true') === 'true',
            'pastes_enabled' => ($config->getSetting(ConfigInterface::FEATHERCLOUD_PASTES_ENABLED, 'true') ?? 'true') === 'true',
            'issues_enabled' => ($config->getSetting(ConfigInterface::FEATHERCLOUD_ISSUES_ENABLED, 'true') ?? 'true') === 'true',
            'last_synced_at' => $config->getSetting(ConfigInterface::FEATHERCLOUD_LAST_SYNCED_AT, null),
            'defaults' => [
                'api_base_url_prod' => FeatherCloudClient::DEFAULT_PROD_BASE_URL,
                'api_base_url_dev' => FeatherCloudClient::DEFAULT_DEV_BASE_URL,
                'oauth_url' => FeatherCloudClient::DEFAULT_OAUTH_URL,
            ],
        ];
    }

    /**
     * Activity logging must never break cloud credential flows (FK / deadlocks observed in prod).
     */
    private function logCloudActivity(Request $request, string $name, string $context): void
    {
        try {
            $user = $request->attributes->get('user');
            $userUuid = is_array($user) ? trim((string) ($user['uuid'] ?? '')) : '';
            if ($userUuid === '') {
                return;
            }

            Activity::createActivity([
                'user_uuid' => $userUuid,
                'name' => $name,
                'context' => $context,
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);
        } catch (\Throwable $exception) {
            $this->app->getLogger()->warning(
                'Cloud activity log skipped (' . $name . '): ' . $exception->getMessage()
            );
        }
    }

    private static function isRecentPendingRelink(mixed $value): bool
    {
        if (!is_string($value) || trim($value) === '') {
            return false;
        }

        try {
            $pendingAt = new \DateTimeImmutable($value);
            $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));

            return abs($now->getTimestamp() - $pendingAt->getTimestamp()) <= 1800;
        } catch (\Throwable) {
            return false;
        }
    }
}
