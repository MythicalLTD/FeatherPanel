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
use App\Controllers\User\Server\ServerActivityController;

return function (RouteCollection $routes): void {

    // User server activities (paginated across all user's servers)
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'session-server-activities-user',
        '/api/user/server-activities',
        function (Request $request) {
            return (new ServerActivityController())->getUserServerActivities($request);
        },
        ['GET']
    );

    // User recent server activities (last 10)
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'session-server-activities-recent',
        '/api/user/server-activities/recent',
        function (Request $request) {
            return (new ServerActivityController())->getRecentServerActivities($request);
        },
        ['GET']
    );

    // Activities for a specific server owned by the user
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-activities-by-server',
        '/api/user/servers/{uuidShort}/activities',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;
            if (!$uuidShort) {
                return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
            }

            $server = \App\Chat\Server::getServerByUuidShort($uuidShort);
            if (!$server) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }

            return (new ServerActivityController())->getServerActivities($request, (int) $server['id']);
        },
        'uuidShort',
        ['GET']
    );
};
