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

use App\Permissions;

/**
 * Rank guard for staff actions.
 *
 * Several admin endpoints only require a narrow permission (for example
 * `admin.users.edit`) but act on an account that may hold `admin.root`. Without
 * a rank check a support account can therefore take over a full administrator by
 * setting a new password, minting an SSO token, banning or deleting the account.
 *
 * The rule implemented here: only a root administrator may act on another staff
 * account that holds root-level permissions. Everything else is decided by the
 * route permission as before.
 */
class AdminRank
{
    /**
     * Permissions that make an account "root-level" for this guard. Only
     * `admin.root` qualifies: it short-circuits every permission check, so it is
     * the single superuser node. Narrower staff permissions stay manageable by
     * staff with the matching route permission.
     */
    private const ROOT_LEVEL_PERMISSIONS = [
        Permissions::ADMIN_ROOT,
    ];

    /** Whether the given account holds `admin.root` (directly or via the role). */
    public static function isRoot(?array $user): bool
    {
        if (!is_array($user) || empty($user['uuid'])) {
            return false;
        }

        return PermissionHelper::hasPermission((string) $user['uuid'], Permissions::ADMIN_ROOT, $user);
    }

    /** Whether the given account holds any root-level permission. */
    public static function isRootLevel(?array $user): bool
    {
        if (!is_array($user) || empty($user['uuid'])) {
            return false;
        }

        foreach (self::ROOT_LEVEL_PERMISSIONS as $permission) {
            if (PermissionHelper::hasPermission((string) $user['uuid'], $permission, $user)) {
                return true;
            }
        }

        return false;
    }

    /** Whether the given permission node is root-level. */
    public static function isRootLevelPermission(string $permission): bool
    {
        return in_array($permission, self::ROOT_LEVEL_PERMISSIONS, true);
    }

    /**
     * Check whether the acting account may modify the target account.
     *
     * @param array|null $actor  The authenticated staff account (request attribute `user`)
     * @param array|null $target The account the request wants to modify
     *
     * @return string|null Null when allowed, otherwise the reason for the rejection
     */
    public static function check(?array $actor, ?array $target): ?string
    {
        if (!is_array($target) || empty($target['uuid'])) {
            return null;
        }

        // Self-service changes are not a staff action; the endpoints decide those.
        if (is_array($actor) && !empty($actor['uuid']) && $actor['uuid'] === $target['uuid']) {
            return null;
        }

        if (self::isRoot($actor)) {
            return null;
        }

        if (self::isRootLevel($target)) {
            return 'Only a full administrator can modify this account';
        }

        return null;
    }
}
