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

namespace App\Controllers\User;

use App\Chat\Server;
use App\Permissions;
use App\Realtime\Mercure;
use App\Helpers\ApiResponse;
use App\Helpers\ServerGateway;
use App\Helpers\PermissionHelper;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class RealtimeController
{
    /** Hard cap so a client cannot ask for an unbounded token. */
    private const MAX_TOPICS = 32;

    /**
     * Issue a short-lived Mercure subscriber token for the requested topics.
     * Only topics the user may see are granted; everything else is dropped.
     *
     * Body: {"topics": ["/notifications", "/servers/<uuidShort>", ...]}
     */
    public function token(Request $request): Response
    {
        if (!Mercure::isEnabled()) {
            return ApiResponse::success(['enabled' => false], 'Realtime updates are not enabled');
        }

        $user = $request->attributes->get('user');
        if (!is_array($user) || empty($user['uuid'])) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }

        $body = json_decode((string) $request->getContent(), true);
        $requested = is_array($body) && isset($body['topics']) && is_array($body['topics']) ? $body['topics'] : [];
        $requested = array_slice(array_values(array_unique(array_filter($requested, 'is_string'))), 0, self::MAX_TOPICS);

        $granted = [];
        foreach ($requested as $topic) {
            if ($this->canSubscribe($user, $topic)) {
                $granted[] = $topic;
            }
        }

        if ($granted === []) {
            return ApiResponse::error('No accessible topics requested', 'NO_TOPICS', 403);
        }

        $token = Mercure::subscriberToken($granted, (string) $user['uuid']);
        if ($token === null) {
            return ApiResponse::success(['enabled' => false], 'Realtime updates are not enabled');
        }

        $response = ApiResponse::success([
            'enabled' => true,
            'hub_url' => Mercure::publicUrl(),
            'token' => $token,
            'topics' => $granted,
            'expires_in' => Mercure::TOKEN_TTL,
        ]);
        $response->headers->set('Cache-Control', 'no-store');

        return $response;
    }

    private function canSubscribe(array $user, string $topic): bool
    {
        if ($topic === Mercure::TOPIC_NOTIFICATIONS) {
            return true;
        }

        if ($topic === Mercure::userTopic((string) $user['uuid'])) {
            return true;
        }

        if ($topic === Mercure::TOPIC_ADMIN_WEBSPACES) {
            return PermissionHelper::hasPermission((string) $user['uuid'], Permissions::ADMIN_WEBSPACES_VIEW, $user);
        }

        if (preg_match('#^/servers/([A-Za-z0-9-]{1,64})$#', $topic, $m) === 1) {
            $server = Server::getServerByUuidShort($m[1]);
            if (!$server) {
                return false;
            }

            return ServerGateway::canUserAccessServer((string) $user['uuid'], (string) $server['uuid'], $user, $server);
        }

        return false;
    }
}
