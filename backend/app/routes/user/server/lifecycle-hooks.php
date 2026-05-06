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
use App\Controllers\User\Server\ServerLifecycleHookController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-lifecycle-hooks',
        '/api/user/servers/{uuidShort}/lifecycle-hooks',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerLifecycleHookController())->getHooks($request, $server['uuid']);
        },
        'uuidShort',
        ['GET'],
        Rate::perMinute(30),
        'user-server-lifecycle-hooks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-lifecycle-hook-upsert',
        '/api/user/servers/{uuidShort}/lifecycle-hooks/{hookType}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $hookType = $args['hookType'] ?? null;
            if (!$uuidShort || !$hookType) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerLifecycleHookController())->upsertHook($request, $server['uuid'], (string) $hookType);
        },
        'uuidShort',
        ['PUT'],
        Rate::perMinute(15),
        'user-server-lifecycle-hooks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-lifecycle-hook-step-create',
        '/api/user/servers/{uuidShort}/lifecycle-hooks/{hookType}/steps',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $hookType = $args['hookType'] ?? null;
            if (!$uuidShort || !$hookType) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerLifecycleHookController())->createStep($request, $server['uuid'], (string) $hookType);
        },
        'uuidShort',
        ['POST'],
        Rate::perMinute(15),
        'user-server-lifecycle-hooks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-lifecycle-hook-step-update',
        '/api/user/servers/{uuidShort}/lifecycle-hooks/{hookType}/steps/{stepId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $hookType = $args['hookType'] ?? null;
            $stepId = $args['stepId'] ?? null;
            if (!$uuidShort || !$hookType || !$stepId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerLifecycleHookController())->updateStep($request, $server['uuid'], (string) $hookType, (int) $stepId);
        },
        'uuidShort',
        ['PUT'],
        Rate::perMinute(15),
        'user-server-lifecycle-hooks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-lifecycle-hook-step-sequence',
        '/api/user/servers/{uuidShort}/lifecycle-hooks/{hookType}/steps/{stepId}/sequence',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $hookType = $args['hookType'] ?? null;
            $stepId = $args['stepId'] ?? null;
            if (!$uuidShort || !$hookType || !$stepId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerLifecycleHookController())->updateStepSequence($request, $server['uuid'], (string) $hookType, (int) $stepId);
        },
        'uuidShort',
        ['PUT'],
        Rate::perMinute(10),
        'user-server-lifecycle-hooks'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-lifecycle-hook-step-delete',
        '/api/user/servers/{uuidShort}/lifecycle-hooks/{hookType}/steps/{stepId}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $hookType = $args['hookType'] ?? null;
            $stepId = $args['stepId'] ?? null;
            if (!$uuidShort || !$hookType || !$stepId) {
                return ApiResponse::error('Missing or invalid parameters', 'INVALID_PARAMETERS', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerLifecycleHookController())->deleteStep($request, $server['uuid'], (string) $hookType, (int) $stepId);
        },
        'uuidShort',
        ['DELETE'],
        Rate::perMinute(10),
        'user-server-lifecycle-hooks'
    );
};
