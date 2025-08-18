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
use App\Controllers\User\Server\Logs\ServerLogsController;
use App\Controllers\User\Server\Power\ServerPowerController;

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

    App::getInstance(true)->registerAuthRoute(
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
        ['GET']
    );

    App::getInstance(true)->registerAuthRoute(
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
        '{uuidShort}', // Pass the server UUID for middleware
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
        '{uuidShort}', // Pass the server UUID for middleware
        ['POST']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-power',
        '/api/user/servers/{uuidShort}/power/{action}',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            $action = $args['action'] ?? null;
            if (!$uuidShort || !$action) {
                return ApiResponse::error('Missing or invalid UUID short or action', 'INVALID_UUID_SHORT_OR_ACTION', 400);
            }

            return (new ServerPowerController())->sendPowerAction($request, $uuidShort, $action);
        },
        '{uuidShort}', // Pass the server UUID for middleware
        ['POST']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-logs',
        '/api/user/servers/{uuidShort}/logs',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerLogsController())->getLogs($request, $uuidShort);
        },
        '{uuidShort}', // Pass the server UUID for middleware
        ['GET']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-install-logs',
        '/api/user/servers/{uuidShort}/install-logs',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerLogsController())->getInstallLogs($request, $uuidShort);
        },
        '{uuidShort}', // Pass the server UUID for middleware
        ['GET']
    );
};
