<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Middleware;

use App\Chat\User;
use App\Chat\ApiClient;
use App\Helpers\ApiResponse;
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
