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
use App\Chat\WebSpace;
use App\Chat\WebSpaceSubuser;
use App\WebSpaceSubuserPermissions;

/**
 * WebSpaceGateway - Access control helper for WebSpaces (owner, admin, or subuser).
 */
class WebSpaceGateway
{
    /**
     * Check if a user can access a WebSpace by full UUID or uuidShort.
     */
    public static function canUserAccessWebSpace(string $userUuid, string $webspaceUuidOrShort): bool
    {
        if (PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_WEBSPACES_VIEW)) {
            return true;
        }

        $user = User::getUserByUuid($userUuid);
        if (!$user) {
            return false;
        }

        $space = self::resolveWebSpace($webspaceUuidOrShort);
        if (!$space) {
            return false;
        }

        if (isset($space['owner_id']) && (int) $space['owner_id'] === (int) $user['id']) {
            return true;
        }

        return WebSpaceSubuser::getByUserAndWebSpace((int) $user['id'], (int) $space['id']) !== null;
    }

    /**
     * Owner and admin always true; otherwise subuser must hold the permission.
     *
     * @param array<string, mixed> $space
     */
    public static function hasPermission(string $userUuid, array $space, string $permission): bool
    {
        if (
            PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_WEBSPACES_VIEW)
            || PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_WEBSPACES_EDIT)
        ) {
            return true;
        }

        $user = User::getUserByUuid($userUuid);
        if (!$user) {
            return false;
        }

        if (isset($space['owner_id']) && (int) $space['owner_id'] === (int) $user['id']) {
            return true;
        }

        return WebSpaceSubuser::hasPermission((int) $user['id'], (int) ($space['id'] ?? 0), $permission);
    }

    /**
     * @param array<string, mixed> $space
     */
    public static function isSuspended(array $space): bool
    {
        return strtolower((string) ($space['status'] ?? '')) === 'suspended';
    }

    /**
     * @param array<string, mixed> $space
     */
    public static function canControl(string $userUuid, array $space, string $action): bool
    {
        if (self::isSuspended($space)) {
            return false;
        }

        $action = strtolower(trim($action));
        $permission = match ($action) {
            'start' => WebSpaceSubuserPermissions::CONTROL_START,
            'stop', 'kill' => WebSpaceSubuserPermissions::CONTROL_STOP,
            'restart' => WebSpaceSubuserPermissions::CONTROL_RESTART,
            default => null,
        };

        if ($permission === null) {
            return false;
        }

        return self::hasPermission($userUuid, $space, $permission);
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function resolveWebSpace(string $webspaceUuidOrShort): ?array
    {
        $key = trim($webspaceUuidOrShort);
        if ($key === '') {
            return null;
        }

        if (WebSpace::isValidUuid($key)) {
            return WebSpace::getByUuid($key);
        }

        return WebSpace::getByUuidShort($key);
    }
}
