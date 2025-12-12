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
use App\Helpers\UUIDUtils;
use App\Chat\UserPreference;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Mail\templates\Welcome;
use App\CloudFlare\CloudFlareRealIP;
use App\CloudFlare\CloudFlareTurnstile;
use App\Plugins\Events\Events\AuthEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'RegisterRequest',
    type: 'object',
    required: ['username', 'email', 'password', 'first_name', 'last_name'],
    properties: [
        new OA\Property(property: 'username', type: 'string', minLength: 3, maxLength: 64, description: 'Username (alphanumeric and underscores only)'),
        new OA\Property(property: 'email', type: 'string', format: 'email', minLength: 3, maxLength: 255, description: 'User email address'),
        new OA\Property(property: 'password', type: 'string', minLength: 8, maxLength: 255, description: 'User password'),
        new OA\Property(property: 'first_name', type: 'string', minLength: 3, maxLength: 64, description: 'User first name'),
        new OA\Property(property: 'last_name', type: 'string', minLength: 3, maxLength: 64, description: 'User last name'),
        new OA\Property(property: 'turnstile_token', type: 'string', description: 'CloudFlare Turnstile token (required if Turnstile is enabled)'),
    ]
)]
#[OA\Schema(
    schema: 'RegisterResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'user', type: 'object', description: 'User information'),
        new OA\Property(property: 'preferences', type: 'object', description: 'User preferences'),
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
    ]
)]
class RegisterController
{
    #[OA\Put(
        path: '/api/user/auth/register',
        summary: 'Register new user',
        description: 'Create a new user account with email verification and welcome email. User is automatically logged in after successful registration. Includes CloudFlare Turnstile validation if enabled.',
        tags: ['User - Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/RegisterRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'User registered successfully and automatically logged in',
                content: new OA\JsonContent(ref: '#/components/schemas/RegisterResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid data format, Turnstile validation failed, or Turnstile keys not set'),
            new OA\Response(response: 409, description: 'Conflict - Username or email already exists'),
            new OA\Response(response: 403, description: 'Forbidden - Registration is not enabled'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create user'),
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

        if ($config->getSetting(ConfigInterface::REGISTRATION_ENABLED, 'true') == 'false') {
            return ApiResponse::error('Registration is not enabled', 'REGISTRATION_NOT_ENABLED');
        }

        // Validate required fields
        $requiredFields = ['username', 'email', 'password', 'first_name', 'last_name'];
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
        foreach (['username', 'email', 'first_name', 'last_name', 'password'] as $field) {
            if (!is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE');
            }
            $data[$field] = trim($data[$field]);
        }

        // Validate data length
        $lengthRules = [
            'username' => [3, 64],
            'email' => [3, 255],
            'first_name' => [3, 64],
            'last_name' => [3, 64],
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

        // Validate username format (optional: only allow alphanumeric and underscores)
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $data['username'])) {
            return ApiResponse::error('Username can only contain letters, numbers, and underscores', 'INVALID_USERNAME_FORMAT');
        }

        // Validate uniqueness
        if (User::getUserByUsername($data['username']) !== null) {
            // Emit registration failed event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    AuthEvent::onAuthRegistrationFailed(),
                    [
                        'email' => $data['email'],
                        'username' => $data['username'],
                        'reason' => 'USERNAME_ALREADY_EXISTS',
                        'ip_address' => CloudFlareRealIP::getRealIP(),
                    ]
                );
            }

            return ApiResponse::error('Username already exists', 'USERNAME_ALREADY_EXISTS');
        }
        if (User::getUserByEmail($data['email']) !== null) {
            // Emit registration failed event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    AuthEvent::onAuthRegistrationFailed(),
                    [
                        'email' => $data['email'],
                        'username' => $data['username'],
                        'reason' => 'EMAIL_ALREADY_EXISTS',
                        'ip_address' => CloudFlareRealIP::getRealIP(),
                    ]
                );
            }

            return ApiResponse::error('Email already exists', 'EMAIL_ALREADY_EXISTS');
        }

        // Create user
        $userInfo = [
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => password_hash($data['password'], PASSWORD_BCRYPT),
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'uuid' => UUIDUtils::generateV4(),
            'remember_token' => User::generateAccountToken(),
            'first_ip' => CloudFlareRealIP::getRealIP(),
            'last_ip' => CloudFlareRealIP::getRealIP(),
        ];
        $user = User::createUser($userInfo);
        // If user creation fails, return an error
        if ($user == false) {
            // Emit registration failed event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    AuthEvent::onAuthRegistrationFailed(),
                    [
                        'email' => $data['email'],
                        'username' => $data['username'],
                        'reason' => 'FAILED_TO_CREATE_USER',
                        'ip_address' => CloudFlareRealIP::getRealIP(),
                    ]
                );
            }

            return ApiResponse::error('Failed to create user', 'FAILED_TO_CREATE_USER');
        }

        if ($user == 1) {
            User::updateUser($userInfo['uuid'], [
                'role_id' => 4,
            ]);
        }

        // Fetch the complete user data from database (includes all fields with defaults)
        $createdUser = User::getUserByUuid($userInfo['uuid']);
        if (!$createdUser) {
            return ApiResponse::error('Failed to retrieve created user', 'USER_RETRIEVAL_FAILED', 500);
        }

        Welcome::send([
            'email' => $data['email'],
            'subject' => 'Welcome to ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
            'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
            'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'username' => $data['username'],
            'password' => $data['password'],
            'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
            'uuid' => $userInfo['uuid'],
            'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
        ]);

        Activity::createActivity([
            'user_uuid' => $createdUser['uuid'],
            'name' => 'register',
            'context' => 'User registered',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Automatically log in the user after registration
        // Set session/cookie
        if (isset($createdUser['remember_token'])) {
            $token = $createdUser['remember_token'];
            setcookie('remember_token', $token, time() + 60 * 60 * 24 * 30, '/');
            User::updateUser($createdUser['uuid'], ['last_ip' => CloudFlareRealIP::getRealIP()]);

            // Create login activity (user is automatically logged in)
            Activity::createActivity([
                'user_uuid' => $createdUser['uuid'],
                'name' => 'login',
                'context' => 'User logged in automatically after registration',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);
        }

        // Emit events
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                AuthEvent::onAuthRegisterSuccess(),
                [
                    'user' => $createdUser,
                ]
            );
            // Also emit login success event since user is automatically logged in
            $eventManager->emit(
                AuthEvent::onAuthLoginSuccess(),
                [
                    'user' => $createdUser,
                ]
            );
        }

        // Load user preferences
        $preferences = UserPreference::getPreferences($createdUser['uuid']);

        // Return user info and preferences (same format as login)
        return ApiResponse::success([
            'user' => $createdUser,
            'preferences' => $preferences,
        ], 'User registered successfully and logged in', 200);
    }
}
