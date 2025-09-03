<?php

/*
 * This file is part of FeatherPanel.
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
use App\Chat\Server;
use App\Permissions;
use App\Chat\Subuser;

class ServerGateway
{
    public static function canUserAccessServer(string $userUuid, string $serverUuid): bool
    {
        // Admin-level permissions short-circuit
        if (
            PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_SERVERS_VIEW)
            || PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_SERVERS_EDIT)
            || PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_SERVERS_DELETE)
        ) {
            return true;
        }

        // Fetch user and server once to avoid duplicate queries and null dereferences
        $user = User::getUserByUuid($userUuid);
        $server = Server::getServerByUuid($serverUuid);

        if (!$user || !$server) {
            return false;
        }

        // Owner check
        if ((int) $server['owner_id'] === (int) $user['id']) {
            return true;
        }

        // Subuser membership check
        $subuser = Subuser::getSubuserByUserAndServer((int) $user['id'], (int) $server['id']);
        if ($subuser !== null) {
            return true;
        }

        return false;

    }
}
