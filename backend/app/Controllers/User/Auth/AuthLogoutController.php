<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

use App\Chat\User;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\AuthEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'LogoutResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Logout success message'),
    ]
)]
class AuthLogoutController
{
    #[OA\Get(
        path: '/api/user/auth/logout',
        summary: 'Logout user',
        description: 'Logout the authenticated user by clearing remember token cookie and updating user session. Blocks 2FA if enabled.',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'User logged out successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/LogoutResponse')
            ),
            new OA\Response(response: 500, description: 'Internal server error - Failed to logout user'),
        ]
    )]
    public function get(Request $request): Response
    {
        global $eventManager;
        if (!isset($_COOKIE['remember_token'])) {
            setcookie('remember_token', '', time() - 3600 - 1500 * 120);

            return ApiResponse::success([], 'Logged out and we did not find a remember_token', 200);
        }
        /**
         * If the user has a remember_token, we need to update it and block 2FA if it's enabled.
         */
        $user = User::getUserByRememberToken($_COOKIE['remember_token']);
        if ($user == null) {
            return ApiResponse::success([], 'Logged out no user found', 200);
        }
        if (isset($user['remember_token'])) {
            $newRememberToken = User::generateAccountToken();
            User::updateUser(
                $user['uuid'],
                [
                    'remember_token' => $newRememberToken,
                ]
            );
            if (isset($user['two_fa_enabled']) && $user['two_fa_enabled'] == 'true') {
                User::updateUser(
                    $user['uuid'],
                    [
                        'two_fa_blocked' => 'true',
                    ]
                );
            }

            // Emit event
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    AuthEvent::onAuthLogout(),
                );
            }
            Activity::createActivity([
                'user_uuid' => $user['uuid'],
                'name' => 'logout',
                'context' => 'User logged out',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);
        }
        setcookie('remember_token', '', time() - 3600 - 1500 * 120);

        return ApiResponse::success([], 'Logged out', 200);
    }
}
