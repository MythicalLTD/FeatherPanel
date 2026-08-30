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
use App\Chat\WebSpaceActivity;
use App\Helpers\WebSpaceGateway;
use App\WebSpaceSubuserPermissions;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\CheckWebSpacePermission;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WebSpaceAnalyticsController
{
    public function summary(Request $request, string $uuidShort): Response
    {
        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $denied = CheckWebSpacePermission::require($request, $space, WebSpaceSubuserPermissions::ACTIVITY_READ);
        if ($denied instanceof Response) {
            return $denied;
        }

        $days = max(1, min(90, (int) $request->query->get('days', 30)));
        $domain = trim((string) $request->query->get('domain', ''));
        $summary = WebSpaceActivity::summarizeRecent((int) $space['id'], $days);

        $traffic = [
            'hits' => 0,
            'bytes' => 0,
            'status' => [],
            'files' => [],
            'by_day' => [],
        ];
        $trafficError = null;
        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if ($webNode) {
            $logs = FeatherQuilldClient::getWebSpaceProxyLogs(
                $webNode,
                (string) $space['uuid'],
                $domain !== '' ? $domain : null,
                500,
                $days,
            );
            if ($logs['ok'] && is_array($logs['body'])) {
                $body = $logs['body'];
                $traffic = [
                    'hits' => (int) ($body['hits'] ?? 0),
                    'bytes' => (int) ($body['bytes'] ?? 0),
                    'status' => is_array($body['status'] ?? null) ? $body['status'] : [],
                    'files' => is_array($body['files'] ?? null) ? $body['files'] : [],
                    'by_day' => is_array($body['by_day'] ?? null) ? $body['by_day'] : [],
                ];
            } else {
                $trafficError = is_string($logs['error'] ?? null) && $logs['error'] !== ''
                    ? $logs['error']
                    : 'Proxy traffic data is temporarily unavailable.';
            }
        } else {
            $trafficError = 'Web node not found.';
        }

        return ApiResponse::success([
            'days' => $days,
            'domain' => $domain !== '' ? $domain : null,
            'summary' => $summary,
            'traffic' => $traffic,
            'traffic_error' => $trafficError,
        ], 'OK', 200);
    }
}
