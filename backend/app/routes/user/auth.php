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
