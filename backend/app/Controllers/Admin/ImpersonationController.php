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
use App\Helpers\ApiResponse;
use App\Helpers\Impersonation;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ImpersonationController
{
    public function start(Request $request, string $uuid): Response
    {
        $admin = $request->attributes->get('impersonator') ?? $request->attributes->get('user');
        if ($request->attributes->has('impersonator')) {
            return ApiResponse::error('Stop viewing as the current user first', 'IMPERSONATION_ACTIVE', 409);
        }
        if ($request->attributes->get('auth_type') !== 'session') {
            return ApiResponse::error('Viewing as a user needs a browser session', 'IMPERSONATION_SESSION_REQUIRED', 400);
        }
        $target = User::getUserByUuid($uuid);
        if (!$target) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }
        if (($target['banned'] ?? 'false') === 'true') {
            return ApiResponse::error('This user is banned', 'IMPERSONATION_NOT_ALLOWED', 403);
        }
        $reason = Impersonation::canImpersonate($admin, $target);
        if ($reason !== null) {
            return ApiResponse::error($reason, 'IMPERSONATION_NOT_ALLOWED', 403);
        }
        Impersonation::start($admin, $target);

        return ApiResponse::success(['uuid' => $target['uuid'], 'username' => $target['username']], 'Now viewing the panel as ' . $target['username'], 200);
    }

    public function stop(Request $request): Response
    {
        $admin = $request->attributes->get('impersonator');
        if (!is_array($admin)) {
            Impersonation::stop($request->attributes->get('user') ?? [], null);

            return ApiResponse::success([], 'Not viewing as another user', 200);
        }
        Impersonation::stop($admin, $request->attributes->get('user'));

        return ApiResponse::success([], 'Stopped viewing as this user', 200);
    }
}
