<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-logs-upload',
        '/api/user/servers/{uuidShort}/logs/upload',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerLogsController())->uploadLogs($request, $uuidShort);
        },
        'uuidShort',
        ['POST']
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-install-logs-upload',
        '/api/user/servers/{uuidShort}/install-logs/upload',
        function (Request $request, array $args) {
            $uuidShort = $args['uuidShort'] ?? null;

            return (new ServerLogsController())->uploadInstallLogs($request, $uuidShort);
        },
        'uuidShort',
        ['POST']
    );
};
