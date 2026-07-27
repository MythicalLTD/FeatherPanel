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

use App\App;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use Symfony\Component\Routing\Route;
use App\Middleware\CloudAccessMiddleware;
use App\Middleware\PanelAccessMiddleware;
use App\Controllers\System\CloudV1Controller;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return static function (RouteCollection $routes): void {
    $routes->add('feathercloud-handshake', new Route(
        '/api/cloud/v1/handshake',
        [
            '_controller' => static function (Request $request) {
                $config = App::getInstance(true)->getConfig();

                $panelPublic = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '');
                $panelPrivate = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '');
                $panelRotated = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, null);

                $cloudPublic = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, '');
                $cloudPrivate = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, '');
                $cloudRotated = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_LAST_ROTATED, null);

                return ApiResponse::success([
                    'message' => 'Mythic Cloud handshake successful',
                    'timestamp' => gmdate('c'),
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
                ], 'Handshake successful', 200);
            },
            '_middleware' => [CloudAccessMiddleware::class],
        ],
        [],
        [],
        '',
        [],
        ['POST']
    ));

    // Mythic → Panel: persist FCPUB/FCPRIV identity keys from query (or body/headers).
    // Optional X-Panel-Public-Key / X-Panel-Private-Key headers may carry Mythic-stored
    // cloud_api_key / cloud_api_secret when the panel already has ACCESS credentials.
    $routes->add('feathercloud-panel-handshake', new Route(
        '/api/cloud/v1/panel-handshake',
        [
            '_controller' => static function (Request $request) {
                $app = App::getInstance(true);
                $config = $app->getConfig();
                $logger = $app->getLogger();

                try {
                    $storedAccessPublic = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, '') ?? ''));
                    $storedAccessPrivate = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, '') ?? ''));

                    $incomingAccessPublic = trim((string) (
                        $request->headers->get('X-Panel-Public-Key')
                        ?? $request->headers->get('X-Api-Key')
                        ?? $request->headers->get('x-cloud-public-key')
                        ?? ''
                    ));
                    $incomingAccessPrivate = trim((string) (
                        $request->headers->get('X-Panel-Private-Key')
                        ?? $request->headers->get('X-Api-Secret')
                        ?? $request->headers->get('x-cloud-private-key')
                        ?? ''
                    ));

                    // If callback credentials already exist and Mythic sent auth headers, verify them.
                    if ($storedAccessPublic !== '' && $storedAccessPrivate !== '') {
                        if ($incomingAccessPublic !== '' || $incomingAccessPrivate !== '') {
                            if (
                                $incomingAccessPublic === ''
                                || $incomingAccessPrivate === ''
                                || !hash_equals($storedAccessPublic, $incomingAccessPublic)
                                || !hash_equals($storedAccessPrivate, $incomingAccessPrivate)
                            ) {
                                $logger->warning('Mythic panel-handshake: invalid optional cloud access credentials');

                                return ApiResponse::error('Invalid Mythic cloud credentials.', 'CLOUD_REMOTE_CREDENTIALS_INVALID', 403);
                            }
                        }
                    }

                    $payload = json_decode($request->getContent() ?: '[]', true);
                    if (!is_array($payload)) {
                        $payload = [];
                    }

                    $panelPublic = trim((string) (
                        $request->query->get('panel_public_key')
                        ?? $request->query->get('public_identity_key')
                        ?? $request->query->get('public_key')
                        ?? $payload['panel_public_key']
                        ?? $payload['public_identity_key']
                        ?? $payload['public_key']
                        ?? ''
                    ));
                    $panelPrivate = trim((string) (
                        $request->query->get('panel_private_key')
                        ?? $request->query->get('private_key')
                        ?? $payload['panel_private_key']
                        ?? $payload['private_key']
                        ?? ''
                    ));

                    // When Mythic sends identity keys as headers instead of query (and ACCESS keys are empty),
                    // accept FCPUB-/FCPRIV- shaped values from X-Panel-* as the identity pair.
                    if ($panelPublic === '' && str_starts_with($incomingAccessPublic, 'FCPUB-')) {
                        $panelPublic = $incomingAccessPublic;
                    }
                    if ($panelPrivate === '' && str_starts_with($incomingAccessPrivate, 'FCPRIV-')) {
                        $panelPrivate = $incomingAccessPrivate;
                    }

                    if ($panelPublic === '' || $panelPrivate === '') {
                        return ApiResponse::error(
                            'Missing panel_public_key and panel_private_key.',
                            'MISSING_PANEL_KEYS',
                            400
                        );
                    }

                    $timestamp = gmdate('c');
                    $storedPanelPublic = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '') ?? ''));
                    $storedPanelPrivate = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '') ?? ''));
                    $hasStoredIdentityPair = $storedPanelPublic !== '' && $storedPanelPrivate !== '';

                    if ($hasStoredIdentityPair) {
                        if (
                            !hash_equals($storedPanelPublic, $panelPublic)
                            || !hash_equals($storedPanelPrivate, $panelPrivate)
                        ) {
                            $logger->warning('Mythic panel-handshake: panel identity keys mismatch');

                            return ApiResponse::error('Invalid panel credentials.', 'INVALID_PANEL_CREDENTIALS', 403);
                        }
                    } else {
                        $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, $panelPublic);
                        $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, $panelPrivate);
                        $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, $timestamp);
                    }

                    $config->setSetting(ConfigInterface::FEATHERCLOUD_LAST_SYNCED_AT, $timestamp);
                    if (!$config->getSetting(ConfigInterface::FEATHERCLOUD_LINKED_AT, null)) {
                        $config->setSetting(ConfigInterface::FEATHERCLOUD_LINKED_AT, $timestamp);
                    }

                    $logger->info($hasStoredIdentityPair
                        ? 'Mythic panel-handshake: existing identity keys verified'
                        : 'Mythic panel-handshake: identity keys stored');

                    return ApiResponse::success([
                        'timestamp' => $timestamp,
                        'public_key_prefix' => substr($panelPublic, 0, 12),
                        'linked' => true,
                    ], 'Panel credentials accepted and updated', 200);
                } catch (Throwable $exception) {
                    $logger->error('Mythic panel-handshake failed: ' . $exception->getMessage());

                    return ApiResponse::error('Failed to process panel handshake', 'PANEL_HANDSHAKE_FAILED', 500);
                }
            },
            // Auth is optional (verified inside when ACCESS keys exist + headers provided).
            '_middleware' => [],
        ],
        [],
        [],
        '',
        [],
        ['POST']
    ));

    $routes->add('feathercloud-status', new Route(
        '/api/cloud/v1/status',
        [
            '_controller' => static function (Request $request) {
                return (new CloudV1Controller())->status($request);
            },
            '_middleware' => [PanelAccessMiddleware::class],
        ],
        [],
        [],
        '',
        [],
        ['GET']
    ));

    $routes->add('feathercloud-sync', new Route(
        '/api/cloud/v1/sync',
        [
            '_controller' => static function (Request $request) {
                return (new CloudV1Controller())->sync($request);
            },
            '_middleware' => [PanelAccessMiddleware::class],
        ],
        [],
        [],
        '',
        [],
        ['POST']
    ));

    // OAuth2 callback endpoint - Mythic may POST credentials here after OAuth completes.
    $routes->add('feathercloud-oauth2-callback', new Route(
        '/api/cloud/v1/oauth2/callback',
        [
            '_controller' => static function (Request $request) {
                $app = App::getInstance(true);
                $config = $app->getConfig();
                $logger = $app->getLogger();

                try {
                    $cloudApiKey = trim((string) ($request->headers->get('cloud_api_key') ?? $request->headers->get('x-cloud-api-key') ?? ''));
                    $cloudApiSecret = trim((string) ($request->headers->get('cloud_api_secret') ?? $request->headers->get('x-cloud-api-secret') ?? ''));

                    if ($cloudApiKey === '' || $cloudApiSecret === '') {
                        $payload = json_decode($request->getContent() ?: '[]', true);
                        if (is_array($payload)) {
                            $cloudApiKey = trim((string) ($payload['cloud_api_key'] ?? $payload['cloud_public_key'] ?? $payload['public_key'] ?? ''));
                            $cloudApiSecret = trim((string) ($payload['cloud_api_secret'] ?? $payload['cloud_private_key'] ?? $payload['private_key'] ?? ''));
                        }
                    }

                    if ($cloudApiKey === '' || $cloudApiSecret === '') {
                        return ApiResponse::error('Missing required parameters: cloud_api_key, cloud_api_secret.', 'MISSING_CLOUD_CREDENTIALS', 400);
                    }

                    $panelPublicFromRequest = trim((string) ($request->headers->get('panel_public_key') ?? $request->headers->get('x-panel-public-key') ?? ''));
                    $panelPrivateFromRequest = trim((string) ($request->headers->get('panel_private_key') ?? $request->headers->get('x-panel-private-key') ?? ''));

                    if ($panelPublicFromRequest === '' || $panelPrivateFromRequest === '') {
                        $payload = json_decode($request->getContent() ?: '[]', true);
                        if (is_array($payload)) {
                            $panelPublicFromRequest = trim((string) ($payload['panel_public_key'] ?? ''));
                            $panelPrivateFromRequest = trim((string) ($payload['panel_private_key'] ?? ''));
                        }
                    }

                    if ($panelPublicFromRequest !== '' && $panelPrivateFromRequest !== '') {
                        $storedPanelPublic = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '');
                        $storedPanelPrivate = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '');

                        if ($storedPanelPublic !== '' && $storedPanelPrivate !== '') {
                            if (!hash_equals($storedPanelPublic, $panelPublicFromRequest) || !hash_equals($storedPanelPrivate, $panelPrivateFromRequest)) {
                                $logger->warning('Mythic OAuth2 callback: Panel credentials mismatch');

                                return ApiResponse::error('Invalid panel credentials.', 'INVALID_PANEL_CREDENTIALS', 403);
                            }
                        }
                    }

                    $timestamp = gmdate('c');
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, $cloudApiKey);
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, $cloudApiSecret);
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_LAST_ROTATED, $timestamp);
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_LAST_SYNCED_AT, $timestamp);

                    $logger->info('Mythic OAuth2 callback received - cloud credentials stored successfully');

                    return ApiResponse::success([
                        'message' => 'OAuth2 callback processed successfully',
                        'timestamp' => $timestamp,
                    ], 'Cloud credentials stored successfully', 200);
                } catch (Throwable $exception) {
                    $logger->error('Failed to process Mythic OAuth2 callback: ' . $exception->getMessage());

                    return ApiResponse::error('Failed to process OAuth2 callback', 'OAUTH2_CALLBACK_FAILED', 500);
                }
            },
            '_middleware' => [],
        ],
        [],
        [],
        '',
        [],
        ['POST']
    ));
};
