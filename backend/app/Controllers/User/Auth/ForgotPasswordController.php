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
use App\Mail\templates\ForgotPassword;
use App\CloudFlare\CloudFlareTurnstile;
use App\Plugins\Events\Events\AuthEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ForgotPasswordController
{
    /**
     * Login a user.
     */
    public function put(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();
        $data = json_decode($request->getContent(), true);
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
        $requiredFields = ['email'];
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
        foreach (['email'] as $field) {
            if (!is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE');
            }
            $data[$field] = trim($data[$field]);
        }

        // Validate data length
        $lengthRules = [
            'email' => [3, 255],
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
        $resetToken = bin2hex(random_bytes(32));

        if (User::updateUser($userInfo['uuid'], ['mail_verify' => $resetToken])) {

            // Send reset password email
            $resetUrl = 'https://' . $config->getSetting(ConfigInterface::APP_URL, 'mythicalpanel.mythical.systems') . '/auth/reset-password?token=' . $resetToken;

            ForgotPassword::send([
                'email' => $userInfo['email'],
                'subject' => 'Reset Password Request',
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'MythicalPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'mythicalpanel.mythical.systems'),
                'first_name' => $userInfo['first_name'],
                'last_name' => $userInfo['last_name'],
                'username' => $userInfo['username'],
                'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                'uuid' => $userInfo['uuid'],
                'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                'reset_url' => $resetUrl,
            ]);

            $eventManager->emit(
                AuthEvent::onAuthForgotPassword(),
                [
                    'user' => $userInfo,
                    'reset_url' => $resetUrl,
                    'ip_address' => CloudFlareRealIP::getRealIP(),
                    'reset_token' => $resetToken,
                ]
            );
            Activity::createActivity([
                'user_uuid' => $userInfo['uuid'],
                'name' => 'forgot_password',
                'context' => 'User requested password reset',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success(null, 'We have sent you an email to reset your password', 200);
        }

        return ApiResponse::error('Failed to update user', 'FAILED_TO_UPDATE_USER');

    }
}
