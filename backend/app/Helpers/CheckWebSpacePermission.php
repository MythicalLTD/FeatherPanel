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

namespace App\Helpers;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Thin permission gate for user WebSpace controllers.
 */
class CheckWebSpacePermission
{
    /**
     * @param array<string, mixed> $space
     */
    public static function require(Request $request, array $space, string $permission): ?Response
    {
        $user = $request->attributes->get('user');
        if (!$user || empty($user['uuid'])) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        if (!WebSpaceGateway::hasPermission((string) $user['uuid'], $space, $permission)) {
            return ApiResponse::error(
                'You do not have permission to perform this action',
                'PERMISSION_DENIED',
                403
            );
        }

        return null;
    }

    /**
     * @param array<string, mixed> $space
     * @param list<string> $permissions
     */
    public static function requireAny(Request $request, array $space, array $permissions): ?Response
    {
        $user = $request->attributes->get('user');
        if (!$user || empty($user['uuid'])) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $uuid = (string) $user['uuid'];
        foreach ($permissions as $permission) {
            if (WebSpaceGateway::hasPermission($uuid, $space, $permission)) {
                return null;
            }
        }

        return ApiResponse::error(
            'You do not have permission to perform this action',
            'PERMISSION_DENIED',
            403
        );
    }
}
