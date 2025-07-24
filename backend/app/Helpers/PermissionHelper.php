<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Helpers;

use App\Chat\User;
use App\Chat\Permission;

class PermissionHelper
{
    /**
     * Checks if a user has a specific permission.
     */
    public static function hasPermission(string $userUuid, string $permission): bool
    {
        $user = User::getUserByUuid($userUuid);
        if (!$user || !isset($user['role_id'])) {
            return false;
        }

        $roleId = $user['role_id'];
        $permissions = Permission::getPermissionsByRoleId((int) $roleId);

        // Build a flat array of permission strings
        $permissionNodes = array_map(fn ($perm) => $perm['permission'], $permissions);

        // Root permission always grants access
        if (in_array('admin.root', $permissionNodes, true)) {
            return true;
        }

        return in_array($permission, $permissionNodes, true);
    }
}
