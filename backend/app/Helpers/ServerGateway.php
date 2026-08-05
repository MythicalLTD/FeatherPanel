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
    /**
     * @param array|null $user Optional already-loaded user row
     * @param array|null $server Optional already-loaded server row
     */
    public static function canUserAccessServer(
        string $userUuid,
        string $serverUuid,
        ?array $user = null,
        ?array $server = null,
    ): bool {
        $user = $user ?? User::getUserByUuid($userUuid);
        if (!$user) {
            return false;
        }

        // One permission-node fetch covers all three admin checks
        $nodes = PermissionHelper::getPermissionNodesForRole((int) ($user['role_id'] ?? 0));
        if (
            in_array('admin.root', $nodes, true)
            || in_array(Permissions::ADMIN_SERVERS_VIEW, $nodes, true)
            || in_array(Permissions::ADMIN_SERVERS_EDIT, $nodes, true)
            || in_array(Permissions::ADMIN_SERVERS_DELETE, $nodes, true)
        ) {
            return true;
        }

        $server = $server ?? Server::getServerByUuid($serverUuid);
        if (!$server) {
            return false;
        }

        // Owner check
        if ((int) $server['owner_id'] === (int) $user['id']) {
            return true;
        }

        // Subuser membership check
        $subuser = Subuser::getSubuserByUserAndServer((int) $user['id'], (int) $server['id']);

        return $subuser !== null;
    }
}
