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

            if (User::updateUser($userInfo['uuid'], ['password' => password_hash($data['password'], PASSWORD_BCRYPT), 'remember_token' => User::generateAccountToken()]) && User::updateUser($userInfo['uuid'], ['mail_verify' => null])) {
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
			$app->getLogger()->info('Validating password reset token: ' . $token . ' - IP: ' . CloudFlareRealIP::getRealIP());
            if (!$token || trim($token) === '') {
                return ApiResponse::error('Token is required', 'TOKEN_REQUIRED');
            }
            $userInfo = User::getUserByMailVerify($token);
            if ($userInfo == null) {
                return ApiResponse::error('Looks like the token is invalid or expired', 'INVALID_TOKEN', 400, [
                    'token' => $token,
                ]);
            }
            return ApiResponse::success(null, 'Token is valid', 200);
        } catch (\Exception $e) {
            return ApiResponse::exception('An error occurred: ' . $e->getMessage(), $e->getCode());
        }
    }
}
