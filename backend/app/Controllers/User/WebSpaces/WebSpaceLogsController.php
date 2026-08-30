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

namespace App\Controllers\User\WebSpaces;

use App\Chat\WebNode;
use App\Helpers\ApiResponse;
use App\Helpers\WebSpaceGateway;
use App\WebSpaceSubuserPermissions;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\CheckWebSpacePermission;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WebSpaceLogsController
{
    public function proxyLogs(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::ACTIVITY_READ);
        if ($denied instanceof Response) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $domain = trim((string) $request->query->get('domain', ''));
        $lines = max(1, min(5000, (int) $request->query->get('lines', 500)));
        $days = max(0, min(90, (int) $request->query->get('days', 0)));

        $daemon = FeatherQuilldClient::getWebSpaceProxyLogs(
            $webNode,
            (string) $space['uuid'],
            $domain !== '' ? $domain : null,
            $lines,
            $days,
        );

        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon proxy logs failed',
                'DAEMON_PROXY_LOGS_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        return ApiResponse::success(
            is_array($daemon['body']) ? $daemon['body'] : ['data' => $daemon['body']],
            'OK',
            200,
        );
    }
}
