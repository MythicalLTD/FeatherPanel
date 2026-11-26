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
use App\Helpers\SecurityStore;
use App\Runtime\RequestContext;
use App\Helpers\RateLimitConfig;
use App\Helpers\PermissionHelper;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Panel-wide API request budget, on top of the per-route limits.
 *
 * Signed-in requests (browser session or API key) are counted per account /
 * per API key, guest requests per client IP. Both budgets show up in Admin →
 * Rate limits as `global-api-user` and `global-api-guest` and can be changed
 * or switched off there like any route limit.
 *
 * Never counted: Wings and FeatherQuilld daemon callbacks, webhooks, health
 * probes and the metrics endpoint, CORS preflights, the public bootstrap
 * endpoints the frontend server renders with (settings, translations, plugin
 * assets) and loopback callers (the Next.js server talking to the backend).
 */
class ApiRateLimitMiddleware implements MiddlewareInterface
{
    public const USER_ROUTE = 'global-api-user';
    public const GUEST_ROUTE = 'global-api-guest';
    public const NAMESPACE = 'global-api';

    /** Requests per minute for one account or API key. */
    public const DEFAULT_USER_PER_MINUTE = 1200;
    /** Requests per minute for one guest IP. */
    public const DEFAULT_GUEST_PER_MINUTE = 300;

    private const EXEMPT_PREFIXES = [
        '/api/wings/',
        '/api/remote/',
        '/api/quilld-remote/',
        '/api/webhooks/',
        '/api/health/',
        '/api/system/',
        '/api/manifest.webmanifest',
    ];

    private const EXEMPT_MIDDLEWARE = [
        WingsMiddleware::class,
        FeatherQuilldMiddleware::class,
    ];

    private static bool $defaultsEnsured = false;

    /**
     * Put the budget check into a route's middleware stack: right after
     * AuthMiddleware on signed-in routes (so the account is known), first
     * otherwise. Exempt routes get their stack back unchanged.
     *
     * @param list<object|callable> $stack
     *
     * @return list<object|callable>
     */
    public static function apply(array $stack, Request $request): array
    {
        if (self::isExempt($request, $stack)) {
            return $stack;
        }

        foreach ($stack as $index => $middleware) {
            if ($middleware instanceof AuthMiddleware) {
                array_splice($stack, $index + 1, 0, [new self()]);

                return $stack;
            }
        }
        array_unshift($stack, new self());

        return $stack;
    }

    public function handle(Request $request, callable $next): Response
    {
        $user = $request->attributes->get('user');
        $signedIn = is_array($user) && !empty($user['uuid']);
        $clientIp = (string) CloudFlareRealIP::getRealIP();

        if (!$signedIn && self::isLoopback($clientIp)) {
            return $next($request);
        }

        $limit = self::limitFor($signedIn ? self::USER_ROUTE : self::GUEST_ROUTE);
        if ($limit === null) {
            return $next($request);
        }

        if ($signedIn && self::bypasses($user)) {
            return $next($request);
        }

        $identifier = RateLimitMiddleware::callerIdentifier($request, $clientIp);
        $rate = $limit['rate'];
        $key = 'rl:' . self::NAMESPACE . ':' . $identifier . ':' . $rate->getInterval();

        try {
            $hit = SecurityStore::hit($key, $rate->getInterval());
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Global rate limiting error: ' . $e->getMessage());

            return $next($request);
        }

        if ($hit['count'] > $rate->getOperations()) {
            return RateLimitMiddleware::tooManyRequests(App::getInstance(true), $clientIp, $hit['ttl'], $rate->getOperations(), self::NAMESPACE);
        }

        return $next($request);
    }

    /**
     * @param list<object|callable> $stack
     */
    public static function isExempt(Request $request, array $stack): bool
    {
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            return true;
        }
        $path = $request->getPathInfo();
        foreach (self::EXEMPT_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }
        // Payment / git / addon webhooks are called by outside services in bursts.
        // Match the route template, not the raw path, so a caller-chosen path
        // segment such as `/webhook` cannot opt a normal route out of the budget.
        $template = RequestContext::route();
        // Admin pages that manage outgoing webhooks are normal routes and stay counted.
        if ($template !== null && str_contains(strtolower($template), '/webhook') && !str_starts_with($template, '/api/admin/')) {
            return true;
        }
        foreach ($stack as $middleware) {
            foreach (self::EXEMPT_MIDDLEWARE as $class) {
                if ($middleware instanceof $class) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @return array{rate: Rate, namespace: string}|null
     */
    private static function limitFor(string $route): ?array
    {
        $default = $route === self::USER_ROUTE
            ? Rate::perMinute(self::DEFAULT_USER_PER_MINUTE)
            : Rate::perMinute(self::DEFAULT_GUEST_PER_MINUTE);

        if (!self::$defaultsEnsured) {
            self::$defaultsEnsured = true;
            self::ensureListed();
        }

        return RateLimitConfig::getRateLimit($route, $default, self::NAMESPACE);
    }

    /** Write both budgets into ratelimit.json once, so admins see and can edit them. */
    private static function ensureListed(): void
    {
        $path = RateLimitConfig::getConfigPath();
        if (file_exists($path) ? !is_writable($path) : !is_writable(dirname($path))) {
            return;
        }
        $missing = [];
        foreach ([self::USER_ROUTE => self::DEFAULT_USER_PER_MINUTE, self::GUEST_ROUTE => self::DEFAULT_GUEST_PER_MINUTE] as $route => $perMinute) {
            if (!RateLimitConfig::routeExistsInConfig($route)) {
                $missing[$route] = $perMinute;
            }
        }
        foreach ($missing as $route => $perMinute) {
            try {
                RateLimitConfig::updateRouteConfig($route, ['per_minute' => $perMinute, 'namespace' => self::NAMESPACE]);
            } catch (\Throwable) {
                // Not writable: the code default still applies.
            }
        }
        if ($missing !== []) {
            RateLimitConfig::reloadConfig();
        }
    }

    private static function bypasses(array $user): bool
    {
        try {
            return PermissionHelper::hasPermission((string) $user['uuid'], Permissions::ADMIN_API_BYPASS_RESTRICTIONS, $user);
        } catch (\Throwable) {
            return false;
        }
    }

    private static function isLoopback(string $ip): bool
    {
        return $ip === '::1' || str_starts_with($ip, '127.');
    }
}
