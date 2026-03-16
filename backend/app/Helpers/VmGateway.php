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
use App\Permissions;
use App\Chat\VmSubuser;
use App\Chat\VmInstance;

/**
 * VmGateway - Access control helper for VM instances.
 * Similar to ServerGateway but for VDS/VM instances.
 */
class VmGateway
{
    /**
     * Check if a user can access a VM instance (owner, subuser, or admin).
     */
    public static function canUserAccessVmInstance(string $userUuid, int $vmInstanceId): bool
    {
        // Admin-level permissions short-circuit
        if (
            PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_VM_INSTANCES_VIEW)
            || PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_VM_INSTANCES_EDIT)
            || PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_VM_INSTANCES_DELETE)
        ) {
            return true;
        }

        // Fetch user and VM instance
        $user = User::getUserByUuid($userUuid);
        $vmInstance = VmInstance::getById($vmInstanceId);

        if (!$user || !$vmInstance) {
            return false;
        }

        // Owner check
        if (isset($vmInstance['user_uuid']) && $vmInstance['user_uuid'] === $userUuid) {
            return true;
        }

        // Subuser membership check
        $subuser = VmSubuser::getSubuserByUserAndVmInstance((int) $user['id'], $vmInstanceId);
        if ($subuser !== null) {
            return true;
        }

        return false;
    }

    /**
     * Check if user has specific permission for a VM instance.
     */
    public static function hasVmPermission(string $userUuid, int $vmInstanceId, string $permission): bool
    {
        // Admin always has all permissions
        if (
            PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_VM_INSTANCES_VIEW)
            || PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_VM_INSTANCES_EDIT)
            || PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_VM_INSTANCES_DELETE)
        ) {
            return true;
        }

        $user = User::getUserByUuid($userUuid);
        $vmInstance = VmInstance::getById($vmInstanceId);

        if (!$user || !$vmInstance) {
            return false;
        }

        // Owner has all permissions
        if (isset($vmInstance['user_uuid']) && $vmInstance['user_uuid'] === $userUuid) {
            return true;
        }

        // Check subuser permissions
        return VmSubuser::hasPermission((int) $user['id'], $vmInstanceId, $permission);
    }
}
