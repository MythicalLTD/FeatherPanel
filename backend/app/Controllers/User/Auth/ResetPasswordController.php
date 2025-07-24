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
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Hooks\MythicalSystems\CloudFlare\CloudFlareTurnstile;

class ResetPasswordController
{
    /**
     * Login a user.
     */
    public function put(Request $request): Response
    {
        try {
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
            $requiredFields = ['token', 'password'];
            $missingFields = [];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || trim($data[$field]) === '') {
                    $missingFields[] = $field;
                }
            }
            if (!empty($missingFields)) {
                return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
            }

            $userInfo = User::getUserByMailVerify($data['token']);
            if ($userInfo == null) {
                return ApiResponse::error('Invalid token', 'INVALID_TOKEN');
            }

            if (User::updateUser($userInfo['uuid'], ['password' => password_hash($data['password'], PASSWORD_BCRYPT)]) && User::updateUser($userInfo['uuid'], ['mail_verify' => null])) {
                return ApiResponse::success(null, 'Password reset successfully', 200);
            }

            return ApiResponse::error('Failed to reset password', 'FAILED_TO_RESET_PASSWORD');

        } catch (\Exception $e) {
            return ApiResponse::exception('An error occurred: ' . $e->getMessage(), $e->getCode());
        }
    }

    public function get(Request $request): Response
    {
        $app = App::getInstance(true);
        try {
            $token = $request->query->get('token');
            if (!$token || trim($token) === '') {
                return ApiResponse::error('Token is required', 'TOKEN_REQUIRED');
            }
            $userInfo = User::getUserByMailVerify($token);
            if ($userInfo == null) {
                return ApiResponse::error('Invalid token', 'INVALID_TOKEN', 400, [
                    'token' => $token,
                ]);
            }

            return ApiResponse::success(null, 'Token is valid', 200);
        } catch (\Exception $e) {
            return ApiResponse::exception('An error occurred: ' . $e->getMessage(), $e->getCode());
        }
    }
}
