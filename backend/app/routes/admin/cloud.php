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
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\Admin\CloudDataController;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\CloudManagementController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-credentials',
        '/api/admin/cloud/credentials',
        static function (Request $request) {
            return (new CloudManagementController())->show($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-credentials-panel',
        '/api/admin/cloud/credentials/panel',
        static function (Request $request) {
            return (new CloudManagementController())->storePanel($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PUT'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-credentials-cloud',
        '/api/admin/cloud/credentials/cloud',
        static function (Request $request) {
            return (new CloudManagementController())->storeCloud($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PUT'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-credentials-rotate',
        '/api/admin/cloud/credentials/rotate',
        static function (Request $request) {
            return (new CloudManagementController())->rotate($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-oauth2-link',
        '/api/admin/cloud/oauth2/link',
        static function (Request $request) {
            return (new CloudManagementController())->getOAuth2Link($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-oauth2-callback',
        '/api/admin/cloud/oauth2/callback',
        static function (Request $request) {
            return (new CloudManagementController())->saveOAuth2Callback($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST'],
    );

    // Cloud Data Endpoints (Admin Root Only)
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-summary',
        '/api/admin/cloud/data/summary',
        static function (Request $request) {
            return (new CloudDataController())->getSummary($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-credits',
        '/api/admin/cloud/data/credits',
        static function (Request $request) {
            return (new CloudDataController())->getCredits($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-team',
        '/api/admin/cloud/data/team',
        static function (Request $request) {
            return (new CloudDataController())->getTeam($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-data-products',
        '/api/admin/cloud/data/products',
        static function (Request $request) {
            return (new CloudDataController())->getProducts($request);
        },
        Permissions::ADMIN_ROOT,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-cloud-download-package',
        '/api/admin/cloud/data/download/{packageName}/{version}',
        static function (Request $request, string $packageName, string $version) {
            return (new CloudDataController())->downloadPackage($request, $packageName, $version);
        },
        Permissions::ADMIN_ROOT,
    );
};
