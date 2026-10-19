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
use App\Controllers\Admin\AuditLogController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    $routesDef = [
        ['admin-audit-log', '/api/admin/audit-log', 'index'],
        ['admin-audit-log-filters', '/api/admin/audit-log/filters', 'filters'],
        ['admin-audit-log-export', '/api/admin/audit-log/export', 'export'],
    ];
    foreach ($routesDef as [$name, $path, $method]) {
        App::getInstance(true)->registerAdminRoute(
            $routes,
            $name,
            $path,
            function (Request $request) use ($method) {
                return (new AuditLogController())->{$method}($request);
            },
            Permissions::ADMIN_USERS_VIEW,
            ['GET']
        );
    }
};
