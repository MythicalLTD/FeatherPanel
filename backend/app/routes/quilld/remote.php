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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Quilld\FeatherQuilldConfigController;
use App\Controllers\Quilld\FeatherQuilldHealthController;
use App\Controllers\Quilld\FeatherQuilldWebSpaceController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerQuilldRoute(
        $routes,
        'quilld-remote-config',
        '/api/quilld-remote/config',
        function (Request $request) {
            return (new FeatherQuilldConfigController())->getConfig($request);
        },
        ['GET']
    );

    App::getInstance(true)->registerQuilldRoute(
        $routes,
        'quilld-remote-health',
        '/api/quilld-remote/health',
        function (Request $request) {
            return (new FeatherQuilldHealthController())->getHealth($request);
        },
        ['GET']
    );

    App::getInstance(true)->registerQuilldRoute(
        $routes,
        'quilld-remote-webspace',
        '/api/quilld-remote/webspaces/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return \App\Helpers\ApiResponse::error('Missing WebSpace UUID', 'MISSING_UUID', 400);
            }

            return (new FeatherQuilldWebSpaceController())->getWebSpace($request, (string) $uuid);
        },
        ['GET']
    );

    App::getInstance(true)->registerQuilldRoute(
        $routes,
        'quilld-remote-webspace-patch',
        '/api/quilld-remote/webspaces/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return \App\Helpers\ApiResponse::error('Missing WebSpace UUID', 'MISSING_UUID', 400);
            }

            return (new FeatherQuilldWebSpaceController())->patchWebSpace($request, (string) $uuid);
        },
        ['PATCH']
    );

    App::getInstance(true)->registerQuilldRoute(
        $routes,
        'quilld-remote-webspace-install-get',
        '/api/quilld-remote/webspaces/{uuid}/install',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return \App\Helpers\ApiResponse::error('Missing WebSpace UUID', 'MISSING_UUID', 400);
            }

            return (new FeatherQuilldWebSpaceController())->getInstall($request, (string) $uuid);
        },
        ['GET']
    );

    App::getInstance(true)->registerQuilldRoute(
        $routes,
        'quilld-remote-webspace-install-post',
        '/api/quilld-remote/webspaces/{uuid}/install',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return \App\Helpers\ApiResponse::error('Missing WebSpace UUID', 'MISSING_UUID', 400);
            }

            return (new FeatherQuilldWebSpaceController())->postInstall($request, (string) $uuid);
        },
        ['POST']
    );

    App::getInstance(true)->registerQuilldRoute(
        $routes,
        'quilld-remote-sftp-auth',
        '/api/quilld-remote/sftp/auth',
        function (Request $request) {
            return (new \App\Controllers\Quilld\Sftp\SftpAuthController())->authenticate($request);
        },
        ['POST']
    );

    App::getInstance(true)->registerQuilldRoute(
        $routes,
        'quilld-remote-transfer-status',
        '/api/quilld-remote/transfers/{uuid}',
        function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid) {
                return \App\Helpers\ApiResponse::error('Missing UUID', 'MISSING_UUID', 400);
            }

            return (new \App\Controllers\Quilld\FeatherQuilldTransferController())->postStatus($request, (string) $uuid);
        },
        ['POST']
    );

    App::getInstance(true)->registerQuilldRoute(
        $routes,
        'quilld-remote-activity',
        '/api/quilld-remote/activity',
        function (Request $request) {
            return (new \App\Controllers\Quilld\QuilldActivityController())->logActivity($request);
        },
        ['POST']
    );
};
