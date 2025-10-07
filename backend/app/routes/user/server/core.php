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
use App\Controllers\User\Server\ServerUserController;

return function (RouteCollection $routes): void {

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'session-servers',
        '/api/user/servers',
        function (Request $request) {
            return (new ServerUserController())->getUserServers($request);
        },
        ['GET']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-get',
        '/api/user/servers/{uuidShort}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->getServer($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['GET']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-jwt',
        '/api/user/servers/{uuidShort}/jwt',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->generateServerJwt($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-update',
        '/api/user/servers/{uuidShort}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->updateServer($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['PUT']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-reinstall',
        '/api/user/servers/{uuidShort}/reinstall',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerUserController())->reinstallServer($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-delete',
        '/api/user/servers/{uuidShort}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerUserController())->deleteServer($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['DELETE']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-command',
        '/api/user/servers/{uuidShort}/command',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            return (new ServerUserController())->sendCommand($request, $uuidShort);
        },
        'uuidShort', // Pass the server UUID for middleware
        ['POST']
    );
};
