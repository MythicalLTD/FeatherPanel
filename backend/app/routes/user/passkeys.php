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
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Auth\PasskeyController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerApiRoute(
        $routes,
        'passkeys-status',
        '/api/user/auth/passkeys/status',
        function (Request $request) {
            return (new PasskeyController())->postStatus($request);
        },
        ['POST'],
        Rate::perMinute(30),
        'user-auth'
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'passkeys-authentication-options',
        '/api/user/auth/passkeys/authentication/options',
        function (Request $request) {
            return (new PasskeyController())->postAuthenticationOptions($request);
        },
        ['POST'],
        Rate::perMinute(30),
        'user-auth'
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'passkeys-authentication-verify',
        '/api/user/auth/passkeys/authentication/verify',
        function (Request $request) {
            return (new PasskeyController())->postAuthenticationVerify($request);
        },
        ['POST'],
        Rate::perMinute(20),
        'user-auth'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'passkeys-list',
        '/api/user/passkeys',
        function (Request $request) {
            return (new PasskeyController())->getList($request);
        },
        ['GET'],
        Rate::perMinute(60),
        'user-session'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'passkeys-registration-options',
        '/api/user/passkeys/registration/options',
        function (Request $request) {
            return (new PasskeyController())->postRegistrationOptions($request);
        },
        ['POST'],
        Rate::perMinute(15),
        'user-session'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'passkeys-registration-verify',
        '/api/user/passkeys/registration/verify',
        function (Request $request) {
            return (new PasskeyController())->postRegistrationVerify($request);
        },
        ['POST'],
        Rate::perMinute(15),
        'user-session'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'passkeys-delete',
        '/api/user/passkeys/{id}',
        function (Request $request, array $parameters) {
            $id = $parameters['id'] ?? null;
            if ($id === null || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid passkey id', 'INVALID_ID', 400);
            }

            return (new PasskeyController())->delete($request, $parameters);
        },
        ['DELETE'],
        Rate::perMinute(30),
        'user-session'
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'passkeys-patch',
        '/api/user/passkeys/{id}',
        function (Request $request, array $parameters) {
            $id = $parameters['id'] ?? null;
            if ($id === null || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid passkey id', 'INVALID_ID', 400);
            }

            return (new PasskeyController())->patch($request, $parameters);
        },
        ['PATCH'],
        Rate::perMinute(30),
        'user-session'
    );
};
