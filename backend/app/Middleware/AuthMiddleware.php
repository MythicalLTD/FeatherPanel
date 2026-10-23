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
use App\Chat\User;
use App\Chat\ApiClient;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Helpers\IpAddressMatcher;
use App\Helpers\UserDeviceTracker;
use App\CloudFlare\CloudFlareRealIP;
use App\Helpers\ApiClientForeignIpNotifier;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        // First try remember token authentication (for web sessions)
        if (isset($_COOKIE['remember_token'])) {
            $userInfo = User::getUserByRememberToken($_COOKIE['remember_token']);
            if ($userInfo == null) {
                return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
            }
            if ($userInfo['banned'] == 'true') {
                return ApiResponse::error('User is banned', 'USER_BANNED');
            }
            if (($userInfo['deleted'] ?? 'false') === 'true') {
                return ApiResponse::error('Account is deleted', 'ACCOUNT_DELETED', 403, []);
            }

            $realIp = CloudFlareRealIP::getRealIP();
            // Avoid a SHOW COLUMNS + UPDATE on every request when the IP has not changed
            if (($userInfo['last_ip'] ?? null) !== $realIp) {
                User::updateUser($userInfo['uuid'], ['last_ip' => $realIp]);
                $userInfo['last_ip'] = $realIp;
            }
            UserDeviceTracker::trackFromRequest($request, $userInfo);
            // Attach user info to the request attributes for downstream use
            $request->attributes->set('user', $userInfo);
            $request->attributes->set('auth_type', 'session');
        } else {
            // Check for Authorization header (Bearer token for API keys)
            $authHeader = $request->headers->get('Authorization');
            if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
                $bearerToken = $matches[1];
                $apiClient = null;

                // Prefer the private key (secret). Public-key Bearer auth remains
                // enabled by default for compatibility with billing/SSO integrations
                // that historically stored the always-visible public_key; operators
                // can harden with `api_clients_allow_public_key_auth=false`.
                $apiClient = ApiClient::getApiClientByPrivateKey($bearerToken);

                if ($apiClient == null && self::publicKeyAuthAllowed()) {
                    $apiClient = ApiClient::getApiClientByPublicKey($bearerToken);
                    if ($apiClient !== null) {
                        App::getInstance(true)->getLogger()->warning(
                            'API client authenticated with its public_key - client: '
                            . ($apiClient['uuid'] ?? $apiClient['id'] ?? 'unknown')
                        );
                    }
                }

                if ($apiClient == null) {
                    // Helpful error when a real public_key was sent but public-key
                    // Bearer auth has been explicitly disabled by the operator.
                    if (
                        !self::publicKeyAuthAllowed()
                        && ApiClient::getApiClientByPublicKey($bearerToken) !== null
                    ) {
                        return ApiResponse::error(
                            'Public API keys cannot be used as Bearer tokens. Use the private key, or set api_clients_allow_public_key_auth=true.',
                            'PUBLIC_API_KEY_NOT_ALLOWED',
                            401,
                            []
                        );
                    }

                    return ApiResponse::error('Invalid API key', 'INVALID_API_KEY', 401, []);
                }

                // Get the user associated with this API client
                $userInfo = User::getUserByUuid($apiClient['user_uuid']);
                if ($userInfo == null) {
                    return ApiResponse::error('API client user not found', 'USER_NOT_FOUND', 404, []);
                }
                if ($userInfo['banned'] == 'true') {
                    return ApiResponse::error('User is banned', 'USER_BANNED');
                }
                if (($userInfo['deleted'] ?? 'false') === 'true') {
                    return ApiResponse::error('Account is deleted', 'ACCOUNT_DELETED', 403, []);
                }

                $clientIp = CloudFlareRealIP::getRealIP();
                $allowedIps = $apiClient['allowed_ips'] ?? null;
                if (
                    $allowedIps !== null && trim((string) $allowedIps) !== ''
                    && !IpAddressMatcher::clientMatchesAllowedList($clientIp, $allowedIps)
                ) {
                    ApiClientForeignIpNotifier::notifyIfEnabled($apiClient, $userInfo, $clientIp);

                    return ApiResponse::error(
                        'This API key cannot be used from your IP address',
                        'API_KEY_IP_NOT_ALLOWED',
                        403,
                        []
                    );
                }

                // Attach user info and API client info to the request attributes
                $request->attributes->set('user', $userInfo);
                $request->attributes->set('api_client', $apiClient);
                $decodedPermissions = null;
                if (array_key_exists('permissions', $apiClient) && $apiClient['permissions'] !== null) {
                    $decoded = json_decode((string) $apiClient['permissions'], true);
                    $decodedPermissions = is_array($decoded) ? $decoded : [];
                }
                $request->attributes->set('api_client_permissions', $decodedPermissions);
                $request->attributes->set('auth_type', 'api_key');
            } else {
                return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
            }
        }

        $user = $request->attributes->get('user');
        if (is_array($user) && isset($user['uuid'])) {
            \App\Telemetry\SentryTelemetry::setUser((string) $user['uuid']);
            // The row was just loaded: permission checks in this request reuse its role.
            \App\Helpers\PermissionHelper::rememberUser($user);

            $maintenance = self::maintenanceResponse($request, $user);
            if ($maintenance !== null) {
                return $maintenance;
            }
        }

        return $next($request);
    }

    /**
     * Get the authenticated user from the request (if available).
     */
    public static function getCurrentUser(Request $request): ?array
    {
        return $request->attributes->get('user');
    }

    /**
     * Get the API client from the request (if authenticated via API key).
     */
    public static function getCurrentApiClient(Request $request): ?array
    {
        return $request->attributes->get('api_client');
    }

    /**
     * Get the authentication type from the request.
     */
    public static function getAuthType(Request $request): ?string
    {
        return $request->attributes->get('auth_type');
    }

    /**
     * Check if the request is authenticated via API key.
     */
    public static function isApiKeyAuth(Request $request): bool
    {
        return $request->attributes->get('auth_type') === 'api_key';
    }

    /**
     * Check if the request is authenticated via session.
     */
    public static function isSessionAuth(Request $request): bool
    {
        return $request->attributes->get('auth_type') === 'session';
    }

    /**
     * Whether an API client may authenticate with its own public_key as Bearer.
     * Defaults to true for compatibility with existing integrations; set
     * `api_clients_allow_public_key_auth=false` to require private keys only.
     */
    private static function publicKeyAuthAllowed(): bool
    {
        try {
            return App::getInstance(true)->getConfig()->getSetting(
                ConfigInterface::API_CLIENTS_ALLOW_PUBLIC_KEY_AUTH,
                'true'
            ) !== 'false';
        } catch (\Throwable $e) {
            // Fail open: matching pre-1.5.0 behaviour if config is unavailable.
            return true;
        }
    }

    /**
     * Maintenance mode: block everyone without admin dashboard access, except the
     * session and auth endpoints the frontend needs to show the notice and log out.
     */
    private static function maintenanceResponse(Request $request, array $user): ?Response
    {
        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::MAINTENANCE_MODE_ENABLED, 'false') !== 'true') {
            return null;
        }
        $path = $request->getPathInfo();
        foreach (['/api/user/session', '/api/user/auth/', '/api/user/status'] as $allowed) {
            if ($path === $allowed || str_starts_with($path, rtrim($allowed, '/') . '/')) {
                return null;
            }
        }
        if (\App\Helpers\PermissionHelper::hasPermission((string) $user['uuid'], \App\Permissions::ADMIN_DASHBOARD_VIEW)) {
            return null;
        }
        $message = trim((string) $config->getSetting(ConfigInterface::MAINTENANCE_MODE_MESSAGE, ''));

        return ApiResponse::error(
            $message !== '' ? $message : 'The panel is under maintenance. Please try again later.',
            'MAINTENANCE_MODE',
            503,
            ['maintenance' => true]
        );
    }
}
