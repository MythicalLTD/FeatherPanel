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
use App\Permissions;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\Admin\RateLimitController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits',
        '/api/admin/rate-limits',
        function (Request $request) {
            return (new RateLimitController())->index($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits-show',
        '/api/admin/rate-limits/{routeName}',
        function (Request $request, string $routeName) {
            return (new RateLimitController())->show($request, $routeName);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits-update',
        '/api/admin/rate-limits/{routeName}',
        function (Request $request, string $routeName) {
            return (new RateLimitController())->update($request, $routeName);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits-delete',
        '/api/admin/rate-limits/{routeName}',
        function (Request $request, string $routeName) {
            return (new RateLimitController())->delete($request, $routeName);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits-bulk-update',
        '/api/admin/rate-limits/bulk',
        function (Request $request) {
            return (new RateLimitController())->bulkUpdate($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-rate-limits-global',
        '/api/admin/rate-limits/global',
        function (Request $request) {
            return (new RateLimitController())->updateGlobal($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PATCH']
    );
};
