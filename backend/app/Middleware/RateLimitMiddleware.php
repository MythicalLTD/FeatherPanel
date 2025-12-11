<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
use RateLimit\Rate;
use App\Helpers\ApiResponse;
use RateLimit\RedisRateLimiter;
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

        // If Redis is not available, skip rate limiting
        if (!$redisConnection) {
            return $next($request);
        }

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

        try {
            // Create a rate limiter with the configured rate
            $limiter = new RedisRateLimiter($rate, $redisConnection, $namespace);

            // Apply rate limit
            $limiter->limit($identifier);
        } catch (LimitExceeded $e) {
            $app->getLogger()->warning('Rate limit exceeded for IP: ' . $clientIP . ' - ' . $e->getMessage());

            // The retry-after value is in the LimitExceeded exception
            $retryAfter = method_exists($e, 'getRetryAfter') ? $e->getRetryAfter() : null;

            return ApiResponse::error(
                'You are being rate limited! Retry after ' . ($retryAfter !== null ? $retryAfter : 'a few') . ' minutes or try again later.',
                'RATE_LIMITED',
                429,
                [
                    'error_code' => 'RATE_LIMITED',
                    'retry_after' => $retryAfter,
                ]
            );
        } catch (\Exception $e) {
            // Log the error but don't block the request if rate limiting fails
            $app->getLogger()->error('Rate limiting error: ' . $e->getMessage());

            // Continue to the next middleware/controller
            return $next($request);
        }

        return $next($request);
    }
}
