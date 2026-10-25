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

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\SubuserPermissions;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Services\Server\ServerCrashRecorder;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Crash detection for one server: the console lines from just before the last crash
 * and the opt-out auto restart toggle (sent to Wings as crash_detection_enabled).
 */
class ServerCrashController
{
    use CheckSubuserPermissionsTrait;

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/crash',
        summary: 'Last crash and auto restart setting',
        tags: ['User - Servers'],
        parameters: [new OA\Parameter(name: 'uuidShort', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [new OA\Response(response: 200, description: 'Crash info')]
    )]
    public function show(Request $request, string $uuidShort): Response
    {
        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }
        if ($denied = $this->checkPermission($request, $server, SubuserPermissions::CONTROL_CONSOLE)) {
            return $denied;
        }

        return ApiResponse::success(self::payload($server), 'Crash info retrieved', 200);
    }

    #[OA\Put(
        path: '/api/user/servers/{uuidShort}/crash/auto-restart',
        summary: 'Turn automatic restart after a crash on or off',
        tags: ['User - Servers'],
        parameters: [new OA\Parameter(name: 'uuidShort', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        requestBody: new OA\RequestBody(content: new OA\JsonContent(properties: [new OA\Property(property: 'enabled', type: 'boolean')])),
        responses: [new OA\Response(response: 200, description: 'Updated')]
    )]
    public function setAutoRestart(Request $request, string $uuidShort): Response
    {
        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }
        if ($denied = $this->checkPermission($request, $server, SubuserPermissions::CONTROL_RESTART)) {
            return $denied;
        }
        $body = json_decode($request->getContent(), true);
        if (!is_array($body) || !is_bool($body['enabled'] ?? null)) {
            return ApiResponse::error('enabled must be true or false', 'INVALID_AUTO_RESTART', 400);
        }
        $enabled = $body['enabled'];
        if (!Server::updateServerById((int) $server['id'], ['crash_auto_restart' => $enabled ? 1 : 0])) {
            return ApiResponse::error('Failed to update the server', 'UPDATE_FAILED', 500);
        }

        // Wings reads the setting from the server configuration: sync so it applies now.
        $synced = false;
        $node = Node::getNodeById((int) $server['node_id']);
        if ($node) {
            try {
                $synced = Wings::fromNode($node, 10)->getServer()->syncServer((string) $server['uuid'])->isSuccessful();
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->warning('Crash auto restart sync failed for ' . $server['uuid'] . ': ' . $e->getMessage());
            }
        }

        $user = $request->attributes->get('user');
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'] ?? null,
            'ip' => $user['last_ip'] ?? null,
            'event' => $enabled ? 'server:crash_auto_restart.enabled' : 'server:crash_auto_restart.disabled',
            'metadata' => json_encode(['synced' => $synced]),
        ]);

        $server['crash_auto_restart'] = $enabled ? 1 : 0;

        return ApiResponse::success(self::payload($server) + ['synced' => $synced], 'Auto restart updated', 200);
    }

    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/crash',
        summary: 'Dismiss the last crash',
        tags: ['User - Servers'],
        parameters: [new OA\Parameter(name: 'uuidShort', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [new OA\Response(response: 200, description: 'Dismissed')]
    )]
    public function dismiss(Request $request, string $uuidShort): Response
    {
        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }
        if ($denied = $this->checkPermission($request, $server, SubuserPermissions::CONTROL_CONSOLE)) {
            return $denied;
        }
        Server::updateServerById((int) $server['id'], ['last_crash_at' => null, 'last_crash_log' => null]);
        $server['last_crash_at'] = null;
        $server['last_crash_log'] = null;

        return ApiResponse::success(self::payload($server), 'Crash dismissed', 200);
    }

    private static function payload(array $server): array
    {
        $at = $server['last_crash_at'] ?? null;

        return [
            'auto_restart' => (int) ($server['crash_auto_restart'] ?? 1) === 1,
            'last_crash' => $at ? [
                'at' => date(DATE_ATOM, (int) strtotime((string) $at)),
                'lines' => ServerCrashRecorder::decode($server['last_crash_log'] ?? null),
            ] : null,
        ];
    }
}
