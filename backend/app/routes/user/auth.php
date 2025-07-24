<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

use App\Middleware\AuthMiddleware;
use Symfony\Component\Routing\Route;
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
    $routes->add('register', new Route('/api/user/auth/register', [
        '_controller' => function (Request $request) {
            return (new RegisterController())->put($request);
        },
        '_middleware' => [],
    ], [], [], '', [], ['PUT']));

    // PUT (login)
    $routes->add('login', new Route('/api/user/auth/login', [
        '_controller' => function (Request $request) {
            return (new LoginController())->put($request);
        },
        '_middleware' => [],
    ], [], [], '', [], ['PUT']));

    // PUT (forgot password)
    $routes->add('forgot-password', new Route('/api/user/auth/forgot-password', [
        '_controller' => function (Request $request) {
            return (new ForgotPasswordController())->put($request);
        },
        '_middleware' => [],
    ], [], [], '', [], ['PUT']));

    // GET (reset password)
    $routes->add('reset-password-get', new Route('/api/user/auth/reset-password', [
        '_controller' => function (Request $request) {
            return (new ResetPasswordController())->get($request);
        },
        '_middleware' => [],
    ], [], [], '', [], ['GET']));

    // PUT (reset password)
    $routes->add('reset-password-put', new Route('/api/user/auth/reset-password', [
        '_controller' => function (Request $request) {
            return (new ResetPasswordController())->put($request);
        },
        '_middleware' => [],
    ], [], [], '', [], ['PUT']));

    // PUT (two factor)
    $routes->add('two-factor', new Route('/api/user/auth/two-factor', [
        '_controller' => function (Request $request) {
            return (new TwoFactorController())->put($request);
        },
        '_middleware' => [AuthMiddleware::class],
    ], [], [], '', [], ['PUT']));

    // GET (two factor)
    $routes->add('two-factor-get', new Route('/api/user/auth/two-factor', [
        '_controller' => function (Request $request) {
            return (new TwoFactorController())->get($request);
        },
        '_middleware' => [AuthMiddleware::class],
    ], [], [], '', [], ['GET']));

    $routes->add('auth-logout', new Route('/api/user/auth/logout', [
        '_controller' => function (Request $request) {
            return (new AuthLogoutController())->get($request);
        },
        '_middleware' => [],
    ], [], [], '', [], ['GET']));

    $routes->add('auth-two-factor-post', new Route('/api/user/auth/two-factor', [
        '_controller' => function (Request $request) {
            return (new TwoFactorController())->post($request);
        },
        '_middleware' => [],
    ], [], [], '', [], ['POST']));
};
