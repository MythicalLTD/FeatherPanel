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
use App\Chat\User;
use App\Chat\Server;
use App\Chat\Subuser;
use App\Chat\SubuserInvite;
use App\SubuserPermissions;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Helpers\SubuserPermissionChecker;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\ServerSubuserEvent;

/**
 * Subuser invite links: whoever can add subusers creates a link with a permission set,
 * an expiry and a use limit. A signed-in user who opens it joins the server as a subuser.
 */
class SubuserInviteController
{
    use CheckSubuserPermissionsTrait;

    private const MAX_EXPIRY_HOURS = 720;

    private const MAX_USES = 50;

    #[OA\Get(path: '/api/user/servers/{uuidShort}/subuser-invites', summary: 'Active invite links', tags: ['User - Server Subusers'], responses: [new OA\Response(response: 200, description: 'Invites')])]
    public function index(Request $request, string $uuidShort): Response
    {
        [$server, $error] = $this->resolve($request, $uuidShort, SubuserPermissions::USER_CREATE);
        if ($error) {
            return $error;
        }

        return ApiResponse::success(['invites' => SubuserInvite::activeForServer((int) $server['id'])], 'Invites retrieved', 200);
    }

    #[OA\Post(path: '/api/user/servers/{uuidShort}/subuser-invites', summary: 'Create an invite link', tags: ['User - Server Subusers'], responses: [new OA\Response(response: 201, description: 'Invite created; the token is only returned here')])]
    public function create(Request $request, string $uuidShort): Response
    {
        [$server, $error] = $this->resolve($request, $uuidShort, SubuserPermissions::USER_CREATE);
        if ($error) {
            return $error;
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !is_array($data['permissions'] ?? null)) {
            return ApiResponse::error('Permissions array is required', 'INVALID_PERMISSIONS', 400);
        }
        $permissions = array_values(array_unique($data['permissions']));
        if ($permissions === [] || !Subuser::validatePermissions($permissions)) {
            return ApiResponse::error('One or more permissions are invalid', 'INVALID_PERMISSIONS', 400);
        }
        $actor = $request->attributes->get('user');
        if (!SubuserPermissionChecker::canAssignPermissions((int) $actor['id'], (int) $server['id'], $permissions)) {
            return ApiResponse::error('You cannot assign permissions you do not have', 'PERMISSION_ESCALATION_DENIED', 403);
        }
        $hours = (int) ($data['expires_in_hours'] ?? 72);
        $maxUses = (int) ($data['max_uses'] ?? 1);
        if ($hours < 1 || $hours > self::MAX_EXPIRY_HOURS) {
            return ApiResponse::error('Expiry must be between 1 and 720 hours', 'INVALID_INVITE_EXPIRY', 400);
        }
        if ($maxUses < 1 || $maxUses > self::MAX_USES) {
            return ApiResponse::error('Uses must be between 1 and 50', 'INVALID_INVITE_USES', 400);
        }

        $invite = SubuserInvite::create((int) $server['id'], (int) $actor['id'], $permissions, $hours * 3600, $maxUses);
        if ($invite === null) {
            return ApiResponse::error('Failed to create the invite', 'CREATE_FAILED', 500);
        }
        $this->log($server, $actor, 'subuser_invite_created', ['invite_id' => $invite['id'], 'permissions' => $permissions, 'max_uses' => $maxUses, 'expires_in_hours' => $hours]);

        $base = rtrim((string) App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, ''), '/');

        return ApiResponse::success([
            'id' => $invite['id'],
            'token' => $invite['token'],
            'url' => $base . '/dashboard/invites/' . $invite['token'],
        ], 'Invite created', 201);
    }

    #[OA\Delete(path: '/api/user/servers/{uuidShort}/subuser-invites/{inviteId}', summary: 'Revoke an invite link', tags: ['User - Server Subusers'], responses: [new OA\Response(response: 200, description: 'Revoked')])]
    public function revoke(Request $request, string $uuidShort, int $inviteId): Response
    {
        [$server, $error] = $this->resolve($request, $uuidShort, SubuserPermissions::USER_CREATE);
        if ($error) {
            return $error;
        }
        if (!SubuserInvite::revoke($inviteId, (int) $server['id'])) {
            return ApiResponse::error('Invite not found', 'INVITE_NOT_FOUND', 404);
        }
        $this->log($server, $request->attributes->get('user'), 'subuser_invite_revoked', ['invite_id' => $inviteId]);

        return ApiResponse::success([], 'Invite revoked', 200);
    }

    #[OA\Get(path: '/api/user/subuser-invites/{token}', summary: 'Preview an invite link', tags: ['User - Server Subusers'], responses: [new OA\Response(response: 200, description: 'Invite preview')])]
    public function preview(Request $request, string $token): Response
    {
        [$invite, $server, $error] = $this->usable($request, $token);
        if ($error) {
            return $error;
        }
        $inviter = User::getUserById((int) $invite['created_by']);

        return ApiResponse::success([
            'server' => ['name' => $server['name'], 'uuidShort' => $server['uuidShort']],
            'invited_by' => $inviter['username'] ?? null,
            'permissions' => $invite['permissions'],
            'expires_at' => date(DATE_ATOM, (int) strtotime((string) $invite['expires_at'])),
        ], 'Invite retrieved', 200);
    }

    #[OA\Post(path: '/api/user/subuser-invites/{token}', summary: 'Accept an invite link', tags: ['User - Server Subusers'], responses: [new OA\Response(response: 201, description: 'Joined the server')])]
    public function accept(Request $request, string $token): Response
    {
        [$invite, $server, $error] = $this->usable($request, $token);
        if ($error) {
            return $error;
        }
        $user = $request->attributes->get('user');
        // The inviter must still be allowed to grant these permissions.
        if (!SubuserPermissionChecker::canAssignPermissions((int) $invite['created_by'], (int) $server['id'], $invite['permissions'])) {
            return ApiResponse::error('This invite is no longer valid', 'INVITE_INVALID', 410);
        }
        if (!SubuserInvite::consume((int) $invite['id'])) {
            return ApiResponse::error('This invite is no longer valid', 'INVITE_INVALID', 410);
        }
        $now = date('Y-m-d H:i:s');
        $subuserId = Subuser::createSubuser([
            'user_id' => (int) $user['id'],
            'server_id' => (int) $server['id'],
            'permissions' => json_encode(array_values($invite['permissions'])),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        if (!$subuserId) {
            return ApiResponse::error('Failed to join the server', 'CREATE_FAILED', 500);
        }
        $this->log($server, $user, 'subuser_created', ['subuser_id' => $subuserId, 'invite_id' => (int) $invite['id']]);

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(ServerSubuserEvent::onServerSubuserCreated(), [
                'user_uuid' => $user['uuid'],
                'server_uuid' => $server['uuid'],
                'subuser_id' => $subuserId,
            ]);
        }

        return ApiResponse::success(['server' => ['name' => $server['name'], 'uuidShort' => $server['uuidShort']]], 'You now have access to this server', 201);
    }

    /** @return array{0: ?array, 1: ?Response} */
    private function resolve(Request $request, string $uuidShort, string $permission): array
    {
        if (!self::subusersAllowed()) {
            return [null, ApiResponse::error('Subusers are disabled on this host. Please contact your administrator to enable this feature.', 'SUBUSERS_NOT_ALLOWED', 403)];
        }
        $server = Server::getServerByUuidShort($uuidShort);
        if (!$server) {
            return [null, ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404)];
        }

        return [$server, $this->checkPermission($request, $server, $permission)];
    }

    /** @return array{0: ?array, 1: ?array, 2: ?Response} */
    private function usable(Request $request, string $token): array
    {
        if (!self::subusersAllowed()) {
            return [null, null, ApiResponse::error('Subusers are disabled on this host. Please contact your administrator to enable this feature.', 'SUBUSERS_NOT_ALLOWED', 403)];
        }
        $invite = SubuserInvite::findUsableByToken($token);
        $server = $invite ? Server::getServerById((int) $invite['server_id']) : null;
        if (!$invite || !$server) {
            return [null, null, ApiResponse::error('This invite link is invalid, expired or used up', 'INVITE_INVALID', 404)];
        }
        $user = $request->attributes->get('user');
        if ((int) $server['owner_id'] === (int) $user['id']) {
            return [null, null, ApiResponse::error('You already own this server', 'INVITE_OWN_SERVER', 400)];
        }
        if (Subuser::getSubuserByUserAndServer((int) $user['id'], (int) $server['id'])) {
            return [null, null, ApiResponse::error('You already have access to this server', 'SUBUSER_ALREADY_EXISTS', 400)];
        }

        return [$invite, $server, null];
    }

    private static function subusersAllowed(): bool
    {
        return App::getInstance(true)->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_SUBUSERS, 'true') !== 'false';
    }

    private function log(array $server, array $user, string $event, array $metadata): void
    {
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'],
            'ip' => $user['last_ip'] ?? null,
            'event' => $event,
            'metadata' => json_encode($metadata),
        ]);
    }
}
