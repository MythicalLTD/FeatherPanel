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
use RateLimit\Rate;
use App\Permissions;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\ObservabilityController;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-observability-show',
        '/api/admin/observability',
        function (Request $request) {
            return (new ObservabilityController())->show($request);
        },
        Permissions::ADMIN_SETTINGS_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-observability-update',
        '/api/admin/observability',
        function (Request $request) {
            return (new ObservabilityController())->update($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['PATCH'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-observability-token-rotate',
        '/api/admin/observability/metrics-token',
        function (Request $request) {
            return (new ObservabilityController())->rotateToken($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST'],
        Rate::perMinute(10),
        'admin-observability',
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-observability-token-revoke',
        '/api/admin/observability/metrics-token',
        function (Request $request) {
            return (new ObservabilityController())->revokeToken($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['DELETE'],
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-observability-loki-test',
        '/api/admin/observability/loki-test',
        function (Request $request) {
            return (new ObservabilityController())->testLoki($request);
        },
        Permissions::ADMIN_SETTINGS_EDIT,
        ['POST'],
        Rate::perMinute(10),
        'admin-observability',
    );
};
