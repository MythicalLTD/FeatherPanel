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
use App\Controllers\User\User\SessionsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-sessions-list',
        '/api/user/sessions',
        function (Request $request) {
            return (new SessionsController())->index($request);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-session'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-sessions-revoke-others',
        '/api/user/sessions/revoke-others',
        function (Request $request) {
            return (new SessionsController())->revokeOthers($request);
        },
        ['POST'],
        Rate::perMinute(10),
        'user-session'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-sessions-revoke',
        '/api/user/sessions/{id}',
        function (Request $request, array $args) {
            return (new SessionsController())->revoke($request, (int) ($args['id'] ?? 0));
        },
        ['DELETE'],
        Rate::perMinute(30),
        'user-session'
    );
};
