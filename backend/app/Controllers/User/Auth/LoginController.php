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

namespace App\Controllers\User\Auth;

use App\App;
use App\Chat\User;
use App\Chat\Activity;
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
    required: ['email', 'password'],
    properties: [
        new OA\Property(property: 'email', type: 'string', format: 'email', minLength: 3, maxLength: 255, description: 'User email address'),
        new OA\Property(property: 'password', type: 'string', minLength: 8, maxLength: 255, description: 'User password'),
        new OA\Property(property: 'turnstile_token', type: 'string', description: 'CloudFlare Turnstile token (required if Turnstile is enabled)'),
    ]
)]
#[OA\Schema(
    schema: 'LoginResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'user', type: 'object', description: 'User information'),
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
        description: 'Authenticate user with email and password. Includes CloudFlare Turnstile validation if enabled. Returns 2FA requirement if enabled.',
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
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid email format, Turnstile validation failed, or Turnstile keys not set'),
            new OA\Response(response: 401, description: 'Unauthorized - Email does not exist, user is banned, or invalid password'),
            new OA\Response(response: 500, description: 'Internal server error - Remember token not set'),
        ]
    )]
    public function put(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();
        $data = json_decode($request->getContent(), true);

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
        $requiredFields = ['email', 'password'];
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
        foreach (['email', 'password'] as $field) {
            if (!is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE');
            }
            $data[$field] = trim($data[$field]);
        }

        // Validate data length
        $lengthRules = [
            'email' => [3, 255],
            'password' => [8, 255],
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

        // Validate email format
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return ApiResponse::error('Invalid email address', 'INVALID_EMAIL_ADDRESS');
        }

        // Login user
        $userInfo = User::getUserByEmail($data['email']);
        if ($userInfo == null) {
            // Emit login failed event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    AuthEvent::onAuthLoginFailed(),
                    [
                        'email' => $data['email'],
                        'reason' => 'EMAIL_DOES_NOT_EXIST',
                        'ip_address' => CloudFlareRealIP::getRealIP(),
                    ]
                );
            }

            return ApiResponse::error('Email does not exist', 'EMAIL_DOES_NOT_EXIST');
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

            return ApiResponse::success($userInfo, 'User logged in successfully', 200);
        }

        return ApiResponse::error('Remember token not set', 'REMEMBER_TOKEN_NOT_SET');

    }
}
