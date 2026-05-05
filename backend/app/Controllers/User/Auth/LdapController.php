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

namespace App\Controllers\User\Auth;

use App\App;
use App\Chat\User;
use App\Chat\LdapProvider;
use App\Helpers\ApiResponse;
use App\Helpers\LdapAuthenticator;
use App\CloudFlare\CloudFlareRealIP;
use App\CloudFlare\CloudFlareTurnstile;
use App\Config\ConfigInterface;
use App\Plugins\Events\Events\AuthEvent;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
	schema: 'LdapLoginRequest',
	type: 'object',
	required: ['provider_uuid', 'username', 'password'],
	properties: [
		new OA\Property(property: 'provider_uuid', type: 'string', description: 'LDAP provider UUID'),
		new OA\Property(property: 'username', type: 'string', minLength: 1, maxLength: 255, description: 'LDAP username'),
		new OA\Property(property: 'password', type: 'string', minLength: 1, maxLength: 255, description: 'LDAP password'),
		new OA\Property(property: 'turnstile_token', type: 'string', description: 'CloudFlare Turnstile token (required if Turnstile is enabled)'),
	]
)]
class LdapController
{
	#[OA\Put(
		path: '/api/user/auth/ldap/login',
		summary: 'Login via LDAP',
		description: 'Authenticate user against LDAP directory. Supports auto-provisioning if enabled.',
		tags: ['User - Authentication'],
		requestBody: new OA\RequestBody(
			required: true,
			content: new OA\JsonContent(ref: '#/components/schemas/LdapLoginRequest')
		),
		responses: [
			new OA\Response(
				response: 200,
				description: 'User logged in successfully',
				content: new OA\JsonContent(ref: '#/components/schemas/LoginResponse')
			),
			new OA\Response(response: 400, description: 'Bad request - Missing required fields or invalid data'),
			new OA\Response(response: 401, description: 'Unauthorized - Invalid credentials or LDAP authentication failed'),
			new OA\Response(response: 403, description: 'Forbidden - Provider disabled or auto-provisioning disabled'),
			new OA\Response(response: 404, description: 'Not found - Provider not found'),
			new OA\Response(response: 500, description: 'Internal server error'),
		]
	)]
	public function login(Request $request): Response
	{
		$app = App::getInstance(true);
		$config = $app->getConfig();
		$data = json_decode($request->getContent(), true);

		// Turnstile validation
		if ($config->getSetting(ConfigInterface::TURNSTILE_ENABLED, 'false') == 'true') {
			$turnstileKeyPublic = $config->getSetting(ConfigInterface::TURNSTILE_KEY_PUB, 'NULL');
			$turnstileKeySecret = $config->getSetting(ConfigInterface::TURNSTILE_KEY_PRIV, 'NULL');
			if ($turnstileKeyPublic == 'NULL' || $turnstileKeySecret == 'NULL') {
				return ApiResponse::error('Turnstile keys are not set', 'TURNSTILE_KEYS_NOT_SET');
			}
			if (!isset($data['turnstile_token']) || trim($data['turnstile_token']) === '') {
				return ApiResponse::error('Turnstile token is required', 'TURNSTILE_TOKEN_REQUIRED');
			}
			if (!CloudFlareTurnstile::validate($data['turnstile_token'], CloudFlareRealIP::getRealIP(), $turnstileKeySecret)) {
				return ApiResponse::error('Turnstile validation failed', 'TURNSTILE_VALIDATION_FAILED');
			}
		}

		// Validate required fields
		if (!isset($data['provider_uuid']) || !isset($data['username']) || !isset($data['password'])) {
			$missingFields = [];
			if (!isset($data['provider_uuid'])) {
				$missingFields[] = 'provider_uuid';
			}
			if (!isset($data['username'])) {
				$missingFields[] = 'username';
			}
			if (!isset($data['password'])) {
				$missingFields[] = 'password';
			}
			return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
		}

		$providerUuid = trim($data['provider_uuid']);
		$username = trim($data['username']);
		$password = $data['password']; // Don't trim password

		// Validate data
		if (empty($providerUuid) || empty($username) || empty($password)) {
			return ApiResponse::error('Provider UUID, username, and password cannot be empty', 'INVALID_DATA');
		}

		// Get LDAP provider
		$provider = LdapProvider::getProviderByUuid($providerUuid);
		if (!$provider) {
			return ApiResponse::error('LDAP provider not found', 'PROVIDER_NOT_FOUND', 404);
		}

		if (($provider['enabled'] ?? 'false') !== 'true') {
			return ApiResponse::error('LDAP provider is disabled', 'PROVIDER_DISABLED', 403);
		}

		// Authenticate against LDAP
		$ldap = new LdapAuthenticator($provider);
		$ldapUser = $ldap->authenticate($username, $password);

		if (!$ldapUser) {
			// Emit login failed event
			global $eventManager;
			if (isset($eventManager) && $eventManager !== null) {
				$eventManager->emit(
					AuthEvent::onAuthLoginFailed(),
					[
						'username' => $username,
						'provider' => $provider['name'],
						'reason' => 'LDAP_AUTH_FAILED',
						'error' => $ldap->getLastError(),
						'ip_address' => CloudFlareRealIP::getRealIP(),
					]
				);
			}

			return ApiResponse::error(
				'LDAP authentication failed: ' . ($ldap->getLastError() ?? 'Unknown error'),
				'LDAP_AUTH_FAILED',
				401
			);
		}

		// Check if user exists in database
		$userInfo = User::getUserByLdapProviderAndDn($providerUuid, $ldapUser['dn']);

		if (!$userInfo) {
			// Auto-provision user if enabled
			if (($provider['auto_provision'] ?? 'false') !== 'true') {
				return ApiResponse::error(
					'User not found and auto-provisioning is disabled',
					'USER_NOT_FOUND_NO_AUTO_PROVISION',
					403
				);
			}

			// Create new user
			$userInfo = $this->provisionUser($ldapUser, $provider);
			if (!$userInfo) {
				return ApiResponse::error('Failed to provision user', 'USER_PROVISION_FAILED', 500);
			}
		} else {
			// Sync attributes if enabled
			if (($provider['sync_attributes'] ?? 'false') === 'true') {
				$this->syncUserAttributes($userInfo, $ldapUser);
			}
		}

		// Check if user is banned
		if ($userInfo['banned'] == 'true') {
			global $eventManager;
			if (isset($eventManager) && $eventManager !== null) {
				$eventManager->emit(
					AuthEvent::onAuthLoginFailed(),
					[
						'user' => $userInfo,
						'reason' => 'USER_BANNED',
						'ip_address' => CloudFlareRealIP::getRealIP(),
					]
				);
			}

			return ApiResponse::error('User is banned', 'USER_BANNED', 401);
		}

		// Complete login using the shared method from LoginController
		$loginController = new LoginController();
		return $loginController->completeLogin($userInfo);
	}

	/**
	 * Provision a new user from LDAP data.
	 */
	private function provisionUser(array $ldapUser, array $provider): ?array
	{
		$app = App::getInstance(true);
		$logger = $app->getLogger();

		try {
			if (empty($ldapUser['email'])) {
				$logger->error('LDAP: User provisioning failed - no email address. DN: ' . ($ldapUser['dn'] ?? 'unknown') . ', Username: ' . ($ldapUser['username'] ?? 'unknown') . ', Provider: ' . ($provider['name'] ?? 'unknown') . '. Enable "Generate Email if Missing" option in LDAP provider settings.');
				return null;
			}

			// Check if email already exists
			$existingUser = User::getUserByEmail($ldapUser['email']);
			if ($existingUser) {
				$logger->info('LDAP: Linking existing user to LDAP provider. User UUID: ' . $existingUser['uuid'] . ', Email: ' . $ldapUser['email'] . ', DN: ' . $ldapUser['dn'] . ', Provider: ' . $provider['name']);

				// Link existing user to LDAP
				User::updateUser($existingUser['uuid'], [
					'ldap_provider_uuid' => $provider['uuid'],
					'ldap_dn' => $ldapUser['dn'],
				]);
				return User::getUserByUuid($existingUser['uuid']);
			}

			// Generate username if not provided
			$username = $ldapUser['username'] ?? explode('@', $ldapUser['email'])[0];

			// Ensure username is unique
			$baseUsername = $username;
			$counter = 1;
			while (User::getUserByUsername($username)) {
				$username = $baseUsername . $counter;
				$counter++;
			}

			// Create user - first_name and last_name are REQUIRED by User::createUser
			$uuid = User::generateUuid();
			$userData = [
				'uuid' => $uuid,
				'username' => $username,
				'email' => $ldapUser['email'],
				'password' => password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT), // Random password (won't be used)
				'remember_token' => bin2hex(random_bytes(32)),
				'first_name' => $ldapUser['first_name'] ?? $username, // Default to username if not provided
				'last_name' => $ldapUser['last_name'] ?? 'User', // Default to 'User' if not provided
				'ldap_provider_uuid' => $provider['uuid'],
				'ldap_dn' => $ldapUser['dn'],
				'banned' => 'false',
				'two_fa_enabled' => 'false',
			];

			$logger->info('LDAP: Creating new user from LDAP authentication. Username: ' . $username . ', Email: ' . $ldapUser['email'] . ', DN: ' . $ldapUser['dn'] . ', Provider: ' . $provider['name']);

			$userId = User::createUser($userData);
			if (!$userId) {
				$logger->error('LDAP: User creation failed - database insert returned false. Username: ' . $username . ', Email: ' . $ldapUser['email'] . ', DN: ' . $ldapUser['dn']);
				return null;
			}

			$logger->info('LDAP: User provisioned successfully. User ID: ' . $userId . ', UUID: ' . $uuid . ', Username: ' . $username . ', Email: ' . $ldapUser['email']);

			return User::getUserByUuid($uuid);
		} catch (\Exception $e) {
			$logger->error('LDAP: User provisioning exception - ' . $e->getMessage() . '. DN: ' . ($ldapUser['dn'] ?? 'unknown') . ', Email: ' . ($ldapUser['email'] ?? 'unknown'));
			return null;
		}
	}

	/**
	 * Sync user attributes from LDAP.
	 */
	private function syncUserAttributes(array $userInfo, array $ldapUser): void
	{
		$updates = [];

		if (!empty($ldapUser['email']) && $ldapUser['email'] !== $userInfo['email']) {
			// Only update email if it's not already taken by another user
			$existingUser = User::getUserByEmail($ldapUser['email']);
			if (!$existingUser || $existingUser['uuid'] === $userInfo['uuid']) {
				$updates['email'] = $ldapUser['email'];
			}
		}

		if (!empty($ldapUser['first_name']) && $ldapUser['first_name'] !== ($userInfo['first_name'] ?? null)) {
			$updates['first_name'] = $ldapUser['first_name'];
		}

		if (!empty($ldapUser['last_name']) && $ldapUser['last_name'] !== ($userInfo['last_name'] ?? null)) {
			$updates['last_name'] = $ldapUser['last_name'];
		}

		if (!empty($updates)) {
			User::updateUser($userInfo['uuid'], $updates);
		}
	}
}
