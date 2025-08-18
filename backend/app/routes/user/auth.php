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
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\User\Auth\LoginController;
use Symfony\Component\Routing\RouteCollection;
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
        ['PUT']
    );

    // PUT (login)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'login',
        '/api/user/auth/login',
        function (Request $request) {
            return (new LoginController())->put($request);
        },
        ['PUT']
    );

    // PUT (forgot password)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'forgot-password',
        '/api/user/auth/forgot-password',
        function (Request $request) {
            return (new ForgotPasswordController())->put($request);
        },
        ['PUT']
    );

    // GET (reset password)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'reset-password-get',
        '/api/user/auth/reset-password',
        function (Request $request) {
            return (new ResetPasswordController())->get($request);
        },
        ['GET']
    );

    // PUT (reset password)
    App::getInstance(true)->registerApiRoute(
        $routes,
        'reset-password-put',
        '/api/user/auth/reset-password',
        function (Request $request) {
            return (new ResetPasswordController())->put($request);
        },
        ['PUT']
    );

    // PUT (two factor)
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'two-factor',
        '/api/user/auth/two-factor',
        function (Request $request) {
            return (new TwoFactorController())->put($request);
        },
        ['PUT']
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
        ['GET']
    );

    App::getInstance(true)->registerApiRoute(
        $routes,
        'auth-two-factor-post',
        '/api/user/auth/two-factor',
        function (Request $request) {
            return (new TwoFactorController())->post($request);
        },
        ['POST']
    );
};
