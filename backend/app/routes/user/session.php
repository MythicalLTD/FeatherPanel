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
