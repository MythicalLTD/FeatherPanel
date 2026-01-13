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

use App\App;
use RateLimit\Rate;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\User\UserSshKeyController;

return function (RouteCollection $routes): void {

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-ssh-keys',
        '/api/user/ssh-keys',
        function (Request $request) {
            return (new UserSshKeyController())->getUserSshKeys($request);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-ssh-keys'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-ssh-key-create',
        '/api/user/ssh-keys',
        function (Request $request) {
            return (new UserSshKeyController())->createUserSshKey($request);
        },
        ['POST']
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-ssh-key-get',
        '/api/user/ssh-keys/{id}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Missing or invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
            }

            return (new UserSshKeyController())->getUserSshKey($request, $id);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-ssh-keys'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-ssh-key-update',
        '/api/user/ssh-keys/{id}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Missing or invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
            }

            return (new UserSshKeyController())->updateUserSshKey($request, $id);
        },
        ['PUT'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-ssh-keys'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-ssh-key-delete',
        '/api/user/ssh-keys/{id}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Missing or invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
            }

            return (new UserSshKeyController())->deleteUserSshKey($request, $id);
        },
        ['DELETE'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-ssh-keys'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-ssh-key-restore',
        '/api/user/ssh-keys/{id}/restore',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Missing or invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
            }

            return (new UserSshKeyController())->restoreUserSshKey($request, $id);
        },
        ['POST']
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-ssh-key-hard-delete',
        '/api/user/ssh-keys/{id}/hard-delete',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Missing or invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
            }

            return (new UserSshKeyController())->hardDeleteUserSshKey($request, $id);
        },
        ['DELETE'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-ssh-keys'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-ssh-key-generate-fingerprint',
        '/api/user/ssh-keys/generate-fingerprint',
        function (Request $request) {
            return (new UserSshKeyController())->generateFingerprint($request);
        },
        ['POST']
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-ssh-key-activities',
        '/api/user/ssh-keys/activities',
        function (Request $request) {
            return (new UserSshKeyController())->getUserSshKeyActivities($request);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-ssh-keys'
    );
};
