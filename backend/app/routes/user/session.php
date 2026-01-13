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
use App\Controllers\User\User\SessionController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'session',
        '/api/user/session',
        function (Request $request) {
            return (new SessionController())->get($request);
        },
        ['GET'],
        Rate::perMinute(60), // Default: Admin can override in ratelimit.json
        'user-session'
    );
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'session-update',
        '/api/user/session',
        function (Request $request) {
            return (new SessionController())->put($request);
        },
        ['PATCH'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-session'
    );
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'avatar-upload',
        '/api/user/avatar',
        function (Request $request) {
            return (new SessionController())->uploadAvatar($request);
        },
        ['POST'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-session'
    );
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'preferences-get',
        '/api/user/preferences',
        function (Request $request) {
            return (new SessionController())->getPreferences($request);
        },
        ['GET']
    );
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'preferences-update',
        '/api/user/preferences',
        function (Request $request) {
            return (new SessionController())->updatePreferences($request);
        },
        ['PATCH'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-session'
    );
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'mails-get',
        '/api/user/mails',
        function (Request $request) {
            return (new SessionController())->getMails($request);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-session'
    );
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'activities-get',
        '/api/user/activities',
        function (Request $request) {
            return (new SessionController())->getActivities($request);
        },
        ['GET']
    );
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'discord-unlink',
        '/api/user/auth/discord/unlink',
        function (Request $request) {
            return (new \App\Controllers\User\Auth\DiscordController())->unlink($request);
        },
        ['DELETE'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-auth-discord'
    );
};
