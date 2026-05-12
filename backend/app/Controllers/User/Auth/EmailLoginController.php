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
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use App\Mail\templates\EmailLoginCode;
use App\CloudFlare\CloudFlareTurnstile;
use App\Plugins\Events\Events\AuthEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'EmailLoginRequest',
    type: 'object',
    required: ['email'],
    properties: [
        new OA\Property(property: 'email', type: 'string', format: 'email', description: 'User email address'),
        new OA\Property(property: 'turnstile_token', type: 'string', description: 'CloudFlare Turnstile token (required if Turnstile is enabled)'),
    ]
)]
#[OA\Schema(
    schema: 'EmailLoginVerifyRequest',
    type: 'object',
    required: ['email', 'code'],
    properties: [
        new OA\Property(property: 'email', type: 'string', format: 'email', description: 'User email address'),
        new OA\Property(property: 'code', type: 'string', minLength: 6, maxLength: 6, description: '6-digit login code sent to email'),
    ]
)]
#[OA\Schema(
    schema: 'EmailLoginCodeSentResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
        new OA\Property(property: 'email', type: 'string', description: 'Email address where code was sent'),
    ]
)]
class EmailLoginController
{
    /**
     * Request a 6-digit login code to be sent via email.
     */
    #[OA\Post(
        path: '/api/user/auth/email-login/request',
        summary: 'Request email login code',
        description: 'Send a 6-digit login code to the user\'s email address for passwordless authentication.',
        tags: ['User - Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/EmailLoginRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Login code sent successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/EmailLoginCodeSentResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing email, invalid format, or Turnstile validation failed'),
            new OA\Response(response: 401, description: 'Unauthorized - Email not found or user is banned'),
            new OA\Response(response: 403, description: 'Forbidden - Email login is disabled'),
            new OA\Response(response: 429, description: 'Too many requests - Rate limited'),
        ]
    )]
    public function requestCode(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();

        // Check if email login is enabled
        $emailLoginEnabled = $config->getSetting(ConfigInterface::EMAIL_LOGIN_ENABLED, 'false');
        if ($emailLoginEnabled !== 'true') {
            return ApiResponse::error('Email login is disabled', 'EMAIL_LOGIN_DISABLED', 403);
        }

        // Check if SMTP is enabled (required for email login)
        $smtpEnabled = $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false');
        if ($smtpEnabled !== 'true') {
            return ApiResponse::error('Email login is not available (SMTP not configured)', 'EMAIL_LOGIN_SMTP_NOT_CONFIGURED', 403);
        }

        $data = json_decode($request->getContent(), true);

        // Validate Turnstile if enabled
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

        // Validate email
        if (!isset($data['email']) || !is_string($data['email'])) {
            return ApiResponse::error('Email is required', 'EMAIL_REQUIRED');
        }

        $email = trim($data['email']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ApiResponse::error('Invalid email address format', 'INVALID_EMAIL');
        }

        // Find user by email
        $userInfo = User::getUserByEmail($email);
        if ($userInfo == null) {
            // Don't reveal if email exists or not for security
            // But still emit event for monitoring
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    AuthEvent::onAuthLoginFailed(),
                    [
                        'email' => $email,
                        'reason' => 'EMAIL_LOGIN_USER_NOT_FOUND',
                        'ip_address' => CloudFlareRealIP::getRealIP(),
                    ]
                );
            }

            // Return success even if user not found (security through obscurity)
            return ApiResponse::success([
                'email' => $email,
            ], 'If this email exists, a login code has been sent.');
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

        // Check if email verification is required
        $requiresEmailVerification = $config->getSetting(ConfigInterface::REGISTRATION_REQUIRE_EMAIL_VERIFICATION, 'false') === 'true';
        $isEmailVerified = !isset($userInfo['mail_verify']) || $userInfo['mail_verify'] === null || trim((string) $userInfo['mail_verify']) === '';
        if ($requiresEmailVerification && !$isEmailVerified) {
            return ApiResponse::error('Email verification is required before login. Please verify your email first.', 'EMAIL_NOT_VERIFIED', 403);
        }

        // Generate 6-digit code
        $code = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+10 minutes'));

        // Store code in database (requires featherpanel_users.email_login_* columns from migrations)
        if (
            !User::updateUser($userInfo['uuid'], [
                'email_login_code' => $code,
                'email_login_expires' => $expiresAt,
            ])
        ) {
            return ApiResponse::error(
                'Email login is temporarily unavailable. Ask an administrator to run database migrations.',
                'EMAIL_LOGIN_STORE_FAILED',
                503,
            );
        }

        // Send email
        $appName = $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
        $appUrl = $config->getSetting(ConfigInterface::APP_URL, '');
        $appSupportUrl = $config->getSetting(ConfigInterface::APP_SUPPORT_URL, '');

        EmailLoginCode::send([
            'uuid' => $userInfo['uuid'],
            'enabled' => 'true',
            'first_name' => $userInfo['first_name'],
            'last_name' => $userInfo['last_name'],
            'email' => $userInfo['email'],
            'username' => $userInfo['username'],
            'app_name' => $appName,
            'app_url' => $appUrl,
            'app_support_url' => $appSupportUrl,
            'login_code' => $code,
            'expires_minutes' => 10,
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                AuthEvent::onAuthEmailLoginCodeRequested(),
                [
                    'user' => $userInfo,
                    'ip_address' => CloudFlareRealIP::getRealIP(),
                ]
            );
        }

        return ApiResponse::success([
            'email' => $email,
        ], 'If this email exists, a login code has been sent.');
    }

    /**
     * Verify the 6-digit code and complete login.
     */
    #[OA\Post(
        path: '/api/user/auth/email-login/verify',
        summary: 'Verify email login code',
        description: 'Verify the 6-digit login code and authenticate the user.',
        tags: ['User - Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/EmailLoginVerifyRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'User logged in successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/LoginResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing fields or invalid code format'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid or expired code'),
            new OA\Response(response: 403, description: 'Forbidden - Email login is disabled'),
        ]
    )]
    public function verifyCode(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();

        // Check if email login is enabled
        $emailLoginEnabled = $config->getSetting(ConfigInterface::EMAIL_LOGIN_ENABLED, 'false');
        if ($emailLoginEnabled !== 'true') {
            return ApiResponse::error('Email login is disabled', 'EMAIL_LOGIN_DISABLED', 403);
        }

        $data = json_decode($request->getContent(), true);

        // Validate inputs
        if (!isset($data['email']) || !isset($data['code'])) {
            $missingFields = [];
            if (!isset($data['email'])) {
                $missingFields[] = 'email';
            }
            if (!isset($data['code'])) {
                $missingFields[] = 'code';
            }

            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
        }

        $email = trim($data['email']);
        $code = trim($data['code']);

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ApiResponse::error('Invalid email address format', 'INVALID_EMAIL');
        }

        if (!preg_match('/^\d{6}$/', $code)) {
            return ApiResponse::error('Code must be exactly 6 digits', 'INVALID_CODE_FORMAT');
        }

        // Find user by email
        $userInfo = User::getUserByEmail($email);
        if ($userInfo == null) {
            return ApiResponse::error('Invalid email or code', 'INVALID_CREDENTIALS', 401);
        }

        // Check if user is banned
        if ($userInfo['banned'] == 'true') {
            return ApiResponse::error('User is banned', 'USER_BANNED', 401);
        }

        // Verify code
        $storedCode = $userInfo['email_login_code'] ?? null;
        $expiresAt = $userInfo['email_login_expires'] ?? null;

        if ($storedCode === null || $expiresAt === null) {
            return ApiResponse::error('No active login code found. Please request a new code.', 'NO_ACTIVE_CODE', 401);
        }

        if ($storedCode !== $code) {
            // Emit failed login event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    AuthEvent::onAuthLoginFailed(),
                    [
                        'user' => $userInfo,
                        'reason' => 'INVALID_EMAIL_LOGIN_CODE',
                        'ip_address' => CloudFlareRealIP::getRealIP(),
                    ]
                );
            }

            return ApiResponse::error('Invalid code', 'INVALID_CODE', 401);
        }

        // Check if code has expired
        if (strtotime($expiresAt) < time()) {
            // Clear expired code
            User::updateUser($userInfo['uuid'], [
                'email_login_code' => null,
                'email_login_expires' => null,
            ]);

            return ApiResponse::error('Code has expired. Please request a new code.', 'CODE_EXPIRED', 401);
        }

        // Check if 2FA is enabled
        if (isset($userInfo['two_fa_enabled']) && $userInfo['two_fa_enabled'] == 'true') {
            // Clear the code since it's been used
            User::updateUser($userInfo['uuid'], [
                'email_login_code' => null,
                'email_login_expires' => null,
            ]);

            // Return 2FA required response
            return ApiResponse::error('2FA required', 'TWO_FACTOR_REQUIRED', 401, [
                'email' => $userInfo['email'],
            ]);
        }

        // Clear the code since it's been used
        User::updateUser($userInfo['uuid'], [
            'email_login_code' => null,
            'email_login_expires' => null,
        ]);

        // Complete login using the LoginController's method
        $loginController = new LoginController();

        return $loginController->completeLogin($userInfo);
    }
}
