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
        function (Request $request, int $id) {
            return (new RedirectLinksController())->show($request, $id);
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
        function (Request $request, int $id) {
            return (new RedirectLinksController())->update($request, $id);
        },
        Permissions::ADMIN_REDIRECT_LINKS_EDIT,
        ['PATCH']
    );

    // Delete redirect link
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-redirect-links-delete',
        '/api/admin/redirect-links/{id}',
        function (Request $request, int $id) {
            return (new RedirectLinksController())->delete($request, $id);
        },
        Permissions::ADMIN_REDIRECT_LINKS_DELETE,
        ['DELETE']
    );
};
