<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
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
