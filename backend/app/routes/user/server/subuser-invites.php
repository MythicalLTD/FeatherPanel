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
use App\Controllers\User\Server\SubuserInviteController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-subuser-invites',
        '/api/user/servers/{uuidShort}/subuser-invites',
        function (Request $request, array $args) {
            $controller = new SubuserInviteController();
            $uuidShort = (string) ($args['uuidShort'] ?? '');

            return $request->getMethod() === 'POST' ? $controller->create($request, $uuidShort) : $controller->index($request, $uuidShort);
        },
        'uuidShort',
        ['GET', 'POST'],
        Rate::perMinute(20),
        'user-server-subuser-invites'
    );

    App::getInstance(true)->registerServerRoute(
        $routes,
        'session-server-subuser-invite-revoke',
        '/api/user/servers/{uuidShort}/subuser-invites/{inviteId}',
        function (Request $request, array $args) {
            return (new SubuserInviteController())->revoke($request, (string) ($args['uuidShort'] ?? ''), (int) ($args['inviteId'] ?? 0));
        },
        'uuidShort',
        ['DELETE'],
        Rate::perMinute(20),
        'user-server-subuser-invites'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-subuser-invite',
        '/api/user/subuser-invites/{token}',
        function (Request $request, array $args) {
            $controller = new SubuserInviteController();
            $token = (string) ($args['token'] ?? '');

            return $request->getMethod() === 'POST' ? $controller->accept($request, $token) : $controller->preview($request, $token);
        },
        ['GET', 'POST'],
        Rate::perMinute(10),
        'user-subuser-invite'
    );
};
