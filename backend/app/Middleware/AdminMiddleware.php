<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
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
