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
use App\Controllers\User\FeatherOs\FeatherOsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-state-get',
        '/api/user/featheros/state',
        function (Request $request) {
            return (new FeatherOsController())->getState($request);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-state-save',
        '/api/user/featheros/state',
        function (Request $request) {
            return (new FeatherOsController())->saveState($request);
        },
        ['PUT'],
        Rate::perMinute(60),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-state-reset',
        '/api/user/featheros/state',
        function (Request $request) {
            return (new FeatherOsController())->resetState($request);
        },
        ['DELETE'],
        Rate::perMinute(10),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-session-acquire',
        '/api/user/featheros/session/acquire',
        function (Request $request) {
            return (new FeatherOsController())->acquireSession($request);
        },
        ['POST'],
        Rate::perMinute(60),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-session-heartbeat',
        '/api/user/featheros/session/heartbeat',
        function (Request $request) {
            return (new FeatherOsController())->heartbeatSession($request);
        },
        ['POST'],
        Rate::perMinute(120),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-session-release',
        '/api/user/featheros/session/release',
        function (Request $request) {
            return (new FeatherOsController())->releaseSession($request);
        },
        ['POST'],
        Rate::perMinute(60),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-notes-list',
        '/api/user/featheros/notes',
        function (Request $request) {
            return (new FeatherOsController())->listNotes($request);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-notes-create',
        '/api/user/featheros/notes',
        function (Request $request) {
            return (new FeatherOsController())->createNote($request);
        },
        ['POST'],
        Rate::perMinute(30),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-notes-update',
        '/api/user/featheros/notes/{id}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Missing or invalid note ID', 'INVALID_NOTE_ID', 400);
            }

            return (new FeatherOsController())->updateNote($request, $id);
        },
        ['PUT'],
        Rate::perMinute(120),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-wallpaper-upload',
        '/api/user/featheros/wallpaper',
        function (Request $request) {
            return (new FeatherOsController())->uploadWallpaper($request);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-notes-delete',
        '/api/user/featheros/notes/{id}',
        function (Request $request, array $args) {
            $id = (int) ($args['id'] ?? 0);
            if ($id <= 0) {
                return ApiResponse::error('Missing or invalid note ID', 'INVALID_NOTE_ID', 400);
            }

            return (new FeatherOsController())->deleteNote($request, $id);
        },
        ['DELETE'],
        Rate::perMinute(30),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-trash-list',
        '/api/user/featheros/trash',
        function (Request $request) {
            return (new FeatherOsController())->listTrash($request);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-trash-register',
        '/api/user/featheros/trash',
        function (Request $request) {
            return (new FeatherOsController())->registerTrash($request);
        },
        ['POST'],
        Rate::perMinute(60),
        'user-featheros'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-featheros-trash-forget',
        '/api/user/featheros/trash/forget',
        function (Request $request) {
            return (new FeatherOsController())->forgetTrash($request);
        },
        ['POST'],
        Rate::perMinute(60),
        'user-featheros'
    );
};
