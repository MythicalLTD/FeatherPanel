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

/**
 * Soft Mythic→panel auth for public endpoints Mythic probes (e.g. GET /api/system/settings).
 *
 * - No Mythic credentials headers → allow (panel UI / public consumers).
 * - Credentials present → must match stored cloud_api_key / cloud_api_secret.
 */
class PanelAccessSoftMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        [$incomingPublic, $incomingPrivate] = PanelAccessMiddleware::readIncomingPair($request);

        if ($incomingPublic === null && $incomingPrivate === null) {
            return $next($request);
        }

        // One half present without the other is always invalid.
        if ($incomingPublic === null || $incomingPrivate === null) {
            return ApiResponse::error(
                'Incomplete Mythic→panel credentials.',
                'CLOUD_REMOTE_CREDENTIALS_REQUIRED',
                401
            );
        }

        $config = App::getInstance(true)->getConfig();
        $accessPublic = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, '') ?? ''));
        $accessPrivate = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, '') ?? ''));

        if ($accessPublic === '' || $accessPrivate === '') {
            return ApiResponse::error(
                'Mythic cloud_api_key/secret are not configured on this panel. Complete OAuth finish first.',
                'CLOUD_REMOTE_CREDENTIALS_MISSING',
                503
            );
        }

        if (!hash_equals($accessPublic, $incomingPublic) || !hash_equals($accessPrivate, $incomingPrivate)) {
            return ApiResponse::error(
                'Invalid Mythic→panel credentials.',
                'CLOUD_REMOTE_CREDENTIALS_INVALID',
                403
            );
        }

        $request->attributes->set('feathercloud_mythic_authenticated', true);

        return $next($request);
    }
}
