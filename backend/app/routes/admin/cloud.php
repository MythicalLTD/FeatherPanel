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
