<?php

/*
 * This file is part of App.
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
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\AuthEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\CloudFlare\CloudFlareTurnstile;

class LoginController
{
    /**
     * Login a user.
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
            return ApiResponse::error('Email does not exist', 'EMAIL_DOES_NOT_EXIST');
        }
        if (!password_verify($data['password'], $userInfo['password'])) {
            return ApiResponse::error('Invalid password', 'INVALID_PASSWORD');
        }

        // 2FA logic
        if (isset($userInfo['2fa_enabled']) && $userInfo['2fa_enabled'] == 'true') {
            // Do NOT set session/cookie yet
            global $eventManager;

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
            global $eventManager;
            $eventManager->emit(
                AuthEvent::onAuthLoginSuccess(),
                [
                    'user' => $userInfo,
                ]
            );

            return ApiResponse::success($userInfo, 'User logged in successfully', 200);
        }

        return ApiResponse::error('Remember token not set', 'REMEMBER_TOKEN_NOT_SET');

    }
}
