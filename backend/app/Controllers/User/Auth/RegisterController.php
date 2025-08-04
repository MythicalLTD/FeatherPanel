<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\User\Auth;

use App\App;
use App\Chat\User;
use App\Chat\Activity;
use App\Helpers\UUIDUtils;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Mail\templates\Welcome;
use App\CloudFlare\CloudFlareRealIP;
use App\CloudFlare\CloudFlareTurnstile;
use App\Plugins\Events\Events\AuthEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class RegisterController
{
    /**
     * Register a new user.
     */
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
            return ApiResponse::error('Username already exists', 'USERNAME_ALREADY_EXISTS');
        }
        if (User::getUserByEmail($data['email']) !== null) {
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
            'remember_token' => bin2hex(random_bytes(16)),
            'first_ip' => CloudFlareRealIP::getRealIP(),
            'last_ip' => CloudFlareRealIP::getRealIP(),
        ];
        $user = User::createUser($userInfo);
        // If user creation fails, return an error
        if ($user == false) {
            return ApiResponse::error('Failed to create user', 'FAILED_TO_CREATE_USER');
        }

        Welcome::send([
            'email' => $data['email'],
            'subject' => 'Welcome to ' . $config->getSetting(ConfigInterface::APP_NAME, 'MythicalPanel'),
            'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'MythicalPanel'),
            'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'mythicalpanel.mythical.systems'),
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'username' => $data['username'],
            'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
            'uuid' => $userInfo['uuid'],
            'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
        ]);

        Activity::createActivity([
            'user_uuid' => $userInfo['uuid'],
            'name' => 'register',
            'context' => 'User registered',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
        global $eventManager;
        $eventManager->emit(
            AuthEvent::onAuthRegisterSuccess(),
            [
                'user' => $userInfo,
            ]
        );

        // If user creation succeeds, return the user info
        return ApiResponse::success($userInfo, 'User registered successfully', 200);
    }
}
