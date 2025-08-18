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
use App\Controllers\Wings\Sftp\SftpAuthController;
use App\Controllers\Wings\Activity\WingsActivityController;
use App\Controllers\Wings\Server\WingsServerInfoController;
use App\Controllers\Wings\Server\WingsServerListController;
use App\Controllers\Wings\Server\WingsServersResetController;
use App\Controllers\Wings\Server\WingsServerStatusController;
use App\Controllers\Wings\Server\WingsServerInstallController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-remote-servers',
        '/api/remote/servers',
        function (Request $request) {
            return (new WingsServerListController())->getRemoteServers($request);
        },
        ['GET']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-remote-serveres-reset',
        '/api/remote/servers/reset',
        function (Request $request) {
            return (new WingsServersResetController())->resetServers($request);
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

            return (new WingsServerInfoController())->getServer($request, $uuid);
        },
        ['GET']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-server-install',
        '/api/remote/servers/{uuid}/install',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsServerInstallController())->getServerInstall($request, $uuid);
        },
        ['GET']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-server-install-done',
        '/api/remote/servers/{uuid}/install',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsServerInstallController())->postServerInstall($request, $uuid);
        },
        ['POST']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-server-status',
        '/api/remote/servers/{uuid}/container/status',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return ApiResponse::error('Missing server UUID', 'MISSING_SERVER_UUID', 400);
            }

            return (new WingsServerStatusController())->updateContainerStatus($request, $uuid);
        },
        ['POST']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-server-activity',
        '/api/remote/activity',
        function (Request $request) {
            return (new WingsActivityController())->logActivity($request);
        },
        ['POST']
    );

    App::getInstance(true)->registerWingsRoute(
        $routes,
        'wings-sftp-auth',
        '/api/remote/sftp/auth',
        function (Request $request) {
            return (new SftpAuthController())->authenticate($request);
        },
        ['POST']
    );
};
