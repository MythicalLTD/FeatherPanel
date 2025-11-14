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

use App\Chat\User;
use App\Chat\ApiClient;
use App\Helpers\ApiResponse;
use App\CloudFlare\CloudFlareRealIP;
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

            User::updateUser($userInfo['uuid'], ['last_ip' => CloudFlareRealIP::getRealIP()]);
            // Attach user info to the request attributes for downstream use
            $request->attributes->set('user', $userInfo);
            $request->attributes->set('auth_type', 'session');
        } else {
            // Check for Authorization header (Bearer token for API keys)
            $authHeader = $request->headers->get('Authorization');
            if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
                $publicKey = $matches[1];

                // Validate the API client using the public key
                $apiClient = ApiClient::getApiClientByPublicKey($publicKey);
                if ($apiClient == null) {
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

                // Attach user info and API client info to the request attributes
                $request->attributes->set('user', $userInfo);
                $request->attributes->set('api_client', $apiClient);
                $request->attributes->set('auth_type', 'api_key');
            } else {
                return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
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
}
