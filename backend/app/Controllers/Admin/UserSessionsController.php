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

namespace App\Controllers\Admin;

use App\Chat\User;
use App\Chat\Activity;
use App\Chat\UserSession;
use App\Helpers\AdminRank;
use App\Helpers\ApiResponse;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin view of another user's signed-in sessions. Reading needs "view users",
 * signing out needs "edit users" and is blocked against higher-ranked accounts.
 */
class UserSessionsController
{
    public function index(Request $request, string $uuid): Response
    {
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }
        $sessions = array_map(static fn (array $s): array => [
            'id' => (int) $s['id'],
            'ip_address' => $s['ip_address'],
            'user_agent' => $s['user_agent'],
            'created_at' => $s['created_at'],
            'last_seen_at' => $s['last_seen_at'],
        ], UserSession::listActive((int) $user['id'], (string) ($user['remember_token'] ?? '')));

        return ApiResponse::success([
            'sessions' => $sessions,
            'two_fa_enabled' => ($user['two_fa_enabled'] ?? 'false') === 'true',
            'two_fa_required' => \App\Services\Security\SecurityPolicy::twoFactorApplies($user),
        ], 'Sessions loaded');
    }

    public function revoke(Request $request, string $uuid, int $id): Response
    {
        $user = $this->target($request, $uuid, $error);
        if ($user === null) {
            return $error;
        }
        if (!UserSession::revoke($id, (int) $user['id'])) {
            return ApiResponse::error('Session not found', 'ADMIN_SESSION_NOT_FOUND', 404);
        }
        $this->log($request, $user, 'admin_user_session_revoke', 'Signed out session #' . $id . ' of ' . $user['username']);

        return ApiResponse::success([], 'Session signed out');
    }

    public function revokeAll(Request $request, string $uuid): Response
    {
        $user = $this->target($request, $uuid, $error);
        if ($user === null) {
            return $error;
        }
        $count = UserSession::revokeOthers((int) $user['id'], null);
        // Rotating the account token also ends any legacy remember-me cookies and API sessions bound to it.
        User::updateUser($user['uuid'], ['remember_token' => User::generateAccountToken()]);
        $this->log($request, $user, 'admin_user_sessions_revoke_all', 'Signed out all ' . $count . ' sessions of ' . $user['username']);

        return ApiResponse::success(['revoked' => $count], 'All sessions signed out');
    }

    private function target(Request $request, string $uuid, ?Response &$error): ?array
    {
        $error = null;
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            $error = ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);

            return null;
        }
        $actor = $request->attributes->get('user');
        if (($actor['uuid'] ?? null) === $user['uuid']) {
            $error = ApiResponse::error('Use your account page to manage your own sessions', 'ADMIN_SESSIONS_SELF', 422);

            return null;
        }
        $rankDenied = AdminRank::check($actor, $user);
        if ($rankDenied !== null) {
            $error = ApiResponse::error($rankDenied, 'TARGET_OUTRANKS_ACTOR', 403);

            return null;
        }

        return $user;
    }

    private function log(Request $request, array $user, string $name, string $context): void
    {
        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => $name,
            'context' => $context,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
    }
}
