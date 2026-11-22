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

namespace App\Services\Chatbot\Tools;

use App\Helpers\ServerGateway;
use App\Helpers\SubuserPermissionChecker;

/**
 * Server access for assistant tools: the user must be able to open the server and, like the
 * matching REST endpoint, hold every listed subuser permission. Owners and server admins hold all.
 */
final class ToolServerAccess
{
    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $server
     */
    public static function allowed(array $user, array $server, string ...$permissions): bool
    {
        if (!ServerGateway::canUserAccessServer((string) ($user['uuid'] ?? ''), (string) ($server['uuid'] ?? ''))) {
            return false;
        }

        foreach ($permissions as $permission) {
            if (!SubuserPermissionChecker::hasPermission((int) ($user['id'] ?? 0), (int) ($server['id'] ?? 0), $permission)) {
                return false;
            }
        }

        return true;
    }
}
