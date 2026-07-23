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
 * Mythic → panel auth using stored cloud_api_key / cloud_api_secret (ACCESS_*).
 *
 * Accepts either header pair:
 *   X-Panel-Public-Key / X-Panel-Private-Key
 *   X-Api-Key / X-Api-Secret
 */
class PanelAccessMiddleware implements MiddlewareInterface
{
    private const HEADER_PUBLIC = 'x-panel-public-key';
    private const HEADER_PRIVATE = 'x-panel-private-key';
    private const HEADER_API_KEY = 'x-api-key';
    private const HEADER_API_SECRET = 'x-api-secret';

    public function handle(Request $request, callable $next): Response
    {
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

        $incomingPublic = $this->readPublic($request);
        $incomingPrivate = $this->readPrivate($request);

        if ($incomingPublic === null || $incomingPrivate === null) {
            return ApiResponse::error(
                'Missing Mythic→panel credentials (X-Panel-Public-Key / X-Panel-Private-Key or X-Api-Key / X-Api-Secret).',
                'CLOUD_REMOTE_CREDENTIALS_REQUIRED',
                401
            );
        }

        if (!hash_equals($accessPublic, $incomingPublic) || !hash_equals($accessPrivate, $incomingPrivate)) {
            return ApiResponse::error(
                'Invalid Mythic→panel credentials.',
                'CLOUD_REMOTE_CREDENTIALS_INVALID',
                403
            );
        }

        $request->attributes->set('feathercloud_access_public_key', $accessPublic);
        $request->attributes->set('feathercloud_access_private_key', $accessPrivate);
        $request->attributes->set('feathercloud_mythic_authenticated', true);

        return $next($request);
    }

    /**
     * @return array{0: ?string, 1: ?string}
     */
    public static function readIncomingPair(Request $request): array
    {
        $mw = new self();

        return [$mw->readPublic($request), $mw->readPrivate($request)];
    }

    private function readPublic(Request $request): ?string
    {
        return $this->readCredential(
            $request,
            [self::HEADER_PUBLIC, self::HEADER_API_KEY, 'x-cloud-public-key', 'x-cloud-api-key'],
            ['cloud_public_key', 'cloud_api_key', 'public_key']
        );
    }

    private function readPrivate(Request $request): ?string
    {
        return $this->readCredential(
            $request,
            [self::HEADER_PRIVATE, self::HEADER_API_SECRET, 'x-cloud-private-key', 'x-cloud-api-secret'],
            ['cloud_private_key', 'cloud_api_secret', 'private_key']
        );
    }

    /**
     * @param list<string> $headers
     * @param list<string> $payloadKeys
     */
    private function readCredential(Request $request, array $headers, array $payloadKeys): ?string
    {
        foreach ($headers as $header) {
            if ($request->headers->has($header)) {
                $value = trim((string) $request->headers->get($header));
                if ($value !== '') {
                    return $value;
                }
            }
        }

        $content = $request->getContent();
        if ($content !== '') {
            $payload = json_decode($content, true);
            if (is_array($payload)) {
                foreach ($payloadKeys as $payloadKey) {
                    $value = $payload[$payloadKey] ?? null;
                    if (is_string($value) && trim($value) !== '') {
                        return trim($value);
                    }
                }
            }
        }

        return null;
    }
}
