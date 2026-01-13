<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
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
