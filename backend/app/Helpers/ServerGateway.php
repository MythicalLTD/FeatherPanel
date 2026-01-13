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
