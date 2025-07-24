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
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\User\SessionController;

return function (RouteCollection $routes): void {

    $routes->add('session', new Route('/api/user/session', [
        '_controller' => function (Request $request) {
            return (new SessionController())->get($request);
        },
        '_middleware' => [AuthMiddleware::class],
    ], [], [], '', [], ['GET']));
};
