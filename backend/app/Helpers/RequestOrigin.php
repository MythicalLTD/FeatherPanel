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

use App\App;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Origin handling for browser requests to the API.
 *
 * - Cookie-signed writes (POST/PUT/PATCH/DELETE) must come from the panel's own
 *   host (APP_URL or the host the request was sent to). Requests that carry an
 *   Authorization header, or no Origin/Referer at all (CLI tools, daemons,
 *   server-to-server callbacks), are not affected.
 * - CORS: the panel's own origin is echoed back with credentials; any other
 *   origin keeps the wildcard without credentials.
 */
final class RequestOrigin
{
    public const SESSION_COOKIE = 'remember_token';

    private const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    /**
     * Returns an error response when a cookie-signed write comes from another site, null otherwise.
     */
    public static function guard(Request $request, ?string $appUrl = null): ?Response
    {
        if (!self::needsOriginCheck($request)) {
            return null;
        }

        $source = self::sourceOf($request);
        if ($source === null) {
            return null;
        }

        if (self::matchesPanel($source, $request, $appUrl)) {
            return null;
        }

        return ApiResponse::error(
            'This request must be sent from the panel itself.',
            'ORIGIN_NOT_ALLOWED',
            403
        );
    }

    /**
     * Echo the panel origin with credentials; strip credentials for any other origin.
     */
    public static function applyCors(Request $request, Response $response, ?string $appUrl = null): Response
    {
        if (!$response->headers->has('Access-Control-Allow-Origin')) {
            return $response;
        }

        $origin = trim((string) $request->headers->get('Origin', ''));
        if ($origin !== '' && self::matchesPanel($origin, $request, $appUrl)) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        } else {
            $response->headers->set('Access-Control-Allow-Origin', '*');
            $response->headers->remove('Access-Control-Allow-Credentials');
        }
        $response->setVary(array_values(array_unique(array_merge($response->getVary(), ['Origin']))));

        return $response;
    }

    public static function needsOriginCheck(Request $request): bool
    {
        if (!in_array(strtoupper($request->getMethod()), self::UNSAFE_METHODS, true)) {
            return false;
        }
        if (!str_starts_with($request->getPathInfo(), '/api/')) {
            return false;
        }
        if (!$request->cookies->has(self::SESSION_COOKIE)) {
            return false;
        }

        // A browser can only attach Authorization from the panel's own scripts (cross-site needs a preflight).
        return trim((string) $request->headers->get('Authorization', '')) === '';
    }

    /**
     * Origin header, else Referer. Null when the client sent neither.
     */
    public static function sourceOf(Request $request): ?string
    {
        $origin = $request->headers->get('Origin');
        if (is_string($origin) && trim($origin) !== '') {
            return trim($origin);
        }
        $referer = $request->headers->get('Referer');
        if (is_string($referer) && trim($referer) !== '') {
            return trim($referer);
        }

        return null;
    }

    /**
     * Whether an Origin/Referer value points at the panel: the APP_URL host or the
     * host this request was addressed to. Hostnames are compared (cookies are not port-scoped).
     */
    public static function isPanelOrigin(string $source, Request $request, ?string $appUrl): bool
    {
        if ($source === 'null') {
            return false;
        }
        $host = self::hostOf($source);
        if ($host === null) {
            return false;
        }

        foreach (self::panelHosts($request, $appUrl) as $allowed) {
            if (hash_equals($allowed, $host)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    public static function panelHosts(Request $request, ?string $appUrl): array
    {
        $hosts = [];
        if (is_string($appUrl) && trim($appUrl) !== '') {
            $url = trim($appUrl);
            if (!preg_match('#^[a-z][a-z0-9+.-]*://#i', $url)) {
                $url = 'https://' . ltrim($url, '/');
            }
            $h = self::hostOf($url);
            if ($h !== null) {
                $hosts[] = $h;
            }
        }

        $candidates = [(string) $request->headers->get('Host', '')];
        $forwarded = (string) $request->headers->get('X-Forwarded-Host', '');
        if ($forwarded !== '') {
            $candidates[] = trim(explode(',', $forwarded)[0]);
        }
        foreach ($candidates as $candidate) {
            $h = self::hostOf('http://' . $candidate);
            if ($candidate !== '' && $h !== null) {
                $hosts[] = $h;
            }
        }

        return array_values(array_unique($hosts));
    }

    /** Request host first; APP_URL is only read from config when that does not match. */
    private static function matchesPanel(string $source, Request $request, ?string $appUrl): bool
    {
        if (self::isPanelOrigin($source, $request, $appUrl)) {
            return true;
        }

        return $appUrl === null && self::isPanelOrigin($source, $request, self::configuredAppUrl());
    }

    private static function hostOf(string $url): ?string
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            return null;
        }

        return strtolower(trim($host, '[]'));
    }

    private static function configuredAppUrl(): ?string
    {
        try {
            $url = (string) (App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, '') ?? '');
        } catch (\Throwable) {
            return null;
        }

        return AppUrlHelper::isUnsetOrPlaceholder($url) ? null : $url;
    }
}
