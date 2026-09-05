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

namespace App\Helpers;

use Symfony\Component\HttpFoundation\Response;

class ApiResponse
{
    public const PRETTYPRINT = true;

    /**
     * Security headers applied to every API response, in addition to the
     * existing CORS headers. This is a pure JSON API (see ApiResponse
     * usage across all controllers) - it never returns HTML - so these are
     * safe, low-risk defense-in-depth headers with no functional impact on
     * legitimate API clients:
     *
     * - X-Content-Type-Options: nosniff - stops browsers from ever
     *   MIME-sniffing a JSON response as HTML/JS if it's ever loaded in a
     *   context where that matters (e.g. a misconfigured <script src>).
     * - X-Frame-Options: DENY - this API is not meant to be framed.
     * - Content-Security-Policy: default-src 'none' - belt-and-suspenders
     *   for a JSON-only API; has no effect on JSON responses processed via
     *   fetch/XHR, only relevant if a response were ever rendered as a
     *   document.
     * - Referrer-Policy: no-referrer - avoid leaking API URLs (which can
     *   contain tokens in query strings, e.g. reset-password/upload-signed
     *   links) via the Referer header on any outbound navigation/request.
     */
    private const SECURITY_HEADERS = [
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'DENY',
        'Content-Security-Policy' => "default-src 'none'",
        'Referrer-Policy' => 'no-referrer',
    ];

    public static function success(?array $data = null, string $message = 'OK', int $status = 200): Response
    {
        $status = self::normalizeStatusForCdnSafeJson($status);

        return new Response(json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'error' => false,
            'error_message' => null,
            'error_code' => null,
        ], self::PRETTYPRINT ? JSON_PRETTY_PRINT : 0), $status, self::SECURITY_HEADERS + [
            'Content-Type' => 'application/json',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, X-Panel-Public-Key, X-Panel-Private-Key, X-Api-Key, X-Api-Secret, X-Panel-User-Uuid',
            'Access-Control-Allow-Credentials' => 'true',
        ]);
    }

    public static function error(string $error_message = 'Error', ?string $error_code = null, int $status = 400, ?array $data = null): Response
    {
        $status = self::normalizeStatusForCdnSafeJson($status);

        return new Response(json_encode([
            'success' => false,
            'message' => $error_message,
            'data' => $data,
            'error' => true,
            'error_message' => $error_message,
            'error_code' => $error_code,
            'errors' => [
                [
                    'code' => $error_code,
                    'detail' => $error_message,
                    'status' => $status,
                ],
            ],
        ], self::PRETTYPRINT ? JSON_PRETTY_PRINT : 0), $status, self::SECURITY_HEADERS + [
            'Content-Type' => 'application/json',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, X-Panel-Public-Key, X-Panel-Private-Key, X-Api-Key, X-Api-Secret, X-Panel-User-Uuid',
            'Access-Control-Allow-Credentials' => 'true',
        ]);
    }

    public static function exception(string $message = 'Error', ?string $error = null, array $trace = []): Response
    {
        if ($error instanceof \Exception) {
            $error = $error->getMessage();
        }

        return new Response(json_encode([
            'success' => false,
            'message' => $message,
            'data' => [],
            'error' => $error,
            'error_message' => $error,
            'error_code' => null,
            'errors' => [
                [
                    'code' => 'INTERNAL_SERVER_ERROR',
                    'detail' => $error,
                    'status' => 500,
                ],
            ],
            'trace' => $trace,
        ], self::PRETTYPRINT ? JSON_PRETTY_PRINT : 0), 500, self::SECURITY_HEADERS + [
            'Content-Type' => 'application/json',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, X-Panel-Public-Key, X-Panel-Private-Key, X-Api-Key, X-Api-Secret, X-Panel-User-Uuid',
            'Access-Control-Allow-Credentials' => 'true',
        ]);
    }

    public static function sendManualResponse(array $data, int $status = 200): Response
    {
        $status = self::normalizeStatusForCdnSafeJson($status);

        return new Response(json_encode($data, self::PRETTYPRINT ? JSON_PRETTY_PRINT : 0), $status, self::SECURITY_HEADERS + [
            'Content-Type' => 'application/json',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, X-Panel-Public-Key, X-Panel-Private-Key, X-Api-Key, X-Api-Secret, X-Panel-User-Uuid',
            'Access-Control-Allow-Credentials' => 'true',
        ]);
    }

    /**
     * Some reverse proxies (notably Cloudflare) replace 502 response bodies with HTML error pages,
     * which breaks API clients expecting JSON. Never emit 502 from the panel; use 503 instead.
     */
    private static function normalizeStatusForCdnSafeJson(int $status): int
    {
        return $status === 502 ? 503 : $status;
    }
}
