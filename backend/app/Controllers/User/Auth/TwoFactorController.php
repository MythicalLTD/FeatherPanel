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

namespace App\Controllers\User\Auth;

use App\App;
use App\Chat\User;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use PragmaRX\Google2FA\Google2FA;
use App\CloudFlare\CloudFlareRealIP;
use App\CloudFlare\CloudFlareTurnstile;
use App\Plugins\Events\Events\AuthEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class TwoFactorController
{
    /**
     * Two Factor Authentication.
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
        $eventManager->emit(
            AuthEvent::onAuth2FAVerifySuccess(),
            [
                'user' => $userInfo,
            ]
        );

        return ApiResponse::success($userInfo, 'Two factor authentication enabled', 200);
    }

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

        return ApiResponse::success([
            'qr_code_url' => $qrCodeUrl,
            'secret' => $secret,
        ], 'Here is your two factor authentication secret', 200);
    }

    public function post(Request $request): Response
    {
        $app = App::getInstance(true);
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
        global $eventManager;
        $eventManager->emit(
            AuthEvent::onAuth2FAVerifySuccess(),
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

        return ApiResponse::success($userInfo, '2FA verified, user logged in', 200);
    }
}
