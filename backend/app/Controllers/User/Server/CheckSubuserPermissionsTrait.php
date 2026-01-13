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
