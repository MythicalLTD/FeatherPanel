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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Server\Logs\ServerLogsController;

return function (RouteCollection $routes): void {

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-logs',
        '/api/user/servers/{uuidShort}/logs',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerLogsController())->getLogs($request, $uuidShort);
        },
        'uuidShort',
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
        'uuidShort',
        ['GET']
    );
};
