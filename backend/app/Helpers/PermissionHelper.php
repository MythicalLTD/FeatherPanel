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
use App\Cache\Cache;
use App\Chat\Permission;

class PermissionHelper
{
    /** @var array<int, list<string>> Request-scoped permission node cache keyed by role_id */
    private static array $rolePermissionCache = [];

    /**
     * Checks if a user has a specific permission.
     *
     * @param array|null $user Optional already-loaded user row to avoid a redundant UUID lookup
     */
    public static function hasPermission(string $userUuid, string $permission, ?array $user = null): bool
    {
        $user = $user ?? User::getUserByUuid($userUuid);
        if (!$user || !isset($user['role_id'])) {
            return false;
        }

        $permissionNodes = self::getPermissionNodesForRole((int) $user['role_id']);

        // Root permission always grants access
        if (in_array('admin.root', $permissionNodes, true)) {
            return true;
        }

        return in_array($permission, $permissionNodes, true);
    }

    /**
     * @return list<string>
     */
    public static function getPermissionNodesForRole(int $roleId): array
    {
        if ($roleId <= 0) {
            return [];
        }

        if (isset(self::$rolePermissionCache[$roleId])) {
            return self::$rolePermissionCache[$roleId];
        }

        $cacheKey = 'role_permissions:' . $roleId;
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return self::$rolePermissionCache[$roleId] = array_values($cached);
        }

        $permissions = Permission::getPermissionsByRoleId($roleId);
        $permissionNodes = array_values(array_map(
            static fn ($perm) => (string) $perm['permission'],
            $permissions
        ));

        self::$rolePermissionCache[$roleId] = $permissionNodes;
        Cache::put($cacheKey, $permissionNodes, 5);

        return $permissionNodes;
    }

    /**
     * Invalidate cached permissions for a role (call after create/update/delete).
     */
    public static function clearRolePermissionCache(int $roleId): void
    {
        unset(self::$rolePermissionCache[$roleId]);
        Cache::forget('role_permissions:' . $roleId);
    }
}
