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

namespace App\Observability;

use App\Helpers\ApiResponse;
use App\Helpers\IpAddressMatcher;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Access control for the Prometheus endpoint.
 *
 *  - disabled (default): 404, the endpoint does not exist as far as callers can tell
 *  - auth mode "token": Authorization: Bearer <token> is required (401 otherwise); when an
 *    IP allowlist is set the caller must also match it (403)
 *  - auth mode "ip": only the IP allowlist is checked; an empty allowlist refuses everyone
 *
 * Only a SHA-256 hash of the token is stored; the plaintext is shown once on creation.
 */
final class MetricsAuth
{
    public const TOKEN_PREFIX = 'fpm_';

    public static function check(Request $request): ?Response
    {
        $config = ObservabilityConfig::get();
        if (!$config['metrics_enabled']) {
            return ApiResponse::error('Metrics are disabled', 'METRICS_DISABLED', 404);
        }

        $allowlist = $config['metrics_allowed_ips'];
        $clientIp = (string) CloudFlareRealIP::getRealIP();

        if ($config['metrics_auth_mode'] === 'ip') {
            if (trim($allowlist) === '') {
                return ApiResponse::error('No IP allowlist is configured for metrics', 'METRICS_NOT_CONFIGURED', 403);
            }
            if (!IpAddressMatcher::clientMatchesAllowedList($clientIp, $allowlist)) {
                return ApiResponse::error('This address may not read metrics', 'METRICS_IP_NOT_ALLOWED', 403);
            }

            return null;
        }

        if ($config['metrics_token_hash'] === '') {
            return ApiResponse::error('No metrics token has been generated yet', 'METRICS_NOT_CONFIGURED', 403);
        }

        $provided = self::bearerToken($request);
        if ($provided === null || !self::tokenMatches($provided, $config['metrics_token_hash'])) {
            $response = ApiResponse::error('A valid metrics bearer token is required', 'METRICS_UNAUTHORIZED', 401);
            $response->headers->set('WWW-Authenticate', 'Bearer realm="featherpanel-metrics"');

            return $response;
        }

        if (trim($allowlist) !== '' && !IpAddressMatcher::clientMatchesAllowedList($clientIp, $allowlist)) {
            return ApiResponse::error('This address may not read metrics', 'METRICS_IP_NOT_ALLOWED', 403);
        }

        return null;
    }

    public static function bearerToken(Request $request): ?string
    {
        $header = (string) $request->headers->get('Authorization', '');
        if (preg_match('/^Bearer\s+(\S+)$/i', trim($header), $m) !== 1) {
            return null;
        }

        return $m[1];
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function tokenMatches(string $provided, string $storedHash): bool
    {
        return $storedHash !== '' && hash_equals($storedHash, self::hashToken($provided));
    }

    public static function generateToken(): string
    {
        return self::TOKEN_PREFIX . bin2hex(random_bytes(24));
    }
}
