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
use App\Controllers\Admin\LocationsController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-locations',
        '/api/admin/locations',
        function (Request $request) {
            return (new LocationsController())->index($request);
        },
        Permissions::ADMIN_LOCATIONS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-locations-show',
        '/api/admin/locations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new LocationsController())->show($request, (int) $id);
        },
        Permissions::ADMIN_LOCATIONS_VIEW,
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-locations-update',
        '/api/admin/locations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new LocationsController())->update($request, (int) $id);
        },
        Permissions::ADMIN_LOCATIONS_EDIT,
        ['PATCH']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-locations-delete',
        '/api/admin/locations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new LocationsController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_LOCATIONS_DELETE,
        ['DELETE']
    );
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-locations-create',
        '/api/admin/locations',
        function (Request $request) {
            return (new LocationsController())->create($request);
        },
        Permissions::ADMIN_LOCATIONS_CREATE,
        ['PUT']
    );
};
