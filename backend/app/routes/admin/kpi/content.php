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
