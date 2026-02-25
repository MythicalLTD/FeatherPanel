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
use App\Chat\Activity;
use App\Chat\SsoToken;
use App\Chat\UserPreference;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use App\CloudFlare\CloudFlareTurnstile;
use App\Plugins\Events\Events\AuthEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'LoginRequest',
    type: 'object',
    required: ['username_or_email', 'password'],
    properties: [
        new OA\Property(property: 'username_or_email', type: 'string', minLength: 3, maxLength: 255, description: 'User email address or username'),
        new OA\Property(property: 'password', type: 'string', minLength: 8, maxLength: 255, description: 'User password'),
        new OA\Property(property: 'turnstile_token', type: 'string', description: 'CloudFlare Turnstile token (required if Turnstile is enabled)'),
    ]
)]
#[OA\Schema(
    schema: 'LoginResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'user', type: 'object', description: 'User information'),
        new OA\Property(property: 'preferences', type: 'object', description: 'User preferences'),
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
    ]
)]
#[OA\Schema(
    schema: 'TwoFactorRequiredResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'email', type: 'string', description: 'User email address'),
        new OA\Property(property: 'message', type: 'string', description: '2FA required message'),
    ]
)]
class LoginController
{
    #[OA\Put(
        path: '/api/user/auth/login',
        summary: 'Login user',
        description: 'Authenticate user with username or email and password. Includes CloudFlare Turnstile validation if enabled. Returns 2FA requirement if enabled.',
        tags: ['User - Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/LoginRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'User logged in successfully or two-factor authentication required',
                content: new OA\JsonContent(
                    oneOf: [
                        new OA\Schema(ref: '#/components/schemas/LoginResponse'),
                        new OA\Schema(ref: '#/components/schemas/TwoFactorRequiredResponse'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid username or email format, Turnstile validation failed, or Turnstile keys not set'),
            new OA\Response(response: 401, description: 'Unauthorized - Username or email does not exist, user is banned, or invalid password'),
            new OA\Response(response: 500, description: 'Internal server error - Remember token not set'),
        ]
    )]
    public function put(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();
        $data = json_decode($request->getContent(), true);

        // Handle Discord OAuth login
        $discordToken = $data['discord_token'] ?? null;
        if ($discordToken) {
            $discordController = new DiscordController();
            $userInfo = $discordController->authenticateWithToken($discordToken);

            if (!$userInfo) {
                return ApiResponse::error('Invalid or expired Discord token', 'INVALID_DISCORD_TOKEN', 400);
            }

            // Use existing login flow to set session and return user data
            return $this->completeLogin($userInfo);
        }

        // Handle SSO token login
        $ssoToken = $data['sso_token'] ?? null;
        if ($ssoToken) {
            $record = SsoToken::getValidToken($ssoToken);
            if ($record === null || !isset($record['user_uuid'])) {
                return ApiResponse::error('Invalid or expired SSO token', 'INVALID_SSO_TOKEN', 400);
            }

            // Single-use token: mark as used
            SsoToken::markTokenUsed((int) $record['id']);

            $userInfo = User::getUserByUuid($record['user_uuid']);
            if (!$userInfo) {
                return ApiResponse::error('User not found for SSO token', 'SSO_USER_NOT_FOUND', 404);
            }

            return $this->completeLogin($userInfo);
        }

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

        // Validate required fields - support both 'email' (legacy) and 'username_or_email'
        $usernameOrEmail = $data['username_or_email'] ?? $data['email'] ?? null;
        if (!$usernameOrEmail || !isset($data['password'])) {
            $missingFields = [];
            if (!$usernameOrEmail) {
                $missingFields[] = 'username_or_email';
            }
            if (!isset($data['password'])) {
                $missingFields[] = 'password';
            }
            if (!empty($missingFields)) {
                return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
            }
        }

        // Validate data types
        if (!is_string($usernameOrEmail)) {
            return ApiResponse::error('Username or email must be a string', 'INVALID_DATA_TYPE');
        }
        if (!is_string($data['password'])) {
            return ApiResponse::error('Password must be a string', 'INVALID_DATA_TYPE');
        }

        $usernameOrEmail = trim($usernameOrEmail);
        $data['password'] = trim($data['password']);

        // Validate data length
        if (strlen($usernameOrEmail) < 3) {
            return ApiResponse::error('Username or email must be at least 3 characters long', 'INVALID_DATA_LENGTH');
        }
        if (strlen($usernameOrEmail) > 255) {
            return ApiResponse::error('Username or email must be less than 255 characters long', 'INVALID_DATA_LENGTH');
        }
        if (strlen($data['password']) < 8) {
            return ApiResponse::error('Password must be at least 8 characters long', 'INVALID_DATA_LENGTH');
        }
        if (strlen($data['password']) > 255) {
            return ApiResponse::error('Password must be less than 255 characters long', 'INVALID_DATA_LENGTH');
        }

        // Validate format - must be either valid email or valid username
        $isEmail = filter_var($usernameOrEmail, FILTER_VALIDATE_EMAIL);
        $isUsername = preg_match('/^[a-zA-Z0-9_]+$/', $usernameOrEmail);
        if (!$isEmail && !$isUsername) {
            return ApiResponse::error('Invalid username or email address format', 'INVALID_USERNAME_OR_EMAIL');
        }

        // Try to get user by email first, then by username
        $userInfo = null;
        if ($isEmail) {
            $userInfo = User::getUserByEmail($usernameOrEmail);
        }
        if ($userInfo == null) {
            $userInfo = User::getUserByUsername($usernameOrEmail);
        }
        if ($userInfo == null) {
            // Emit login failed event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    AuthEvent::onAuthLoginFailed(),
                    [
                        'username_or_email' => $usernameOrEmail,
                        'reason' => 'USER_NOT_FOUND',
                        'ip_address' => CloudFlareRealIP::getRealIP(),
                    ]
                );
            }

            return ApiResponse::error('Invalid username or email address', 'INVALID_USERNAME_OR_EMAIL');
        }
        if ($userInfo['banned'] == 'true') {
            // Emit login failed event
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

            return ApiResponse::error('User is banned', 'USER_BANNED');
        }

        // When OIDC has disabled local login, only allow local login for admins (before password check to avoid leaking valid-credential signal)
        if ($config->getSetting(ConfigInterface::OIDC_DISABLE_LOCAL_LOGIN, 'false') === 'true') {
            if (!\App\Helpers\PermissionHelper::hasPermission($userInfo['uuid'], \App\Permissions::ADMIN_ROOT)) {
                return ApiResponse::error('Local login is disabled', 'LOCAL_LOGIN_DISABLED', 403);
            }
        }

        if (!password_verify($data['password'], $userInfo['password'])) {
            // Emit login failed event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    AuthEvent::onAuthLoginFailed(),
                    [
                        'user' => $userInfo,
                        'reason' => 'INVALID_PASSWORD',
                        'ip_address' => CloudFlareRealIP::getRealIP(),
                    ]
                );
            }

            return ApiResponse::error('Invalid password', 'INVALID_PASSWORD');
        }

        // 2FA logic
        if (isset($userInfo['two_fa_enabled']) && $userInfo['two_fa_enabled'] == 'true') {
            // Do NOT set session/cookie yet
            return ApiResponse::error('2FA required', 'TWO_FACTOR_REQUIRED', 401, [
                'email' => $userInfo['email'],
            ]);
        }

        // Use the common login completion method
        return $this->completeLogin($userInfo);
    }

    /**
     * Complete login process - set session, log activity, emit event, and return user data.
     *
     * This method is public so that other authentication flows (e.g. OAuth/OIDC)
     * can reuse the same session and activity logic.
     */
    public function completeLogin(array $userInfo): Response
    {
        $app = App::getInstance(true);
        // Set session/cookie and log in
        if (isset($userInfo['remember_token'])) {
            $token = $userInfo['remember_token'];
            setcookie('remember_token', $token, time() + 60 * 60 * 24 * 30, '/');
            User::updateUser($userInfo['uuid'], ['last_ip' => CloudFlareRealIP::getRealIP()]);

            Activity::createActivity([
                'user_uuid' => $userInfo['uuid'],
                'name' => 'login',
                'context' => 'User logged in',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    AuthEvent::onAuthLoginSuccess(),
                    [
                        'user' => $userInfo,
                    ]
                );
            }

            // Unset stuff thats dangerous
            unset($userInfo['password']);

            if ($app->isDemoMode()) {
                $userInfo['first_ip'] = $app->getIPIntoFBIFormat();
                $userInfo['last_ip'] = $app->getIPIntoFBIFormat();
            }

            // Load user preferences
            $preferences = UserPreference::getPreferences($userInfo['uuid']);

            return ApiResponse::success([
                'user' => $userInfo,
                'preferences' => $preferences,
            ], 'User logged in successfully', 200);
        }

        return ApiResponse::error('Remember token not set', 'REMEMBER_TOKEN_NOT_SET');
    }
}
