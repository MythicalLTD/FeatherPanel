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
use App\Controllers\Admin\AllocationsController;

return function (RouteCollection $routes): void {
    // LIST - GET /api/admin/allocations
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-allocations',
        '/api/admin/allocations',
        function (Request $request) {
            return (new AllocationsController())->index($request);
        },
        Permissions::ADMIN_ALLOCATIONS_VIEW,
    );

    // CREATE - PUT /api/admin/allocations
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-allocations-create',
        '/api/admin/allocations',
        function (Request $request) {
            return (new AllocationsController())->create($request);
        },
        Permissions::ADMIN_ALLOCATIONS_CREATE,
        ['PUT']
    );

    // SPECIFIC ROUTES (must come BEFORE parameterized routes)
    // Available allocations - GET /api/admin/allocations/available
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-allocations-available',
        '/api/admin/allocations/available',
        function (Request $request) {
            return (new AllocationsController())->getAvailable($request);
        },
        Permissions::ADMIN_ALLOCATIONS_VIEW,
    );

    // Bulk delete - DELETE /api/admin/allocations/bulk-delete
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-allocations-bulk-delete',
        '/api/admin/allocations/bulk-delete',
        function (Request $request) {
            return (new AllocationsController())->bulkDelete($request);
        },
        Permissions::ADMIN_ALLOCATIONS_DELETE,
        ['DELETE']
    );

    // Delete unused - DELETE /api/admin/allocations/delete-unused
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-allocations-delete-unused',
        '/api/admin/allocations/delete-unused',
        function (Request $request) {
            return (new AllocationsController())->deleteUnused($request);
        },
        Permissions::ADMIN_ALLOCATIONS_DELETE,
        ['DELETE']
    );

    // PARAMETERIZED ROUTES (must come AFTER specific routes)
    // Show single - GET /api/admin/allocations/{id}
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-allocations-show',
        '/api/admin/allocations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new AllocationsController())->show($request, (int) $id);
        },
        Permissions::ADMIN_ALLOCATIONS_VIEW,
    );

    // Update - PATCH /api/admin/allocations/{id}
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-allocations-update',
        '/api/admin/allocations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new AllocationsController())->update($request, (int) $id);
        },
        Permissions::ADMIN_ALLOCATIONS_EDIT,
        ['PATCH']
    );

    // Delete - DELETE /api/admin/allocations/{id}
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-allocations-delete',
        '/api/admin/allocations/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new AllocationsController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_ALLOCATIONS_DELETE,
        ['DELETE']
    );

    // Assign to server - POST /api/admin/allocations/{id}/assign
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-allocations-assign',
        '/api/admin/allocations/{id}/assign',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new AllocationsController())->assignToServer($request, (int) $id);
        },
        Permissions::ADMIN_ALLOCATIONS_EDIT,
        ['POST']
    );

    // Unassign from server - POST /api/admin/allocations/{id}/unassign
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-allocations-unassign',
        '/api/admin/allocations/{id}/unassign',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new AllocationsController())->unassignFromServer($request, (int) $id);
        },
        Permissions::ADMIN_ALLOCATIONS_EDIT,
        ['POST']
    );
};
