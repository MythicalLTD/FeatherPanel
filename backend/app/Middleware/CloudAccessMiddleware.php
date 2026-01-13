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

namespace App\Middleware;

use App\App;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class CloudAccessMiddleware implements MiddlewareInterface
{
    private const HEADER_PANEL_PUBLIC = 'x-panel-public-key';
    private const HEADER_PANEL_PRIVATE = 'x-panel-private-key';
    private const HEADER_CLOUD_PUBLIC = 'x-cloud-public-key';
    private const HEADER_CLOUD_PRIVATE = 'x-cloud-private-key';

    public function handle(Request $request, callable $next): Response
    {
        $config = App::getInstance(true)->getConfig();

        $panelPublic = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, '');
        $panelPrivate = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, '');
        $cloudPublic = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '');
        $cloudPrivate = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '');

        if ($panelPublic === '' || $panelPrivate === '' || $cloudPublic === '' || $cloudPrivate === '') {
            return ApiResponse::error(
                'FeatherCloud integration is not configured on this panel.',
                'CLOUD_INTEGRATION_NOT_CONFIGURED',
                503
            );
        }

        $incomingPanelPublic = $this->readValue($request, self::HEADER_PANEL_PUBLIC, 'panel_public_key');
        $incomingPanelPrivate = $this->readValue($request, self::HEADER_PANEL_PRIVATE, 'panel_private_key');
        $incomingCloudPublic = $this->readValue($request, self::HEADER_CLOUD_PUBLIC, 'cloud_public_key');
        $incomingCloudPrivate = $this->readValue($request, self::HEADER_CLOUD_PRIVATE, 'cloud_private_key');

        if (
            $incomingPanelPublic === null
            || $incomingPanelPrivate === null
            || $incomingCloudPublic === null
            || $incomingCloudPrivate === null
        ) {
            return ApiResponse::error('Missing FeatherCloud authentication headers.', 'CLOUD_CREDENTIALS_REQUIRED', 401);
        }

        if (
            !hash_equals($panelPublic, $incomingPanelPublic)
            || !hash_equals($panelPrivate, $incomingPanelPrivate)
            || !hash_equals($cloudPublic, $incomingCloudPublic)
            || !hash_equals($cloudPrivate, $incomingCloudPrivate)
        ) {
            App::getInstance(true)->getLogger()->warning('FeatherCloud authentication failed due to invalid credentials');

            return ApiResponse::error('Invalid FeatherCloud credentials.', 'CLOUD_CREDENTIALS_INVALID', 403);
        }

        $request->attributes->set('feathercloud_panel_public_key', $panelPublic);
        $request->attributes->set('feathercloud_panel_private_key', $panelPrivate);
        $request->attributes->set('feathercloud_cloud_public_key', $cloudPublic);
        $request->attributes->set('feathercloud_cloud_private_key', $cloudPrivate);

        return $next($request);
    }

    private function readValue(Request $request, string $header, string $payloadKey): ?string
    {
        if ($request->headers->has($header)) {
            $value = trim((string) $request->headers->get($header));
            if ($value !== '') {
                return $value;
            }
        }

        $content = $request->getContent();
        if ($content !== '') {
            $payload = json_decode($content, true);
            if (is_array($payload)) {
                $value = $payload[$payloadKey] ?? null;
                if (is_string($value) && trim($value) !== '') {
                    return trim($value);
                }
            }
        }

        return null;
    }
}
