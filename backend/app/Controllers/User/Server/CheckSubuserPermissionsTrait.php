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

namespace App\Controllers\User\Server;

use App\Helpers\ApiResponse;
use App\Helpers\SubuserPermissionChecker;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

trait CheckSubuserPermissionsTrait
{
    /**
     * Check if the current user has the required permission for a server action.
     *
     * @param Request $request The request object
     * @param array $server The server array
     * @param string $permission The permission to check
     *
     * @return Response|null Response if permission denied, null if allowed
     */
    protected function checkPermission(Request $request, array $server, string $permission): ?Response
    {
        $user = $request->attributes->get('user');

        // Get user ID and server ID
        $userId = $user['id'] ?? 0;
        $serverId = $server['id'] ?? 0;

        if (!$userId || !$serverId) {
            return ApiResponse::error('Invalid user or server', 'INVALID_PARAMETERS', 400);
        }

        // Check if user has permission
        if (!SubuserPermissionChecker::hasPermission($userId, $serverId, $permission)) {
            return ApiResponse::error(
                'You do not have permission to perform this action',
                'PERMISSION_DENIED',
                403
            );
        }

        return null;
    }

    /**
     * Check if the current user has any of the required permissions.
     *
     * @param Request $request The request object
     * @param array $server The server array
     * @param array $permissions Array of permissions to check
     *
     * @return Response|null Response if permission denied, null if allowed
     */
    protected function checkAnyPermission(Request $request, array $server, array $permissions): ?Response
    {
        $user = $request->attributes->get('user');

        // Get user ID and server ID
        $userId = $user['id'] ?? 0;
        $serverId = $server['id'] ?? 0;

        if (!$userId || !$serverId) {
            return ApiResponse::error('Invalid user or server', 'INVALID_PARAMETERS', 400);
        }

        // Check if user has any of the permissions
        if (!SubuserPermissionChecker::hasAnyPermission($userId, $serverId, $permissions)) {
            return ApiResponse::error(
                'You do not have permission to perform this action',
                'PERMISSION_DENIED',
                403
            );
        }

        return null;
    }

    /**
     * Check if the current user has all of the required permissions.
     *
     * @param Request $request The request object
     * @param array $server The server array
     * @param array $permissions Array of permissions to check
     *
     * @return Response|null Response if permission denied, null if allowed
     */
    protected function checkAllPermissions(Request $request, array $server, array $permissions): ?Response
    {
        $user = $request->attributes->get('user');

        // Get user ID and server ID
        $userId = $user['id'] ?? 0;
        $serverId = $server['id'] ?? 0;

        if (!$userId || !$serverId) {
            return ApiResponse::error('Invalid user or server', 'INVALID_PARAMETERS', 400);
        }

        // Check if user has all of the permissions
        if (!SubuserPermissionChecker::hasAllPermissions($userId, $serverId, $permissions)) {
            return ApiResponse::error(
                'You do not have permission to perform this action',
                'PERMISSION_DENIED',
                403
            );
        }

        return null;
    }
}
