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
