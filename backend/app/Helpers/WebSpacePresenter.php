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

use App\Chat\WebNode;
use App\Chat\WebSpaceSubuser;

/**
 * Enriches WebSpace API payloads with access context and runtime stats.
 */
class WebSpacePresenter
{
    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $user
     *
     * @return array<string, mixed>
     */
    public static function forUser(array $space, array $user): array
    {
        $userId = (int) ($user['id'] ?? 0);
        $ownerId = (int) ($space['owner_id'] ?? 0);
        $isOwner = $userId > 0 && $ownerId === $userId;

        $space['is_subuser'] = !$isOwner && WebSpaceSubuser::getByUserAndWebSpace($userId, (int) ($space['id'] ?? 0)) !== null;
        $space['is_owner'] = $isOwner;

        $isAdmin = !empty($user['uuid']) && (
            PermissionHelper::hasPermission((string) $user['uuid'], \App\Permissions::ADMIN_WEBSPACES_EDIT, $user)
            || PermissionHelper::hasPermission((string) $user['uuid'], \App\Permissions::ADMIN_WEBSPACES_VIEW, $user)
        );
        $space['can_edit_disk'] = $isOwner || $isAdmin;

        if ($space['is_subuser']) {
            $sub = WebSpaceSubuser::getByUserAndWebSpace($userId, (int) ($space['id'] ?? 0));
            $perms = $sub['permissions'] ?? [];
            if (is_string($perms)) {
                $decoded = json_decode($perms, true);
                $perms = is_array($decoded) ? $decoded : [];
            }
            $space['subuser_permissions'] = array_values($perms);
        } else {
            $space['subuser_permissions'] = ['*'];
        }

        $space['database_limit'] = (int) ($space['database_limit'] ?? 1);
        $space['mailbox_limit'] = (int) ($space['mailbox_limit'] ?? 0);
        $space['disk_limit_mb'] = (int) ($space['disk'] ?? 1024);

        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if ($webNode) {
            $space['sftp_host'] = (string) ($webNode['fqdn'] ?? '');
            $space['sftp_port'] = (int) ($webNode['sftpPort'] ?? 2222);

            $daemon = FeatherQuilldClient::request($webNode, 'GET', '/api/webspaces/' . ($space['uuid'] ?? ''));
            if ($daemon['ok'] && is_array($daemon['body'])) {
                $body = $daemon['body'];
                if (isset($body['disk_used_bytes'])) {
                    $space['disk_used_bytes'] = (int) $body['disk_used_bytes'];
                }
                if (isset($body['disk_limit_bytes'])) {
                    $space['disk_limit_bytes'] = (int) $body['disk_limit_bytes'];
                }
            }
        }

        if (strtolower((string) ($space['status'] ?? '')) === 'suspended') {
            $space['suspended'] = 1;
        } else {
            $space['suspended'] = 0;
        }

        return $space;
    }
}
