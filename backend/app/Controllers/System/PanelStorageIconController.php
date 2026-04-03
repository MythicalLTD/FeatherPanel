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

namespace App\Controllers\System;

use App\Helpers\ApiResponse;
use App\Helpers\PanelAssetUrl;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Proxies FeatherCloud marketplace icons from api.featherpanel.com so the browser loads them
 * via this panel (same origin as /api), avoiding third-party hotlink and cross-site restrictions.
 */
class PanelStorageIconController
{
    private const MAX_BYTES = 6291456; // 6 MiB

    public function getIcon(Request $request, string $filename): Response
    {
        $decoded = rawurldecode($filename);
        if (str_contains($decoded, '/') || str_contains($decoded, '\\') || str_contains($decoded, '..')) {
            return ApiResponse::error('Invalid icon filename', 'INVALID_ICON', 400);
        }
        if (!PanelAssetUrl::isSafeIconBasename($decoded)) {
            return ApiResponse::error('Invalid icon filename', 'INVALID_ICON', 400);
        }

        $url = PanelAssetUrl::upstreamBase() . rawurlencode($decoded);

        $ch = curl_init($url);
        if ($ch === false) {
            return ApiResponse::error('Failed to fetch icon', 'ICON_FETCH', 502);
        }

        $body = '';
        $code = 0;
        $contentType = 'application/octet-stream';

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_USERAGENT => 'FeatherPanel-IconProxy/1.0',
            CURLOPT_HEADERFUNCTION => static function ($ch, $headerLine) use (&$contentType): int {
                if (preg_match('/^content-type:\s*(.+)$/i', $headerLine, $m)) {
                    $contentType = trim($m[1]);
                }

                return strlen($headerLine);
            },
        ]);

        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($body === false || $code < 200 || $code >= 300) {
            return ApiResponse::error('Icon not found', 'ICON_NOT_FOUND', 404);
        }

        $len = strlen($body);
        if ($len === 0 || $len > self::MAX_BYTES) {
            return ApiResponse::error('Invalid icon response', 'ICON_INVALID', 502);
        }

        if (!str_starts_with(strtolower($contentType), 'image/')) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $detected = $finfo->buffer($body) ?: '';
            if (str_starts_with($detected, 'image/')) {
                $contentType = $detected;
            } else {
                $contentType = 'image/png';
            }
        }

        return new Response($body, 200, [
            'Content-Type' => $contentType,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
