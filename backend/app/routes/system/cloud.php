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

use App\App;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use Symfony\Component\Routing\Route;
use App\Middleware\CloudAccessMiddleware;
use App\Middleware\PanelAccessMiddleware;
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
                    'message' => 'FeatherCloud handshake successful',
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

    $routes->add('feathercloud-panel-handshake', new Route(
        '/api/cloud/v1/panel-handshake',
        [
            '_controller' => static function (Request $request) {
                $config = App::getInstance(true)->getConfig();

                if (isset($_GET['panel_public_key']) && isset($_GET['panel_private_key'])) {
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, $_GET['panel_public_key']);
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, $_GET['panel_private_key']);
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, gmdate('c'));
                }

                return ApiResponse::success([], 'Panel credentials accepted and updated', 200);
            },
            '_middleware' => [PanelAccessMiddleware::class],
        ],
        [],
        [],
        '',
        [],
        ['POST']
    ));

    // OAuth2 callback endpoint - FeatherCloud calls this after OAuth2 flow completes
    // This endpoint accepts cloud_api_key and cloud_api_secret from FeatherCloud headers
    // No authentication middleware needed since we're establishing credentials
    $routes->add('feathercloud-oauth2-callback', new Route(
        '/api/cloud/v1/oauth2/callback',
        [
            '_controller' => static function (Request $request) {
                $app = App::getInstance(true);
                $config = $app->getConfig();
                $logger = $app->getLogger();

                try {
                    // Get cloud_api_key and cloud_api_secret from headers (generated by FeatherCloud)
                    $cloudApiKey = trim((string) ($request->headers->get('cloud_api_key') ?? $request->headers->get('x-cloud-api-key') ?? ''));
                    $cloudApiSecret = trim((string) ($request->headers->get('cloud_api_secret') ?? $request->headers->get('x-cloud-api-secret') ?? ''));

                    // Also check payload as fallback
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

                    // Verify that we have panel credentials (sent during OAuth2 redirect)
                    // FeatherCloud should include panel public/private keys to verify the request
                    $panelPublicFromRequest = trim((string) ($request->headers->get('panel_public_key') ?? $request->headers->get('x-panel-public-key') ?? ''));
                    $panelPrivateFromRequest = trim((string) ($request->headers->get('panel_private_key') ?? $request->headers->get('x-panel-private-key') ?? ''));

                    if ($panelPublicFromRequest === '' || $panelPrivateFromRequest === '') {
                        $payload = json_decode($request->getContent() ?: '[]', true);
                        if (is_array($payload)) {
                            $panelPublicFromRequest = trim((string) ($payload['panel_public_key'] ?? ''));
                            $panelPrivateFromRequest = trim((string) ($payload['panel_private_key'] ?? ''));
                        }
                    }

                    // Verify panel credentials match what we sent in OAuth2 URL
                    if ($panelPublicFromRequest !== '' && $panelPrivateFromRequest !== '') {
                        $storedPanelPublic = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '');
                        $storedPanelPrivate = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '');

                        if ($storedPanelPublic !== '' && $storedPanelPrivate !== '') {
                            if (!hash_equals($storedPanelPublic, $panelPublicFromRequest) || !hash_equals($storedPanelPrivate, $panelPrivateFromRequest)) {
                                $logger->warning('FeatherCloud OAuth2 callback: Panel credentials mismatch');

                                return ApiResponse::error('Invalid panel credentials.', 'INVALID_PANEL_CREDENTIALS', 403);
                            }
                        }
                    }

                    // Store the cloud credentials (cloud_api_key and cloud_api_secret)
                    // These are stored as FEATHERCLOUD_ACCESS_PUBLIC_KEY and FEATHERCLOUD_ACCESS_PRIVATE_KEY
                    $timestamp = gmdate('c');
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, $cloudApiKey);
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, $cloudApiSecret);
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_ACCESS_LAST_ROTATED, $timestamp);

                    $logger->info('FeatherCloud OAuth2 callback received - cloud credentials stored successfully');

                    return ApiResponse::success([
                        'message' => 'OAuth2 callback processed successfully',
                        'timestamp' => $timestamp,
                    ], 'Cloud credentials stored successfully', 200);
                } catch (Throwable $exception) {
                    $logger->error('Failed to process FeatherCloud OAuth2 callback: ' . $exception->getMessage());

                    return ApiResponse::error('Failed to process OAuth2 callback', 'OAUTH2_CALLBACK_FAILED', 500);
                }
            },
            '_middleware' => [], // No middleware - we're establishing credentials
        ],
        [],
        [],
        '',
        [],
        ['POST']
    ));
};
