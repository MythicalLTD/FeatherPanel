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

namespace App\Middleware;

use App\Chat\User;
use App\Helpers\ApiResponse;
use App\Helpers\PermissionHelper;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        $user = $request->attributes->get('user');
        $permission = $request->attributes->get('permission');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401, []);
        }
        if (!$permission || !PermissionHelper::hasPermission($user['uuid'], $permission)) {
            return ApiResponse::error('You are not allowed to access this resource!', 'NOT_AUTHORIZED', 403, [
                'user' => $user,
                'permission' => $permission,
                'userId' => $user['uuid'],
            ]);
        }

        return $next($request);
    }

    /**
     * Get the authenticated user from the request (if available).
     */
    public static function getCurrentUser(Request $request): ?array
    {
        return $request->attributes->get('user');
    }
}
