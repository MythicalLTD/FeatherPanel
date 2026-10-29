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
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\NodeAlertsController;

return function (RouteCollection $routes): void {
    $app = App::getInstance(true);
    $app->registerAdminRoute($routes, 'admin-node-alerts-overview', '/api/admin/node-alerts/overview', fn (Request $r) => (new NodeAlertsController())->overview($r), Permissions::ADMIN_NODES_VIEW);
    $app->registerAdminRoute($routes, 'admin-node-alerts-history', '/api/admin/node-alerts/history', fn (Request $r) => (new NodeAlertsController())->history($r), Permissions::ADMIN_NODES_VIEW);
    $app->registerAdminRoute($routes, 'admin-node-alerts-settings', '/api/admin/node-alerts/settings', fn (Request $r) => (new NodeAlertsController())->settings($r), Permissions::ADMIN_NODES_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-node-alerts-settings-update', '/api/admin/node-alerts/settings', fn (Request $r) => (new NodeAlertsController())->updateSettings($r), Permissions::ADMIN_SETTINGS_EDIT, ['PUT']);
    $app->registerAdminRoute($routes, 'admin-node-alerts-test', '/api/admin/node-alerts/test', fn (Request $r) => (new NodeAlertsController())->test($r), Permissions::ADMIN_SETTINGS_EDIT, ['POST']);
    $app->registerAdminRoute($routes, 'admin-node-alerts-evaluate', '/api/admin/node-alerts/evaluate', fn (Request $r) => (new NodeAlertsController())->evaluate($r), Permissions::ADMIN_NODES_EDIT, ['POST']);
    $app->registerAdminRoute($routes, 'admin-node-alerts-resolve', '/api/admin/node-alerts/{id}/resolve', function (Request $r, array $args) {
        $id = $args['id'] ?? null;
        if (!$id || !is_numeric($id)) {
            return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
        }

        return (new NodeAlertsController())->resolve($r, (int) $id);
    }, Permissions::ADMIN_NODES_EDIT, ['POST']);
};
