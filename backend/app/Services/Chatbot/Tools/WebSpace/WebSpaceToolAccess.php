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

namespace App\Services\Chatbot\Tools\WebSpace;

use App\Chat\WebNode;
use App\Helpers\WebSpaceGateway;

/**
 * Resolve the focused WebSpace for chatbot tools and enforce access/permissions.
 */
final class WebSpaceToolAccess
{
    /**
     * @return array{ok:true,space:array<string,mixed>,webNode:array<string,mixed>|null,uuid:string,uuidShort:string}|array{ok:false,error:string}
     */
    public static function resolve(array $params, array $user, array $pageContext = [], ?string $permission = null): array
    {
        $userUuid = (string) ($user['uuid'] ?? '');
        if ($userUuid === '') {
            return ['ok' => false, 'error' => 'User not authenticated.'];
        }

        $key = '';
        if (!empty($params['uuid_short']) && is_scalar($params['uuid_short'])) {
            $key = trim((string) $params['uuid_short']);
        } elseif (!empty($params['uuid']) && is_scalar($params['uuid'])) {
            $key = trim((string) $params['uuid']);
        } elseif (isset($pageContext['webspace']) && is_array($pageContext['webspace'])) {
            $ws = $pageContext['webspace'];
            $key = trim((string) ($ws['uuidShort'] ?? $ws['uuid_short'] ?? $ws['uuid'] ?? ''));
        }

        if ($key === '') {
            return ['ok' => false, 'error' => 'WebSpace uuid_short is required (or open a WebSpace page).'];
        }

        if (!WebSpaceGateway::canUserAccessWebSpace($userUuid, $key)) {
            return ['ok' => false, 'error' => 'Access denied to WebSpace.'];
        }

        $space = WebSpaceGateway::resolveWebSpace($key);
        if (!$space) {
            return ['ok' => false, 'error' => 'WebSpace not found.'];
        }

        if ($permission !== null && $permission !== '' && !WebSpaceGateway::hasPermission($userUuid, $space, $permission)) {
            return ['ok' => false, 'error' => "Missing permission: {$permission}"];
        }

        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));

        return [
            'ok' => true,
            'space' => $space,
            'webNode' => $webNode,
            'uuid' => (string) ($space['uuid'] ?? ''),
            'uuidShort' => (string) ($space['uuidShort'] ?? $space['uuid_short'] ?? ''),
        ];
    }
}
