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

use App\Chat\User;
use App\Chat\WebNode;
use App\Helpers\ApiResponse;
use App\Chat\WebSpaceSubuser;
use OpenApi\Attributes as OA;
use App\Helpers\WebSpaceGateway;
use App\WebSpaceSubuserPermissions;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\WebSpacePluginEvents;
use App\Helpers\CheckWebSpacePermission;
use App\Plugins\Events\Events\WebSpaceEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * User WebSpace subuser management.
 */
class WebSpaceSubuserController
{
    #[OA\Get(path: '/api/user/webspaces/{uuidShort}/users', summary: 'List WebSpace subusers', tags: ['User - WebSpace Subusers'])]
    public function index(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveOwnerOrPermission($request, $uuidShort, WebSpaceSubuserPermissions::USER_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $subusers = WebSpaceSubuser::listByWebSpaceId((int) $resolved['space']['id']);

        return ApiResponse::success([
            'subusers' => $subusers,
            'permissions' => WebSpaceSubuserPermissions::getAll(),
            'grouped' => WebSpaceSubuserPermissions::getGrouped(),
        ], 'OK', 200);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/users', summary: 'Add WebSpace subuser', tags: ['User - WebSpace Subusers'])]
    public function create(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveOwnerOrPermission($request, $uuidShort, WebSpaceSubuserPermissions::USER_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $email = trim((string) ($content['email'] ?? ''));
        $permissions = $content['permissions'] ?? [];
        if ($email === '' || !is_array($permissions)) {
            return ApiResponse::error('email and permissions are required', 'VALIDATION_FAILED', 400);
        }

        $target = User::getUserByEmail($email);
        if (!$target) {
            return ApiResponse::error('User with this email not found', 'USER_NOT_FOUND', 404);
        }

        if ((int) $target['id'] === (int) $resolved['user']['id']) {
            return ApiResponse::error('You cannot add yourself as a subuser', 'VALIDATION_FAILED', 400);
        }

        if ((int) $target['id'] === (int) ($resolved['space']['owner_id'] ?? 0)) {
            return ApiResponse::error('Cannot add the WebSpace owner as a subuser', 'VALIDATION_FAILED', 400);
        }

        $subuser = WebSpaceSubuser::create([
            'user_id' => (int) $target['id'],
            'webspace_id' => (int) $resolved['space']['id'],
            'permissions' => $permissions,
        ]);

        if (!$subuser) {
            return ApiResponse::error('Failed to create subuser (may already exist)', 'CREATE_FAILED', 400);
        }

        \App\Helpers\WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.subuser.created', [
            'subuser_id' => $subuser['id'] ?? null,
            'email' => $email,
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceSubuserCreated(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $resolved['space'],
            [
                'subuser_id' => (int) ($subuser['id'] ?? 0),
                'context' => ['source' => 'user'],
            ],
        ));

        return ApiResponse::success(['subuser' => $subuser], 'OK', 201);
    }

    #[OA\Put(path: '/api/user/webspaces/{uuidShort}/users/{subuserId}', summary: 'Update WebSpace subuser', tags: ['User - WebSpace Subusers'])]
    public function update(Request $request, string $uuidShort, int $subuserId): Response
    {
        $resolved = $this->resolveOwnerOrPermission($request, $uuidShort, WebSpaceSubuserPermissions::USER_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $existing = WebSpaceSubuser::getById($subuserId);
        if (!$existing || (int) $existing['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Subuser not found', 'NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content) || !isset($content['permissions']) || !is_array($content['permissions'])) {
            return ApiResponse::error('permissions array is required', 'VALIDATION_FAILED', 400);
        }

        if (!WebSpaceSubuser::updatePermissions($subuserId, $content['permissions'])) {
            return ApiResponse::error('Failed to update permissions', 'UPDATE_FAILED', 500);
        }

        $targetUser = User::getUserById((int) ($existing['user_id'] ?? 0));
        if ($targetUser && !empty($targetUser['uuid'])) {
            self::pushDaemonAccess($resolved['space'], (string) $targetUser['uuid'], $content['permissions']);
        }

        \App\Helpers\WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.subuser.updated', [
            'subuser_id' => $subuserId,
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceSubuserUpdated(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $resolved['space'],
            [
                'subuser_id' => $subuserId,
                'context' => ['source' => 'user'],
            ],
        ));

        return ApiResponse::success(['subuser' => WebSpaceSubuser::getById($subuserId)], 'OK', 200);
    }

    #[OA\Delete(path: '/api/user/webspaces/{uuidShort}/users/{subuserId}', summary: 'Remove WebSpace subuser', tags: ['User - WebSpace Subusers'])]
    public function delete(Request $request, string $uuidShort, int $subuserId): Response
    {
        $resolved = $this->resolveOwnerOrPermission($request, $uuidShort, WebSpaceSubuserPermissions::USER_DELETE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $existing = WebSpaceSubuser::getById($subuserId);
        if (!$existing || (int) $existing['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Subuser not found', 'NOT_FOUND', 404);
        }

        $targetUser = User::getUserById((int) ($existing['user_id'] ?? 0));

        if (!WebSpaceSubuser::delete($subuserId)) {
            return ApiResponse::error('Failed to delete subuser', 'DELETE_FAILED', 500);
        }

        if ($targetUser && !empty($targetUser['uuid'])) {
            self::deauthorizeOnDaemon($resolved['space'], (string) $targetUser['uuid']);
        }

        \App\Helpers\WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.subuser.deleted', [
            'subuser_id' => $subuserId,
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceSubuserDeleted(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $resolved['space'],
            [
                'subuser_id' => $subuserId,
                'context' => ['source' => 'user'],
            ],
        ));

        return ApiResponse::success([], 'OK', 200);
    }

    /**
     * @param array<string, mixed> $space
     * @param list<mixed> $permissions
     */
    private static function pushDaemonAccess(array $space, string $userUuid, array $permissions): void
    {
        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if (!$webNode) {
            return;
        }

        $uuid = (string) ($space['uuid'] ?? '');
        $perms = array_values(array_map('strval', $permissions));
        FeatherQuilldClient::pushWebSpaceWsPermissions($webNode, $uuid, $userUuid, $perms);
    }

    /**
     * @param array<string, mixed> $space
     */
    private static function deauthorizeOnDaemon(array $space, string $userUuid): void
    {
        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if (!$webNode) {
            return;
        }

        FeatherQuilldClient::deauthorizeUser($webNode, $userUuid, [(string) ($space['uuid'] ?? '')]);
    }

    /**
     * @return array{user: array<string, mixed>, space: array<string, mixed>}|Response
     */
    private function resolveOwnerOrPermission(Request $request, string $uuidShort, string $permission): array | Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        if (!WebSpaceGateway::canUserAccessWebSpace((string) $user['uuid'], (string) $space['uuid'])) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        $denied = CheckWebSpacePermission::require($request, $space, $permission);
        if ($denied !== null) {
            return $denied;
        }

        return ['user' => $user, 'space' => $space];
    }
}
