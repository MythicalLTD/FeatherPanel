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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Server\ServerCrashController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-crash',
        '/api/user/servers/{uuidShort}/crash',
        function (Request $request, array $args) {
            $controller = new ServerCrashController();
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return $request->getMethod() === 'DELETE' ? $controller->dismiss($request, $uuidShort) : $controller->show($request, $uuidShort);
        },
        'uuidShort',
        ['GET', 'DELETE'],
        Rate::perMinute(30),
        'user-server-crash'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'user-server-crash-auto-restart',
        '/api/user/servers/{uuidShort}/crash/auto-restart',
        function (Request $request, array $args) {
            return (new ServerCrashController())->setAutoRestart($request, (string) ($args['uuidShort'] ?? ''));
        },
        'uuidShort',
        ['PUT'],
        Rate::perMinute(10),
        'user-server-crash-auto-restart'
    );
};
