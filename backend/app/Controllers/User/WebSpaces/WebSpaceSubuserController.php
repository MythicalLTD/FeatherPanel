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
use App\Permissions;
use App\Chat\WebNode;
use App\Helpers\ApiResponse;
use App\Chat\WebSpace;
use App\Chat\WebSpaceSubuser;
use App\Chat\WebSpaceSubuserInvite;
use App\App;
use App\Config\ConfigInterface;
use OpenApi\Attributes as OA;
use App\Helpers\WebSpaceGateway;
use App\Helpers\PermissionHelper;
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
    private const INVITE_MAX_HOURS = 720;

    private const INVITE_MAX_USES = 50;

    #[OA\Get(path: '/api/user/webspaces/{uuidShort}/users/invites', summary: 'Active WebSpace invite links', tags: ['User - WebSpace Subusers'])]
    public function invites(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveOwnerOrPermission($request, $uuidShort, WebSpaceSubuserPermissions::USER_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        return ApiResponse::success(['invites' => WebSpaceSubuserInvite::activeForWebSpace((int) $resolved['space']['id'])], 'OK', 200);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/users/invites', summary: 'Create a WebSpace invite link', tags: ['User - WebSpace Subusers'])]
    public function createInvite(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolveOwnerOrPermission($request, $uuidShort, WebSpaceSubuserPermissions::USER_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !is_array($data['permissions'] ?? null)) {
            return ApiResponse::error('Permissions array is required', 'INVALID_PERMISSIONS', 400);
        }
        $requested = array_values(array_unique(array_map('strval', $data['permissions'])));
        $valid = WebSpaceSubuserPermissions::getAll();
        if ($requested === [] || array_diff($requested, $valid) !== []) {
            return ApiResponse::error('One or more permissions are invalid', 'INVALID_PERMISSIONS', 400);
        }
        $allowed = $this->assignablePermissions($resolved);
        if ($allowed !== null && array_diff($requested, $allowed) !== []) {
            return ApiResponse::error('You cannot assign permissions you do not have', 'PERMISSION_ESCALATION_DENIED', 403);
        }
        $hours = (int) ($data['expires_in_hours'] ?? 72);
        $maxUses = (int) ($data['max_uses'] ?? 1);
        if ($hours < 1 || $hours > self::INVITE_MAX_HOURS) {
            return ApiResponse::error('Expiry must be between 1 and 720 hours', 'INVALID_INVITE_EXPIRY', 400);
        }
        if ($maxUses < 1 || $maxUses > self::INVITE_MAX_USES) {
            return ApiResponse::error('Uses must be between 1 and 50', 'INVALID_INVITE_USES', 400);
        }
        $invite = WebSpaceSubuserInvite::create((int) $resolved['space']['id'], (int) $resolved['user']['id'], $requested, $hours * 3600, $maxUses);
        if ($invite === null) {
            return ApiResponse::error('Failed to create the invite', 'CREATE_FAILED', 500);
        }
        \App\Helpers\WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.subuser.invite_created', [
            'invite_id' => $invite['id'],
            'max_uses' => $maxUses,
            'expires_in_hours' => $hours,
        ]);
        $base = rtrim((string) App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, ''), '/');

        return ApiResponse::success([
            'id' => $invite['id'],
            'token' => $invite['token'],
            'url' => $base . '/dashboard/invites/' . $invite['token'] . '?kind=webspace',
        ], 'Invite created', 201);
    }

    #[OA\Delete(path: '/api/user/webspaces/{uuidShort}/users/invites/{inviteId}', summary: 'Revoke a WebSpace invite link', tags: ['User - WebSpace Subusers'])]
    public function revokeInvite(Request $request, string $uuidShort, int $inviteId): Response
    {
        $resolved = $this->resolveOwnerOrPermission($request, $uuidShort, WebSpaceSubuserPermissions::USER_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }
        if (!WebSpaceSubuserInvite::revoke($inviteId, (int) $resolved['space']['id'])) {
            return ApiResponse::error('Invite not found', 'INVITE_NOT_FOUND', 404);
        }
        \App\Helpers\WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.subuser.invite_revoked', ['invite_id' => $inviteId]);

        return ApiResponse::success([], 'Invite revoked', 200);
    }

    #[OA\Get(path: '/api/user/webspace-invites/{token}', summary: 'Preview a WebSpace invite link', tags: ['User - WebSpace Subusers'])]
    public function previewInvite(Request $request, string $token): Response
    {
        [$invite, $space, $error] = $this->usableInvite($request, $token);
        if ($error) {
            return $error;
        }
        $inviter = User::getUserById((int) $invite['created_by']);

        return ApiResponse::success([
            'server' => ['name' => $space['name'], 'uuidShort' => $space['uuidShort']],
            'invited_by' => $inviter['username'] ?? null,
            'permissions' => $invite['permissions'],
            'expires_at' => date(DATE_ATOM, (int) strtotime((string) $invite['expires_at'])),
        ], 'OK', 200);
    }

    #[OA\Post(path: '/api/user/webspace-invites/{token}', summary: 'Accept a WebSpace invite link', tags: ['User - WebSpace Subusers'])]
    public function acceptInvite(Request $request, string $token): Response
    {
        [$invite, $space, $error] = $this->usableInvite($request, $token);
        if ($error) {
            return $error;
        }
        $user = $request->attributes->get('user');
        // The inviter must still own the WebSpace or hold every permission in the invite.
        $inviterId = (int) $invite['created_by'];
        if ($inviterId !== (int) ($space['owner_id'] ?? 0)) {
            $inviter = User::getUserById($inviterId);
            $inviterUuid = (string) ($inviter['uuid'] ?? '');
            $isAdmin = $inviterUuid !== '' && PermissionHelper::hasPermission($inviterUuid, Permissions::ADMIN_WEBSPACES_EDIT);
            $held = WebSpaceSubuser::getPermissionsList($inviterId, (int) $space['id']);
            if (!$isAdmin && (!in_array(WebSpaceSubuserPermissions::USER_CREATE, $held, true) || array_diff($invite['permissions'], $held) !== [])) {
                return ApiResponse::error('This invite is no longer valid', 'INVITE_INVALID', 410);
            }
        }
        if (WebSpaceSubuser::getByUserAndWebSpace((int) $user['id'], (int) $space['id'])) {
            return ApiResponse::error('You already have access to this WebSpace', 'INVITE_ALREADY_MEMBER', 400);
        }
        if (!WebSpaceSubuserInvite::consume((int) $invite['id'])) {
            return ApiResponse::error('This invite is no longer valid', 'INVITE_INVALID', 410);
        }
        $subuser = WebSpaceSubuser::create([
            'user_id' => (int) $user['id'],
            'webspace_id' => (int) $space['id'],
            'permissions' => $invite['permissions'],
        ]);
        if (!$subuser) {
            return ApiResponse::error('Failed to join the WebSpace', 'CREATE_FAILED', 500);
        }
        \App\Helpers\WebSpaceActivityLogger::log($space, $user, 'webspace.subuser.created', [
            'subuser_id' => $subuser['id'] ?? null,
            'invite_id' => (int) $invite['id'],
        ]);
        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceSubuserCreated(), WebSpacePluginEvents::basePayload(
            $user['uuid'] ?? null,
            $space,
            [
                'subuser_id' => (int) ($subuser['id'] ?? 0),
                'context' => ['source' => 'invite'],
            ],
        ));

        return ApiResponse::success(['server' => ['name' => $space['name'], 'uuidShort' => $space['uuidShort']]], 'Joined', 201);
    }

    /** @return array{0: ?array, 1: ?array, 2: ?Response} */
    private function usableInvite(Request $request, string $token): array
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return [null, null, ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401)];
        }
        $invite = WebSpaceSubuserInvite::findUsableByToken($token);
        $space = $invite ? WebSpace::getById((int) $invite['webspace_id']) : null;
        if (!$invite || !$space) {
            return [null, null, ApiResponse::error('This invite link is invalid, expired or used up', 'INVITE_INVALID', 404)];
        }
        if ((int) ($space['owner_id'] ?? 0) === (int) $user['id']) {
            return [null, null, ApiResponse::error('You already own this WebSpace', 'INVITE_OWN_SERVER', 400)];
        }

        return [$invite, $space, null];
    }
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

        // A subuser may only grant permissions they themselves hold; owners/admins keep full control.
        $permissions = WebSpaceSubuser::clampAssignablePermissions($permissions, $this->assignablePermissions($resolved));

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

        // Null when the actor is the owner or a panel admin (unrestricted).
        $actorPermissions = $this->assignablePermissions($resolved);

        // A subuser may not change their own access record (privilege escalation guard);
        // owners and panel admins are unrestricted and stay unaffected.
        if ($actorPermissions !== null && (int) ($existing['user_id'] ?? 0) === (int) ($resolved['user']['id'] ?? 0)) {
            return ApiResponse::error('You cannot modify your own subuser permissions', 'CANNOT_MODIFY_SELF', 403);
        }

        // A subuser may only grant permissions they themselves hold; owners/admins keep full control.
        $permissions = WebSpaceSubuser::clampAssignablePermissions($content['permissions'], $actorPermissions);

        if (!WebSpaceSubuser::updatePermissions($subuserId, $permissions)) {
            return ApiResponse::error('Failed to update permissions', 'UPDATE_FAILED', 500);
        }

        $targetUser = User::getUserById((int) ($existing['user_id'] ?? 0));
        if ($targetUser && !empty($targetUser['uuid'])) {
            self::pushDaemonAccess($resolved['space'], (string) $targetUser['uuid'], $permissions);
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
     * Permissions the current actor is allowed to hand out inside this WebSpace.
     *
     * @param array{user: array<string, mixed>, space: array<string, mixed>} $resolved
     *
     * @return list<string>|null null when the actor is the WebSpace owner or a panel admin (unrestricted)
     */
    private function assignablePermissions(array $resolved): ?array
    {
        $user = $resolved['user'];
        $space = $resolved['space'];

        if ((int) ($space['owner_id'] ?? 0) === (int) ($user['id'] ?? 0)) {
            return null;
        }

        $userUuid = (string) ($user['uuid'] ?? '');
        if (
            $userUuid !== ''
            && (
                PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_WEBSPACES_VIEW)
                || PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_WEBSPACES_EDIT)
            )
        ) {
            return null;
        }

        return WebSpaceSubuser::getPermissionsList((int) ($user['id'] ?? 0), (int) ($space['id'] ?? 0));
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
