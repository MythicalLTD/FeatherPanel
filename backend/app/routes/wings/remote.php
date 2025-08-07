<?php

/*
 * This file is part of MythicalPanel.
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
use App\Controllers\Wings\WingsServerController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-remote-servers',
        '/api/remote/servers',
        function (Request $request) {
            return (new WingsServerController())->remoteServers($request);
        },
        ['GET']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-remote-serveres-reset',
        '/api/remote/servers/reset',
        function (Request $request) {
            return (new WingsServerController())->resetServers($request);
        },
        ['POST']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-server-config',
        '/api/remote/servers/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsServerController())->getServer($request, $uuid);
        },
        ['GET']
    );

};
