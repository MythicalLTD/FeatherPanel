<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
