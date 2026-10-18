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
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\AuthEvent;
use App\Helpers\PasswordResetTokenHelper;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'ResetPasswordRequest',
    type: 'object',
    required: ['token', 'password'],
    properties: [
        new OA\Property(property: 'token', type: 'string', description: 'Password reset token from email'),
        new OA\Property(property: 'password', type: 'string', minLength: 8, maxLength: 255, description: 'New password'),
        new OA\Property(property: 'turnstile_token', type: 'string', description: 'CloudFlare Turnstile token (required if Turnstile is enabled)'),
    ]
)]
#[OA\Schema(
    schema: 'ResetPasswordResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
    ]
)]
#[OA\Schema(
    schema: 'TokenValidationResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Token validation message'),
        new OA\Property(property: 'token', type: 'string', description: 'Validated token'),
    ]
)]
class ResetPasswordController
{
    #[OA\Put(
        path: '/api/user/auth/reset-password',
        summary: 'Reset password',
        description: 'Reset user password using token from forgot password email. Includes CloudFlare Turnstile validation if enabled.',
        tags: ['User - Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ResetPasswordRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Password reset successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ResetPasswordResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, Turnstile validation failed, or Turnstile keys not set'),
            new OA\Response(response: 404, description: 'Not found - Invalid token'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to reset password'),
        ]
    )]
    public function put(Request $request): Response
    {
        try {
            $app = App::getInstance(true);
            $config = $app->getConfig();
            $data = json_decode($request->getContent(), true);
            if ($config->getSetting(ConfigInterface::TURNSTILE_ENABLED, 'false') == 'true') {
                if (!isset($data['turnstile_token']) || !is_scalar($data['turnstile_token']) || trim((string) $data['turnstile_token']) === '') {
                    return ApiResponse::error('Captcha token is required', 'CAPTCHA_TOKEN_REQUIRED');
                }
                if (!\App\Helpers\CaptchaHelper::validate($data['turnstile_token'], CloudFlareRealIP::getRealIP())) {
                    return ApiResponse::error('Captcha validation failed', 'CAPTCHA_VALIDATION_FAILED');
                }
            }

            // Validate required fields
            $requiredFields = ['token', 'password'];
            $missingFields = [];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || !is_scalar($data[$field]) || trim((string) $data[$field]) === '') {
                    $missingFields[] = $field;
                }
            }
            if (!empty($missingFields)) {
                return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
            }

            $resetToken = $data['token'];
            $resetLookup = $this->findResetToken($resetToken);
            if ($resetLookup === null) {
                // Emit password reset failed event
                global $eventManager;
                if (isset($eventManager) && $eventManager !== null) {
                    $eventManager->emit(
                        AuthEvent::onAuthPasswordResetFailed(),
                        [
                            'token' => $data['token'],
                            'reason' => 'INVALID_TOKEN',
                            'ip_address' => CloudFlareRealIP::getRealIP(),
                        ]
                    );
                }

                return ApiResponse::error('Looks like the token is invalid or expired or already used', 'INVALID_TOKEN');
            }
            $userInfo = $resetLookup['user'];

            // Password reset tokens embed an expiry as "<hex>.<unix_ts>" (see
            // ForgotPasswordController). Older/foreign tokens without that
            // suffix (e.g. an email-verification token that happens to be
            // looked up here) are treated as expired/invalid rather than
            // accepted indefinitely.
            if (!self::isResetTokenValid($resetToken)) {
                global $eventManager;
                if (isset($eventManager) && $eventManager !== null) {
                    $eventManager->emit(
                        AuthEvent::onAuthPasswordResetFailed(),
                        [
                            'token' => $data['token'],
                            'reason' => 'TOKEN_EXPIRED',
                            'ip_address' => CloudFlareRealIP::getRealIP(),
                        ]
                    );
                }
                // Invalidate the stale token so it can't be retried later. FP-18:
                // an address that is not verified must stay unverified.
                User::updateUser($userInfo['uuid'], [
                    'mail_verify' => PasswordResetTokenHelper::mailVerifyAfterReset($resetLookup['state']),
                ]);

                return ApiResponse::error('Looks like the token is invalid or expired or already used', 'INVALID_TOKEN');
            }

            if (User::updateUser($userInfo['uuid'], ['password' => password_hash($data['password'], PASSWORD_BCRYPT), 'remember_token' => User::generateAccountToken()]) && User::updateUser($userInfo['uuid'], ['mail_verify' => PasswordResetTokenHelper::mailVerifyAfterReset($resetLookup['state'])])) {
                Activity::createActivity([
                    'user_uuid' => $userInfo['uuid'],
                    'name' => 'reset_password',
                    'context' => 'User reset password',
                    'ip_address' => CloudFlareRealIP::getRealIP(),
                ]);

                // Emit event
                global $eventManager;
                if (isset($eventManager) && $eventManager !== null) {
                    $eventManager->emit(
                        AuthEvent::onAuthResetPasswordSuccess(),
                        [
                            'user' => $userInfo,
                        ]
                    );
                }

                return ApiResponse::success(null, 'Password reset successfully', 200);
            }

            return ApiResponse::error('Failed to reset password', 'FAILED_TO_RESET_PASSWORD');
        } catch (\Exception $e) {
            return ApiResponse::exception('An error occurred: ' . $e->getMessage(), $e->getCode());
        }
    }

    #[OA\Get(
        path: '/api/user/auth/reset-password',
        summary: 'Validate reset token',
        description: 'Validate a password reset token to check if it is valid before allowing password reset.',
        tags: ['User - Authentication'],
        parameters: [
            new OA\Parameter(
                name: 'token',
                in: 'query',
                description: 'Password reset token from email',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Token is valid',
                content: new OA\JsonContent(ref: '#/components/schemas/TokenValidationResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing token or invalid token'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to validate token'),
        ]
    )]
    public function get(Request $request): Response
    {
        $app = App::getInstance(true);
        try {
            $token = $request->query->get('token');
            // FP-17: only a fingerprint of the reset token goes into the log.
            $app->getLogger()->info(
                'Validating password reset token (' . self::tokenFingerprint(is_string($token) ? $token : '')
                . ') - IP: ' . CloudFlareRealIP::getRealIP()
            );
            if (!is_string($token) || trim($token) === '') {
                return ApiResponse::error('Token is required', 'TOKEN_REQUIRED');
            }
            $resetLookup = $this->findResetToken($token);
            if ($resetLookup === null) {
                return ApiResponse::error('Looks like the token is invalid or expired', 'INVALID_TOKEN', 400);
            }
            if (!self::isResetTokenValid($token)) {
                return ApiResponse::error('Looks like the token is invalid or expired', 'INVALID_TOKEN', 400);
            }

            return ApiResponse::success(null, 'Token is valid', 200);
        } catch (\Exception $e) {
            return ApiResponse::exception('An error occurred: ' . $e->getMessage(), $e->getCode());
        }
    }

    /**
     * Fingerprint of a reset token for log lines: a short, non reversible hash.
     */
    private static function tokenFingerprint(string $token): string
    {
        return 'sha256:' . substr(hash('sha256', $token), 0, 16);
    }

    /**
     * Locate the account a password reset token belongs to (FP-17/FP-18).
     *
     * Tokens issued before the "fpreset:" prefix was introduced are stored in
     * plain form (state "legacy") and keep working; new tokens are stored as
     * "fpreset:v:<token>" (address was verified) or "fpreset:u:<token>" (address
     * was not verified) so that state is known when the reset is completed.
     *
     * @return array{user: array, state: string}|null
     */
    private function findResetToken(string $token): ?array
    {
        if ($token === '') {
            return null;
        }

        $userInfo = User::getUserByMailVerify($token);
        if ($userInfo !== null) {
            return ['user' => $userInfo, 'state' => PasswordResetTokenHelper::STATE_LEGACY];
        }

        foreach (
            [
                PasswordResetTokenHelper::STATE_VERIFIED,
                PasswordResetTokenHelper::STATE_UNVERIFIED,
                PasswordResetTokenHelper::STATE_LEGACY,
            ] as $state
        ) {
            $userInfo = User::getUserByMailVerify(PasswordResetTokenHelper::storedValue($state, $token));
            if ($userInfo !== null) {
                return ['user' => $userInfo, 'state' => $state];
            }
        }

        return null;
    }

    /**
     * Reset tokens are generated as "<64 hex chars>.<unix_timestamp>" (see
     * ForgotPasswordController::put()). Validate both the shape and that the
     * embedded expiry has not passed yet.
     */
    private static function isResetTokenValid(string $token): bool
    {
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            return false;
        }
        [$hex, $expiresAt] = $parts;
        if (!ctype_xdigit($hex) || strlen($hex) !== 64) {
            return false;
        }
        if (!ctype_digit($expiresAt)) {
            return false;
        }

        return (int) $expiresAt >= time();
    }
}
