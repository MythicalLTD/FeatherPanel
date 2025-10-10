<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

use App\App;
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
        ['GET']
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
        ['GET']
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
        ['PUT']
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
        ['DELETE']
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
        ['DELETE']
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
        ['GET']
    );

};
