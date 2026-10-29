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
use App\Controllers\Admin\DiskQuotaController;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\InactiveCleanupController;

return function (RouteCollection $routes): void {
    $app = App::getInstance(true);
    $withId = static fn (callable $fn) => static function (Request $r, array $args) use ($fn) {
        $id = $args['id'] ?? null;
        if (!$id || !is_numeric($id)) {
            return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
        }

        return $fn($r, (int) $id);
    };

    $app->registerAdminRoute($routes, 'admin-inactive-cleanup-settings', '/api/admin/inactive-cleanup/settings', fn (Request $r) => (new InactiveCleanupController())->settings($r), Permissions::ADMIN_SERVERS_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-inactive-cleanup-settings-update', '/api/admin/inactive-cleanup/settings', fn (Request $r) => (new InactiveCleanupController())->updateSettings($r), Permissions::ADMIN_SERVERS_DELETE, ['PUT']);
    $app->registerAdminRoute($routes, 'admin-inactive-cleanup-preview', '/api/admin/inactive-cleanup/preview', fn (Request $r) => (new InactiveCleanupController())->preview($r), Permissions::ADMIN_SERVERS_VIEW, ['POST']);
    $app->registerAdminRoute($routes, 'admin-inactive-cleanup-run', '/api/admin/inactive-cleanup/run', fn (Request $r) => (new InactiveCleanupController())->run($r), Permissions::ADMIN_SERVERS_DELETE, ['POST']);
    $app->registerAdminRoute($routes, 'admin-inactive-cleanup-archives', '/api/admin/inactive-cleanup/archives', fn (Request $r) => (new InactiveCleanupController())->archives($r), Permissions::ADMIN_SERVERS_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-inactive-cleanup-server', '/api/admin/inactive-cleanup/servers/{id}', $withId(fn (Request $r, int $id) => (new InactiveCleanupController())->serverStatus($r, $id)), Permissions::ADMIN_SERVERS_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-inactive-cleanup-server-exempt', '/api/admin/inactive-cleanup/servers/{id}/exempt', $withId(fn (Request $r, int $id) => (new InactiveCleanupController())->setExempt($r, $id)), Permissions::ADMIN_SERVERS_EDIT, ['PUT']);

    $app->registerAdminRoute($routes, 'admin-disk-quota-settings', '/api/admin/disk-quota/settings', fn (Request $r) => (new DiskQuotaController())->settings($r), Permissions::ADMIN_USERS_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-disk-quota-settings-update', '/api/admin/disk-quota/settings', fn (Request $r) => (new DiskQuotaController())->updateSettings($r), Permissions::ADMIN_SETTINGS_EDIT, ['PUT']);
    $app->registerAdminRoute($routes, 'admin-disk-quota-user', '/api/admin/disk-quota/users/{id}', $withId(fn (Request $r, int $id) => (new DiskQuotaController())->show($r, $id)), Permissions::ADMIN_USERS_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-disk-quota-user-update', '/api/admin/disk-quota/users/{id}', $withId(fn (Request $r, int $id) => (new DiskQuotaController())->update($r, $id)), Permissions::ADMIN_USERS_EDIT, ['PUT']);
};
