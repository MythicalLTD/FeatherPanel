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

class PanelAccessMiddleware implements MiddlewareInterface
{
    private const HEADER_PUBLIC = 'x-panel-public-key';
    private const HEADER_PRIVATE = 'x-panel-private-key';

    public function handle(Request $request, callable $next): Response
    {
        $config = App::getInstance(true)->getConfig();

        $cloudPublic = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, '');
        $cloudPrivate = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, '');

        if ($cloudPublic === '' || $cloudPrivate === '') {
            return ApiResponse::error(
                'FeatherCloud access credentials are not configured.',
                'CLOUD_REMOTE_CREDENTIALS_MISSING',
                503
            );
        }

        $incomingPublic = $this->readCredential($request, self::HEADER_PUBLIC, 'cloud_public_key');
        $incomingPrivate = $this->readCredential($request, self::HEADER_PRIVATE, 'cloud_private_key');

        if ($incomingPublic === null || $incomingPrivate === null) {
            return ApiResponse::error(
                'Missing FeatherCloud cloud credentials.',
                'CLOUD_REMOTE_CREDENTIALS_REQUIRED',
                401
            );
        }

        if (!hash_equals($cloudPublic, $incomingPublic) || !hash_equals($cloudPrivate, $incomingPrivate)) {
            return ApiResponse::error(
                'Invalid FeatherCloud cloud credentials.',
                'CLOUD_REMOTE_CREDENTIALS_INVALID',
                403
            );
        }

        $request->attributes->set('feathercloud_cloud_public_key', $cloudPublic);
        $request->attributes->set('feathercloud_cloud_private_key', $cloudPrivate);

        return $next($request);
    }

    private function readCredential(Request $request, string $header, string $payloadKey): ?string
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
