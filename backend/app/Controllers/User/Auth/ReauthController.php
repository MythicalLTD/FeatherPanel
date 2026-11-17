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

use App\Chat\Activity;
use App\Helpers\StepUpAuth;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Step-up re-authentication for sensitive actions (see {@see StepUpAuth}).
 */
class ReauthController
{
    #[OA\Get(
        path: '/api/user/auth/reauth',
        summary: 'Re-authentication status',
        description: 'Whether the current browser session is confirmed for sensitive actions, how long that lasts and which confirmation methods the account can use.',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Status'),
        ]
    )]
    public function status(Request $request): Response
    {
        $actor = StepUpAuth::actor($request);
        if (!is_array($actor)) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400);
        }
        $sessionAuth = $request->attributes->get('auth_type') === 'session';

        return ApiResponse::success([
            'required' => $sessionAuth,
            'elevated' => $sessionAuth ? StepUpAuth::isElevated($request) : true,
            'expires_in' => $sessionAuth ? StepUpAuth::secondsLeft($request) : null,
            'ttl_seconds' => StepUpAuth::TTL_SECONDS,
            'methods' => StepUpAuth::methodsFor($actor),
        ], 'Re-authentication status', 200);
    }

    #[OA\Post(
        path: '/api/user/auth/reauth',
        summary: 'Confirm identity for sensitive actions',
        description: 'Confirm the signed-in account with its password, its authenticator code (required when two-factor is on) or a code sent by e-mail. On success the current session may perform sensitive actions (impersonation, granting admin permissions, creating API keys, editing custom JavaScript) for 15 minutes.',
        tags: ['User - Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'method', type: 'string', enum: ['password', 'totp', 'email_code']),
                    new OA\Property(property: 'password', type: 'string'),
                    new OA\Property(property: 'code', type: 'string'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Confirmed'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 403, description: 'Wrong password or code'),
            new OA\Response(response: 429, description: 'Too many attempts'),
        ]
    )]
    public function confirm(Request $request): Response
    {
        $actor = StepUpAuth::actor($request);
        if (!is_array($actor)) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400);
        }
        if ($request->attributes->get('auth_type') !== 'session' || StepUpAuth::sessionHash($request) === null) {
            return ApiResponse::error('Re-authentication is only needed for browser sessions', 'REAUTH_NOT_APPLICABLE', 400);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }
        $methods = StepUpAuth::methodsFor($actor);
        $method = is_string($data['method'] ?? null) ? $data['method'] : $methods[0];
        if (!in_array($method, $methods, true)) {
            return ApiResponse::error(
                $method === StepUpAuth::METHOD_PASSWORD
                    ? 'Two-factor authentication is enabled on this account. Use your authenticator code.'
                    : 'This confirmation method is not available for your account',
                'REAUTH_METHOD_NOT_ALLOWED',
                400,
                ['methods' => $methods]
            );
        }

        if (StepUpAuth::isLockedOut($actor)) {
            return self::lockedOut($actor);
        }

        $secret = $method === StepUpAuth::METHOD_PASSWORD ? ($data['password'] ?? null) : ($data['code'] ?? null);
        if (!is_string($secret) || $secret === '') {
            return ApiResponse::error(
                $method === StepUpAuth::METHOD_PASSWORD ? 'Password is required' : 'Code is required',
                'MISSING_REQUIRED_FIELDS',
                400
            );
        }

        $ok = match ($method) {
            StepUpAuth::METHOD_PASSWORD => StepUpAuth::checkPassword($actor, $secret),
            StepUpAuth::METHOD_TOTP => StepUpAuth::checkTotp($actor, $secret),
            StepUpAuth::METHOD_EMAIL_CODE => StepUpAuth::checkEmailCode($request, $actor, $secret),
            default => false,
        };

        if (!$ok) {
            $locked = StepUpAuth::recordFailure($actor);
            self::log($actor, 'reauth_failed', 'Identity confirmation failed (' . $method . ')');
            if ($locked) {
                return self::lockedOut($actor);
            }

            return ApiResponse::error(
                $method === StepUpAuth::METHOD_PASSWORD ? 'The password is incorrect' : 'The code is invalid or has expired',
                'REAUTH_INVALID_CREDENTIALS',
                403
            );
        }

        StepUpAuth::clearFailures($actor);
        $ttl = StepUpAuth::grant($request);
        if ($ttl <= 0) {
            return ApiResponse::error('Could not store the confirmation. Try again.', 'REAUTH_STORE_FAILED', 503);
        }
        self::log($actor, 'reauth_confirmed', 'Identity confirmed for sensitive actions (' . $method . ')');

        return ApiResponse::success([
            'elevated' => true,
            'expires_in' => $ttl,
            'method' => $method,
        ], 'Identity confirmed', 200);
    }

    #[OA\Post(
        path: '/api/user/auth/reauth/email',
        summary: 'Send a confirmation code by e-mail',
        description: 'Sends a 6-digit code (valid 10 minutes) to the account e-mail for confirming sensitive actions. Only for accounts without two-factor and when mail is configured.',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Code sent'),
            new OA\Response(response: 400, description: 'Not available'),
        ]
    )]
    public function sendEmailCode(Request $request): Response
    {
        $actor = StepUpAuth::actor($request);
        if (!is_array($actor)) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400);
        }
        if ($request->attributes->get('auth_type') !== 'session' || StepUpAuth::sessionHash($request) === null) {
            return ApiResponse::error('Re-authentication is only needed for browser sessions', 'REAUTH_NOT_APPLICABLE', 400);
        }
        if (!in_array(StepUpAuth::METHOD_EMAIL_CODE, StepUpAuth::methodsFor($actor), true)) {
            return ApiResponse::error('This confirmation method is not available for your account', 'REAUTH_METHOD_NOT_ALLOWED', 400, ['methods' => StepUpAuth::methodsFor($actor)]);
        }
        if (StepUpAuth::isLockedOut($actor)) {
            return self::lockedOut($actor);
        }
        if (!StepUpAuth::sendEmailCode($request, $actor)) {
            return ApiResponse::error('Could not send a code. Try again.', 'REAUTH_STORE_FAILED', 503);
        }

        return ApiResponse::success([
            'expires_in' => StepUpAuth::CODE_TTL_SECONDS,
        ], 'A confirmation code was sent to your e-mail address', 200);
    }

    #[OA\Delete(
        path: '/api/user/auth/reauth',
        summary: 'End the confirmed state',
        description: 'Drops the elevated state of the current session before it expires.',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Done'),
        ]
    )]
    public function revoke(Request $request): Response
    {
        StepUpAuth::revoke($request);

        return ApiResponse::success(['elevated' => false], 'Confirmation ended', 200);
    }

    private static function lockedOut(array $actor): Response
    {
        $retryAfter = max(1, StepUpAuth::lockoutSecondsLeft($actor));
        $response = ApiResponse::error(
            'Too many failed attempts. Try again in ' . (int) ceil($retryAfter / 60) . ' minute(s).',
            'REAUTH_LOCKED',
            429,
            ['error_code' => 'REAUTH_LOCKED', 'retry_after' => $retryAfter]
        );
        $response->headers->set('Retry-After', (string) $retryAfter);

        return $response;
    }

    private static function log(array $actor, string $name, string $context): void
    {
        try {
            Activity::createActivity([
                'user_uuid' => $actor['uuid'] ?? null,
                'name' => $name,
                'context' => $context,
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);
        } catch (\Throwable) {
            // Audit logging must not break the confirmation.
        }
    }
}
