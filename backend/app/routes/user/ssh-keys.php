<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
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
