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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\KPI\ContentController;

return function (RouteCollection $routes): void {
    // Realms Overview
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-realms-overview',
        '/api/admin/analytics/realms/overview',
        function (Request $request) {
            return (new ContentController())->getRealmsOverview($request);
        },
        Permissions::ADMIN_REALMS_VIEW,
    );

    // Spells by Realm
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-spells-by-realm',
        '/api/admin/analytics/spells/by-realm',
        function (Request $request) {
            return (new ContentController())->getSpellsByRealm($request);
        },
        Permissions::ADMIN_SPELLS_VIEW,
    );

    // Spells Overview
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-spells-overview',
        '/api/admin/analytics/spells/overview',
        function (Request $request) {
            return (new ContentController())->getSpellsOverview($request);
        },
        Permissions::ADMIN_SPELLS_VIEW,
    );

    // Spell Variables
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-spells-variables',
        '/api/admin/analytics/spells/variables',
        function (Request $request) {
            return (new ContentController())->getSpellVariableStats($request);
        },
        Permissions::ADMIN_SPELLS_VIEW,
    );

    // Images Overview
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-images-overview',
        '/api/admin/analytics/images/overview',
        function (Request $request) {
            return (new ContentController())->getImagesOverview($request);
        },
        Permissions::ADMIN_IMAGES_VIEW,
    );

    // Redirect Links Overview
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-redirect-links-overview',
        '/api/admin/analytics/redirect-links/overview',
        function (Request $request) {
            return (new ContentController())->getRedirectLinksOverview($request);
        },
        Permissions::ADMIN_REDIRECT_LINKS_VIEW,
    );

    // Mail Templates Overview
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-mail-templates-overview',
        '/api/admin/analytics/mail-templates/overview',
        function (Request $request) {
            return (new ContentController())->getMailTemplatesOverview($request);
        },
        Permissions::ADMIN_TEMPLATE_EMAIL_VIEW,
    );

    // Complete Content Dashboard
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-analytics-content-dashboard',
        '/api/admin/analytics/content/dashboard',
        function (Request $request) {
            return (new ContentController())->getDashboard($request);
        },
        Permissions::ADMIN_REALMS_VIEW,
    );
};
