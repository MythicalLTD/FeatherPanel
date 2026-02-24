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
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use PragmaRX\Google2FA\Google2FA;
use App\CloudFlare\CloudFlareRealIP;
use App\CloudFlare\CloudFlareTurnstile;
use App\Plugins\Events\Events\AuthEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'TwoFactorEnableRequest',
    type: 'object',
    required: ['code', 'secret'],
    properties: [
        new OA\Property(property: 'code', type: 'string', minLength: 6, maxLength: 6, description: '6-digit TOTP code'),
        new OA\Property(property: 'secret', type: 'string', minLength: 16, maxLength: 16, description: '16-character secret key'),
        new OA\Property(property: 'turnstile_token', type: 'string', description: 'CloudFlare Turnstile token (required if Turnstile is enabled)'),
    ]
)]
#[OA\Schema(
    schema: 'TwoFactorEnableResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'user', type: 'object', description: 'User information'),
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
    ]
)]
#[OA\Schema(
    schema: 'TwoFactorSetupResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'qr_code_url', type: 'string', description: 'QR code URL for authenticator app'),
        new OA\Property(property: 'secret', type: 'string', description: 'Secret key for manual entry'),
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
    ]
)]
#[OA\Schema(
    schema: 'TwoFactorVerifyRequest',
    type: 'object',
    required: ['email', 'code'],
    properties: [
        new OA\Property(property: 'email', type: 'string', format: 'email', description: 'User email address'),
        new OA\Property(property: 'code', type: 'string', minLength: 6, maxLength: 6, description: '6-digit TOTP code'),
    ]
)]
#[OA\Schema(
    schema: 'TwoFactorVerifyResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'user', type: 'object', description: 'User information'),
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
    ]
)]
class TwoFactorController
{
    #[OA\Put(
        path: '/api/user/auth/two-factor',
        summary: 'Enable two-factor authentication',
        description: 'Enable two-factor authentication for the authenticated user using TOTP code verification. Includes CloudFlare Turnstile validation if enabled.',
        tags: ['User - Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/TwoFactorEnableRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Two-factor authentication enabled successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/TwoFactorEnableResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid code length, Turnstile validation failed, or Turnstile keys not set'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid TOTP code or user is banned'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to enable 2FA'),
        ]
    )]
    public function put(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();
        $data = json_decode($request->getContent(), true);
        if ($app->isDemoMode()) {
            return ApiResponse::error('Demo mode is enabled', 'DEMO_MODE_ENABLED');
        }
        global $eventManager;
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
        $requiredFields = ['code', 'secret'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }
        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
        }

        // Validate data types and format
        foreach (['code', 'secret'] as $field) {
            if (!is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE');
            }
            $data[$field] = trim($data[$field]);
        }

        // Validate data length
        $lengthRules = [
            'code' => [6, 6],
            'secret' => [16, 16],
        ];
        foreach ($lengthRules as $field => [$min, $max]) {
            $len = strlen($data[$field]);
            if ($len < $min) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $min characters long", 'INVALID_DATA_LENGTH');
            }
            if ($len > $max) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $max characters long", 'INVALID_DATA_LENGTH');
            }
        }

        $userInfo = User::getUserByRememberToken($_COOKIE['remember_token']);

        // Verify code
        $google2fa = new Google2FA();
        if (!$google2fa->verifyKey($data['secret'], $data['code'])) {
            return ApiResponse::error('Invalid code', 'INVALID_CODE');
        }
        if ($userInfo['banned'] == 'true') {
            return ApiResponse::error('User is banned', 'USER_BANNED');
        }

        User::updateUser($userInfo['uuid'], ['last_ip' => CloudFlareRealIP::getRealIP(), 'two_fa_enabled' => 'true', 'two_fa_key' => $data['secret']]);

        Activity::createActivity([
            'user_uuid' => $userInfo['uuid'],
            'name' => 'two_fa_enabled',
            'context' => '2FA enabled',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                AuthEvent::onAuth2FAEnabled(),
                [
                    'user' => $userInfo,
                ]
            );
        }

        return ApiResponse::success($userInfo, 'Two factor authentication enabled', 200);
    }

    #[OA\Get(
        path: '/api/user/auth/two-factor',
        summary: 'Get two-factor setup',
        description: 'Get QR code URL and secret key for setting up two-factor authentication with an authenticator app.',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Two-factor setup information retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/TwoFactorSetupResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Two-factor authentication already enabled'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to generate setup information'),
        ]
    )]
    public function get(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();
        $data = json_decode($request->getContent(), true);
        $userInfo = User::getUserByRememberToken($_COOKIE['remember_token']);

        if ($userInfo['two_fa_enabled'] == 'true') {
            return ApiResponse::error('Two factor authentication is enabled', 'TWO_FACTOR_AUTH_ENABLED');
        }

        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $qrCodeUrl = $google2fa->getQRCodeUrl(
            $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
            $userInfo['email'],
            $secret
        );

        // Emit 2FA setup event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                AuthEvent::onAuth2FASetup(),
                [
                    'user' => $userInfo,
                ]
            );
        }

        return ApiResponse::success([
            'qr_code_url' => $qrCodeUrl,
            'secret' => $secret,
        ], 'Here is your two factor authentication secret', 200);
    }

    #[OA\Post(
        path: '/api/user/auth/two-factor',
        summary: 'Verify two-factor code',
        description: 'Verify two-factor authentication code during login process to complete authentication.',
        tags: ['User - Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/TwoFactorVerifyRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Two-factor authentication verified successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/TwoFactorVerifyResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing email or code'),
            new OA\Response(response: 401, description: 'Unauthorized - 2FA not enabled or invalid code'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to verify 2FA'),
        ]
    )]
    public function post(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        // Find user by email (from login step)
        if (!isset($data['email']) || !isset($data['code'])) {
            return ApiResponse::error('Missing email or code', 'MISSING_REQUIRED_FIELDS');
        }
        $userInfo = User::getUserByEmail($data['email']);
        if (!$userInfo || $userInfo['two_fa_enabled'] !== 'true') {
            return ApiResponse::error('2FA not enabled', 'two_fa_NOT_ENABLED');
        }
        $google2fa = new Google2FA();
        if (!$google2fa->verifyKey($userInfo['two_fa_key'], $data['code'])) {
            // Emit 2FA failed event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    AuthEvent::onAuth2FAFailed(),
                    [
                        'user' => $userInfo,
                        'ip_address' => CloudFlareRealIP::getRealIP(),
                    ]
                );
            }

            return ApiResponse::error('Invalid 2FA code', 'INVALID_CODE');
        }
        // Set session/cookie and allow login
        $token = $userInfo['remember_token'];
        setcookie('remember_token', $token, time() + 60 * 60 * 24 * 30, '/');
        User::updateUser($userInfo['uuid'], ['last_ip' => CloudFlareRealIP::getRealIP()]);

        Activity::createActivity([
            'user_uuid' => $userInfo['uuid'],
            'name' => 'two_fa_verified',
            'context' => '2FA verified, user logged in',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit events
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                AuthEvent::onAuth2FAVerified(),
                [
                    'user' => $userInfo,
                ]
            );
            $eventManager->emit(
                AuthEvent::onAuthLoginSuccess(),
                [
                    'user' => $userInfo,
                ]
            );
        }

        return ApiResponse::success($userInfo, '2FA verified, user logged in', 200);
    }
}
