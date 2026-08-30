<?php

/*
 * This file is part of FeatherPanel.
 */

namespace App\Controllers\User\WebSpaces;

use App\Chat\WebNode;
use App\Chat\WebSpaceActivity;
use App\Helpers\ApiResponse;
use App\Helpers\CheckWebSpacePermission;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\WebSpaceGateway;
use App\WebSpaceSubuserPermissions;
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
        $summary = WebSpaceActivity::summarizeRecent((int) $space['id'], $days);

        $traffic = [
            'hits' => 0,
            'bytes' => 0,
            'status' => [],
            'files' => [],
            'by_day' => [],
        ];
        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if ($webNode) {
            $logs = FeatherQuilldClient::getWebSpaceProxyLogs($webNode, (string) $space['uuid'], null, 500, $days);
            if ($logs['ok'] && is_array($logs['body'])) {
                $body = $logs['body'];
                $traffic = [
                    'hits' => (int) ($body['hits'] ?? 0),
                    'bytes' => (int) ($body['bytes'] ?? 0),
                    'status' => is_array($body['status'] ?? null) ? $body['status'] : [],
                    'files' => is_array($body['files'] ?? null) ? $body['files'] : [],
                    'by_day' => is_array($body['by_day'] ?? null) ? $body['by_day'] : [],
                ];
            }
        }

        return ApiResponse::success([
            'days' => $days,
            'summary' => $summary,
            'traffic' => $traffic,
        ], 'OK', 200);
    }
}
