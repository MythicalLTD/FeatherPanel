<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
use App\Controllers\Admin\RedirectLinksController;

return function ($routes) {
    // List redirect links
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-redirect-links-list',
        '/api/admin/redirect-links',
        function (Request $request) {
            return (new RedirectLinksController())->index($request);
        },
        Permissions::ADMIN_REDIRECT_LINKS_VIEW,
        ['GET']
    );

    // Get specific redirect link
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-redirect-links-show',
        '/api/admin/redirect-links/{id}',
        function (Request $request, $id) {
            if (is_array($id)) {
                // take the first value if possible
                $id = $id['id'] ?? array_values($id)[0];
            }
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new RedirectLinksController())->show($request, (int) $id);
        },
        Permissions::ADMIN_REDIRECT_LINKS_VIEW,
        ['GET']
    );

    // Create new redirect link
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-redirect-links-create',
        '/api/admin/redirect-links',
        function (Request $request) {
            return (new RedirectLinksController())->create($request);
        },
        Permissions::ADMIN_REDIRECT_LINKS_CREATE,
        ['POST']
    );

    // Update redirect link
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-redirect-links-update',
        '/api/admin/redirect-links/{id}',
        function (Request $request, $id) {
            if (is_array($id)) {
                $id = $id['id'] ?? array_values($id)[0];
            }
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new RedirectLinksController())->update($request, (int) $id);
        },
        Permissions::ADMIN_REDIRECT_LINKS_EDIT,
        ['PATCH']
    );

    // Delete redirect link
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-redirect-links-delete',
        '/api/admin/redirect-links/{id}',
        function (Request $request, $id) {
            if (is_array($id)) {
                $id = $id['id'] ?? array_values($id)[0];
            }
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new RedirectLinksController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_REDIRECT_LINKS_DELETE,
        ['DELETE']
    );
};
