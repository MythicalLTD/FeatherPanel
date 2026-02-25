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
use App\Controllers\User\Auth\OidcController;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\User\Auth\LoginController;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Auth\DiscordController;
use App\Controllers\User\Auth\RegisterController;
use App\Controllers\User\Auth\TwoFactorController;
use App\Controllers\User\Auth\AuthLogoutController;
use App\Controllers\User\Auth\ResetPasswordController;
use App\Controllers\User\Auth\ForgotPasswordController;

return function (RouteCollection $routes): void {
    // PUT (register)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'register',
        '/api/user/auth/register',
        function (Request $request) {
            return (new RegisterController())->put($request);
        },
        ['PUT'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-auth'
    );

    // PUT (login)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'login',
        '/api/user/auth/login',
        function (Request $request) {
            return (new LoginController())->put($request);
        },
        ['PUT'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-auth'
    );

    // PUT (forgot password)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'forgot-password',
        '/api/user/auth/forgot-password',
        function (Request $request) {
            return (new ForgotPasswordController())->put($request);
        },
        ['PUT'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-auth'
    );

    // GET (reset password)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'reset-password-get',
        '/api/user/auth/reset-password',
        function (Request $request) {
            return (new ResetPasswordController())->get($request);
        },
        ['GET'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-auth'
    );

    // PUT (reset password)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'reset-password-put',
        '/api/user/auth/reset-password',
        function (Request $request) {
            return (new ResetPasswordController())->put($request);
        },
        ['PUT'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-auth'
    );

    // PUT (two factor)
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'two-factor',
        '/api/user/auth/two-factor',
        function (Request $request) {
            return (new TwoFactorController())->put($request);
        },
        ['PUT'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-auth'
    );

    // GET (two factor)
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'two-factor-get',
        '/api/user/auth/two-factor',
        function (Request $request) {
            return (new TwoFactorController())->get($request);
        },
        ['GET']
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'auth-logout',
        '/api/user/auth/logout',
        function (Request $request) {
            return (new AuthLogoutController())->get($request);
        },
        ['GET'],
        Rate::perMinute(30), // Default: Admin can override in ratelimit.json
        'user-auth'
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'auth-two-factor-post',
        '/api/user/auth/two-factor',
        function (Request $request) {
            return (new TwoFactorController())->post($request);
        },
        ['POST'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-auth'
    );

    // Discord OAuth routes
    App::getInstance(true)->registerApiRoute(
        $routes,
        'discord-login',
        '/api/user/auth/discord/login',
        function (Request $request) {
            return (new DiscordController())->login($request);
        },
        ['GET']
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'discord-callback',
        '/api/user/auth/discord/callback',
        function (Request $request) {
            return (new DiscordController())->callback($request);
        },
        ['GET'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-auth-discord'
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'discord-link',
        '/api/user/auth/discord/link',
        function (Request $request) {
            return (new DiscordController())->link($request);
        },
        ['PUT'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-auth-discord'
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'discord-unlink',
        '/api/user/auth/discord/unlink',
        function (Request $request) {
            return (new DiscordController())->unlink($request);
        },
        ['DELETE'],
        Rate::perMinute(5), // Default: Admin can override in ratelimit.json
        'user-auth-discord'
    );

    // Generic OIDC (OpenID Connect) SSO routes
    App::getInstance(true)->registerApiRoute(
        $routes,
        'oidc-login',
        '/api/user/auth/oidc/login',
        function (Request $request) {
            return (new OidcController())->login($request);
        },
        ['GET'],
        Rate::perMinute(10),
        'user-auth-oidc'
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'oidc-callback',
        '/api/user/auth/oidc/callback',
        function (Request $request) {
            return (new OidcController())->callback($request);
        },
        ['GET'],
        Rate::perMinute(10), // Default: Admin can override in ratelimit.json
        'user-auth-oidc'
    );
};
