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
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\SubdomainsController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-index',
        '/api/admin/subdomains',
        static function (Request $request) {
            return (new SubdomainsController())->index($request);
        },
        Permissions::ADMIN_SUBDOMAINS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-settings',
        '/api/admin/subdomains/settings',
        static function (Request $request) {
            if ($request->getMethod() === 'PATCH') {
                return (new SubdomainsController())->settings($request);
            }

            return (new SubdomainsController())->settings($request);
        },
        Permissions::ADMIN_SUBDOMAINS_EDIT,
        ['GET', 'PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-spells',
        '/api/admin/subdomains/spells',
        static function () {
            return (new SubdomainsController())->spells();
        },
        Permissions::ADMIN_SUBDOMAINS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-show',
        '/api/admin/subdomains/{uuid}',
        static function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new SubdomainsController())->show($request, $uuid);
        },
        Permissions::ADMIN_SUBDOMAINS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-create',
        '/api/admin/subdomains',
        static function (Request $request) {
            return (new SubdomainsController())->create($request);
        },
        Permissions::ADMIN_SUBDOMAINS_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-update',
        '/api/admin/subdomains/{uuid}',
        static function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new SubdomainsController())->update($request, $uuid);
        },
        Permissions::ADMIN_SUBDOMAINS_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-delete',
        '/api/admin/subdomains/{uuid}',
        static function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new SubdomainsController())->delete($request, $uuid);
        },
        Permissions::ADMIN_SUBDOMAINS_DELETE,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-subdomains-subdomain-list',
        '/api/admin/subdomains/{uuid}/subdomains',
        static function (Request $request, array $args) {
            $uuid = $args['uuid'] ?? null;
            if (!$uuid || !is_string($uuid)) {
                return ApiResponse::error('Missing or invalid UUID', 'INVALID_UUID', 400);
            }

            return (new SubdomainsController())->listSubdomains($uuid);
        },
        Permissions::ADMIN_SUBDOMAINS_VIEW,
        ['GET']
    );
};
