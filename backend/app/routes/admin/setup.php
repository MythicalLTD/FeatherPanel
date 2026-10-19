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
use App\Controllers\Admin\SetupWizardController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-setup-status',
        '/api/admin/setup/status',
        function (Request $request) {
            return (new SetupWizardController())->status($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
        ['GET']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-setup-complete',
        '/api/admin/setup/complete',
        function (Request $request) {
            return (new SetupWizardController())->complete($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-setup-reset',
        '/api/admin/setup/reset',
        function (Request $request) {
            return (new SetupWizardController())->reset($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST']
    );
};
