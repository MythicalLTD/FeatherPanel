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
use RateLimit\Rate;
use App\Permissions;
use App\Helpers\ApiResponse;
use App\Helpers\SecurityStore;
use App\Runtime\RequestContext;
use App\Helpers\PermissionHelper;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class RateLimitMiddleware implements MiddlewareInterface
{
    /**
     * Handle the rate limiting middleware.
     *
     * @param Request $request The HTTP request
     * @param callable $next The next middleware/controller in the chain
     *
     * @return Response The HTTP response
     */
    public function handle(Request $request, callable $next): Response
    {
        // Get rate limit configuration from route attributes
        // Note: Route attributes with '_' prefix are stored without the underscore
        $rateLimitConfig = $request->attributes->get('rate_limit');

        // If no rate limit is configured for this route, skip rate limiting
        if (!$rateLimitConfig) {
            return $next($request);
        }

        $app = App::getInstance(true);

        // Get the client IP address (Cloudflare / trusted proxy aware)
        $clientIP = CloudFlareRealIP::getRealIP();

        $rate = $rateLimitConfig['rate'] ?? null;
        $namespace = $rateLimitConfig['namespace'] ?? 'rate_limit';

        // If no rate is configured, skip rate limiting
        if (!$rate instanceof Rate) {
            return $next($request);
        }

        // Authenticated users whose role has `admin.api.bypass_restrictions`
        // are exempt from per-route limits (auth middleware runs first on
        // authenticated routes). Everyone else keeps the configured limits.
        if (self::bypassesRateLimits($request)) {
            return $next($request);
        }

        // One counter per route and caller: signed-in callers are counted per
        // account (shared office/NAT addresses do not throttle each other),
        // guests per client IP. Routes that share a namespace no longer share
        // one counter with different limits.
        $identifier = $rateLimitConfig['identifier'] ?? self::callerIdentifier($request, (string) $clientIP);
        $key = 'rl:' . $namespace . ':' . self::routeKey($request) . ':' . $identifier . ':' . $rate->getInterval();

        try {
            // Redis when available, otherwise the file-backed store, so login/2FA/reset
            // limits keep working during a Redis outage.
            $hit = SecurityStore::hit($key, $rate->getInterval());
        } catch (\Throwable $e) {
            // Log the error but don't block the request if rate limiting fails
            $app->getLogger()->error('Rate limiting error: ' . $e->getMessage());

            return $next($request);
        }

        if ($hit['count'] > $rate->getOperations()) {
            return self::tooManyRequests($app, (string) $clientIP, $hit['ttl'], $rate->getOperations(), $namespace);
        }

        return $next($request);
    }

    /**
     * Who a per-route counter belongs to: the account for signed-in requests, the IP otherwise.
     */
    public static function callerIdentifier(Request $request, string $clientIP): string
    {
        $apiClient = $request->attributes->get('api_client');
        if (is_array($apiClient) && isset($apiClient['id'])) {
            return 'key:' . $apiClient['id'];
        }
        $user = $request->attributes->get('user');
        if (is_array($user) && !empty($user['uuid'])) {
            return 'user:' . $user['uuid'];
        }

        return 'ip:' . $clientIP;
    }

    /**
     * The shared HTTP 429 answer (also used by the panel-wide API limit).
     */
    public static function tooManyRequests(App $app, string $clientIP, ?int $retryAfter, ?int $limit = null, ?string $context = null): Response
    {
        $retryAfter = max(1, $retryAfter ?? 1);
        $app->getLogger()->warning('Rate limit exceeded for IP: ' . $clientIP . ($context !== null ? ' - ' . $context : ''));

        $response = ApiResponse::error(
            'You are being rate limited! Retry after ' . $retryAfter . ' seconds.',
            'RATE_LIMITED',
            429,
            [
                'error_code' => 'RATE_LIMITED',
                'retry_after' => $retryAfter,
            ]
        );
        // Standard header (seconds) so clients can back off without parsing the body.
        $response->headers->set('Retry-After', (string) $retryAfter);
        if ($limit !== null) {
            $response->headers->set('X-RateLimit-Limit', (string) $limit);
            $response->headers->set('X-RateLimit-Remaining', '0');
        }

        return $response;
    }

    private static function routeKey(Request $request): string
    {
        $route = RequestContext::route() ?? $request->getPathInfo();

        return substr(hash('sha256', strtoupper($request->getMethod()) . ' ' . $route), 0, 16);
    }

    private static function bypassesRateLimits(Request $request): bool
    {
        $user = $request->attributes->get('user');
        if (!is_array($user) || !isset($user['uuid'])) {
            return false;
        }

        try {
            return PermissionHelper::hasPermission((string) $user['uuid'], Permissions::ADMIN_API_BYPASS_RESTRICTIONS, $user);
        } catch (\Throwable) {
            return false;
        }
    }
}
