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
use App\Controllers\Admin\ImagesController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    // List images
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-images',
        '/api/admin/images',
        function (Request $request) {
            return (new ImagesController())->index($request);
        },
        Permissions::ADMIN_IMAGES_VIEW,
        ['GET']
    );

    // Get specific image
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-images-show',
        '/api/admin/images/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Invalid image ID', 'INVALID_IMAGE_ID', 400);
            }

            return (new ImagesController())->show($request, (int) $id);
        },
        Permissions::ADMIN_IMAGES_VIEW,
        ['GET']
    );

    // Create new image
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-images-create',
        '/api/admin/images',
        function (Request $request) {
            return (new ImagesController())->create($request);
        },
        Permissions::ADMIN_IMAGES_CREATE,
        ['POST']
    );

    // Upload image file
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-images-upload',
        '/api/admin/images/upload',
        function (Request $request) {
            return (new ImagesController())->upload($request);
        },
        Permissions::ADMIN_IMAGES_CREATE,
        ['POST']
    );

    // Update image
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-images-update',
        '/api/admin/images/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Invalid image ID', 'INVALID_IMAGE_ID', 400);
            }

            return (new ImagesController())->update($request, (int) $id);
        },
        Permissions::ADMIN_IMAGES_EDIT,
        ['PATCH']
    );

    // Delete image
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-images-delete',
        '/api/admin/images/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Invalid image ID', 'INVALID_IMAGE_ID', 400);
            }

            return (new ImagesController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_IMAGES_DELETE,
        ['DELETE']
    );
};
