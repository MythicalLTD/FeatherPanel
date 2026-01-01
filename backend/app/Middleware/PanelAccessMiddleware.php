<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
