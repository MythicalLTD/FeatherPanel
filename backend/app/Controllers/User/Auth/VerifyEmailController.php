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
use App\Cache\Cache;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Mail\templates\VerifyEmail;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyEmailController
{
    private const RESEND_COOLDOWN_MINUTES = 5;

    public function get(Request $request): Response
    {
        $token = trim((string) $request->query->get('token', ''));
        if ($token === '') {
            return ApiResponse::error('Verification token is required', 'MISSING_VERIFICATION_TOKEN', 400);
        }

        $user = User::getUserByMailVerify($token);
        if ($user === null) {
            return ApiResponse::error('Invalid or expired verification token', 'INVALID_VERIFICATION_TOKEN', 400);
        }

        if (!User::updateUser($user['uuid'], ['mail_verify' => null])) {
            return ApiResponse::error('Failed to verify email', 'FAILED_TO_VERIFY_EMAIL', 500);
        }

        return ApiResponse::success([], 'Email verified successfully. You can now log in.', 200);
    }

    public function resend(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();

        if ($config->getSetting(ConfigInterface::REGISTRATION_REQUIRE_EMAIL_VERIFICATION, 'false') !== 'true') {
            return ApiResponse::success([], 'If email verification is needed, a new verification email will be sent.', 200);
        }

        if ($config->getSetting(ConfigInterface::SMTP_ENABLED, 'false') !== 'true') {
            return ApiResponse::error('Email verification is enabled, but SMTP is not configured.', 'EMAIL_VERIFICATION_SMTP_REQUIRED', 400);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            $body = [];
        }
        $identifier = trim((string) ($body['email'] ?? $body['username_or_email'] ?? ''));
        if ($identifier === '') {
            return ApiResponse::error('Email or username is required', 'MISSING_IDENTIFIER', 400);
        }

        $user = filter_var($identifier, FILTER_VALIDATE_EMAIL)
            ? User::getUserByEmail($identifier)
            : User::getUserByUsername($identifier);

        if ($user === null || !isset($user['mail_verify']) || trim((string) $user['mail_verify']) === '') {
            return ApiResponse::success([], 'If email verification is needed, a new verification email will be sent.', 200);
        }

        $cacheKey = 'auth:email-verification-resend:' . hash('sha256', (string) $user['uuid']);
        if (Cache::exists($cacheKey)) {
            return ApiResponse::success([], 'If email verification is needed, a new verification email will be sent.', 200);
        }

        $verifyUrl = rtrim($config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'), '/') . '/auth/verify-email?token=' . urlencode((string) $user['mail_verify']);
        VerifyEmail::send([
            'subject' => 'Verify your email for ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
            'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
            'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
            'first_name' => (string) ($user['first_name'] ?? ''),
            'last_name' => (string) ($user['last_name'] ?? ''),
            'email' => (string) ($user['email'] ?? ''),
            'username' => (string) ($user['username'] ?? ''),
            'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
            'verify_url' => $verifyUrl,
            'uuid' => (string) $user['uuid'],
            'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
        ]);

        Cache::put($cacheKey, true, self::RESEND_COOLDOWN_MINUTES);

        return ApiResponse::success([], 'If email verification is needed, a new verification email will be sent.', 200);
    }
}
