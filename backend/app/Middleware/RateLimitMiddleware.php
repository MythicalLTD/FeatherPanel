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
use RateLimit\RedisRateLimiter;
use App\Helpers\FileRateLimiter;
use App\Helpers\PermissionHelper;
use App\CloudFlare\CloudFlareRealIP;
use RateLimit\Exception\LimitExceeded;
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

        // Get the App instance to access Redis connection
        $app = App::getInstance(true);
        $redisConnection = $app->getRedisConnection();

        // Get the client IP address
        $clientIP = CloudFlareRealIP::getRealIP();

        // Get rate limit configuration
        $rate = $rateLimitConfig['rate'] ?? null;
        $identifier = $rateLimitConfig['identifier'] ?? $clientIP;
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

        // Without a reachable Redis the counter used to be skipped entirely,
        // which left login/2FA/reset limits inactive during a Redis outage.
        // The file-backed limiter keeps those counters working instead.
        if (!$redisConnection) {
            if (!(new FileRateLimiter($rate, $namespace))->limit($identifier)) {
                return self::tooManyRequests($app, $clientIP, $rate->getInterval());
            }

            return $next($request);
        }

        try {
            // Create a rate limiter with the configured rate
            $limiter = new RedisRateLimiter($rate, $redisConnection, $namespace);

            // Apply rate limit
            $limiter->limit($identifier);
        } catch (LimitExceeded $e) {
            // The retry-after value is in the LimitExceeded exception
            // The limiter does not expose the remaining window; the rate's interval is a safe upper bound.
            $retryAfter = method_exists($e, 'getRetryAfter') ? $e->getRetryAfter() : $rate->getInterval();

            return self::tooManyRequests($app, $clientIP, $retryAfter, $e->getMessage());
        } catch (\Exception $e) {
            // Log the error but don't block the request if rate limiting fails
            $app->getLogger()->error('Rate limiting error: ' . $e->getMessage());

            // Continue to the next middleware/controller
            return $next($request);
        }

        return $next($request);
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

    /**
     * The shared HTTP 429 answer for both limiter backends (same payload as before).
     */
    private static function tooManyRequests(App $app, string $clientIP, ?int $retryAfter, ?string $context = null): Response
    {
        $app->getLogger()->warning('Rate limit exceeded for IP: ' . $clientIP . ($context !== null ? ' - ' . $context : ''));

        $response = ApiResponse::error(
            $retryAfter !== null
                ? 'You are being rate limited! Retry after ' . max(1, $retryAfter) . ' seconds.'
                : 'You are being rate limited! Please try again in a few seconds.',
            'RATE_LIMITED',
            429,
            [
                'error_code' => 'RATE_LIMITED',
                'retry_after' => $retryAfter,
            ]
        );
        // Standard header (seconds) so clients can back off without parsing the body.
        $response->headers->set('Retry-After', (string) max(1, $retryAfter ?? 1));

        return $response;
    }
}
