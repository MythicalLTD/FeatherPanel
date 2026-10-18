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
use App\Runtime\RequestContext;

class PermissionHelper
{
    /**
     * Request-scoped memo of role permissions. The shared Cache entry (Redis or
     * file, invalidated on every permission change) is the cross-process source;
     * this memo only avoids repeated lookups within one request and is cleared
     * when a new request starts, so a long-running FrankenPHP worker never keeps
     * serving revoked permissions.
     *
     * @var array<int, list<string>> permission nodes keyed by role_id
     */
    private static array $rolePermissionCache = [];
    private static int $cacheGeneration = -1;

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

        if (self::$cacheGeneration !== RequestContext::generation()) {
            self::resetRequestCache();
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
        Cache::put($cacheKey, $permissionNodes, 1);

        return $permissionNodes;
    }

    /**
     * Clear the request-scoped memo (called when a new request starts).
     */
    public static function resetRequestCache(): void
    {
        self::$rolePermissionCache = [];
        self::$cacheGeneration = RequestContext::generation();
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
