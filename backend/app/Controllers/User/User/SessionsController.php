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

namespace App\Controllers\User\User;

use App\Chat\User;
use App\Chat\Activity;
use App\Chat\UserSession;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\SessionCookieHelper;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Tag(name: 'User - Sessions', description: 'Signed-in devices of the current user')]
class SessionsController
{
    #[OA\Get(
        path: '/api/user/sessions',
        summary: 'List active sessions',
        tags: ['User - Sessions'],
        responses: [new OA\Response(response: 200, description: 'Active sessions')]
    )]
    public function index(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user || $request->attributes->get('auth_type') !== 'session') {
            return ApiResponse::error('Sessions are only available for browser sign-ins', 'SESSION_REQUIRED', 400);
        }

        $currentId = UserSession::currentId();
        $rows = UserSession::listActive((int) $user['id'], (string) ($user['remember_token'] ?? ''));
        $sessions = array_map(static fn (array $row) => [
            'id' => (int) $row['id'],
            'ip_address' => $row['ip_address'],
            'user_agent' => $row['user_agent'],
            'created_at' => $row['created_at'],
            'last_seen_at' => $row['last_seen_at'],
            'current' => $currentId !== null && (int) $row['id'] === $currentId,
        ], $rows);

        return ApiResponse::success([
            'sessions' => $sessions,
            // Signed in with an older cookie that predates per-device sessions.
            'current_is_legacy' => $currentId === null,
        ], 'Sessions retrieved', 200);
    }

    #[OA\Delete(
        path: '/api/user/sessions/{id}',
        summary: 'Sign out one session',
        tags: ['User - Sessions'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [new OA\Response(response: 200, description: 'Session revoked')]
    )]
    public function revoke(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        if (!$user || $request->attributes->get('auth_type') !== 'session') {
            return ApiResponse::error('Sessions are only available for browser sign-ins', 'SESSION_REQUIRED', 400);
        }
        if (UserSession::currentId() === $id) {
            return ApiResponse::error('Use sign out to end the current session', 'CURRENT_SESSION', 400);
        }
        if (!UserSession::revoke($id, (int) $user['id'])) {
            return ApiResponse::error('Session not found', 'SESSION_NOT_FOUND', 404);
        }

        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'session_revoked',
            'context' => 'Signed out a session',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Session revoked', 200);
    }

    #[OA\Post(
        path: '/api/user/sessions/revoke-others',
        summary: 'Sign out every other session',
        tags: ['User - Sessions'],
        responses: [new OA\Response(response: 200, description: 'Other sessions revoked')]
    )]
    public function revokeOthers(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user || $request->attributes->get('auth_type') !== 'session') {
            return ApiResponse::error('Sessions are only available for browser sign-ins', 'SESSION_REQUIRED', 400);
        }

        $currentId = UserSession::currentId();
        $revoked = UserSession::revokeOthers((int) $user['id'], $currentId);

        // Rotate the account token so older cookies (from before per-device sessions) stop working too.
        $newAccountToken = User::generateAccountToken();
        if (!User::updateUser($user['uuid'], ['remember_token' => $newAccountToken])) {
            return ApiResponse::error('Failed to sign out other sessions', 'INTERNAL_SERVER_ERROR', 500);
        }
        if ($currentId !== null) {
            UserSession::rebind($currentId, $newAccountToken);
        } else {
            SessionCookieHelper::startSession($user, $newAccountToken, time() + UserSession::LIFETIME_SECONDS);
        }

        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'sessions_revoked',
            'context' => 'Signed out all other sessions',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['revoked' => $revoked], 'Other sessions revoked', 200);
    }
}
