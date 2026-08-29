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

use App\Chat\WebSpaceActivity;

/**
 * Shared helper for logging WebSpace panel actions.
 */
final class WebSpaceActivityLogger
{
    /**
     * @param array<string, mixed> $space WebSpace row from DB
     * @param array<string, mixed>|null $user Authenticated user row
     * @param array<string, mixed> $metadata
     */
    public static function log(array $space, ?array $user, string $event, array $metadata = []): void
    {
        $webspaceId = (int) ($space['id'] ?? 0);
        $webNodeId = (int) ($space['web_node_id'] ?? 0);
        if ($webspaceId <= 0 || $webNodeId <= 0) {
            return;
        }

        WebSpaceActivity::createActivity([
            'webspace_id' => $webspaceId,
            'web_node_id' => $webNodeId,
            'user_id' => $user !== null ? (int) ($user['id'] ?? 0) : null,
            'ip' => $user['last_ip'] ?? $user['ip'] ?? null,
            'event' => $event,
            'metadata' => $metadata !== [] ? $metadata : null,
        ]);
    }
}
