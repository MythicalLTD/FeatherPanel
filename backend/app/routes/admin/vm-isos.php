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
use App\Controllers\Admin\VmIsosController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    $app = App::getInstance(true);
    $c = static fn () => new VmIsosController();
    $id = static fn (array $args): int => (int) ($args['id'] ?? 0);

    $app->registerAdminRoute($routes, 'admin-vm-isos-index', '/api/admin/vm-isos', static fn (Request $r) => $c()->index($r), Permissions::ADMIN_VM_NODES_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-vm-isos-scan', '/api/admin/vm-isos/scan', static fn (Request $r) => $c()->scan($r), Permissions::ADMIN_VM_NODES_VIEW, ['GET']);
    $app->registerAdminRoute($routes, 'admin-vm-isos-create', '/api/admin/vm-isos', static fn (Request $r) => $c()->create($r), Permissions::ADMIN_VM_NODES_EDIT, ['POST']);
    $app->registerAdminRoute($routes, 'admin-vm-isos-update', '/api/admin/vm-isos/{id}', static fn (Request $r, array $a) => $c()->update($r, $id($a)), Permissions::ADMIN_VM_NODES_EDIT, ['PATCH']);
    $app->registerAdminRoute($routes, 'admin-vm-isos-delete', '/api/admin/vm-isos/{id}', static fn (Request $r, array $a) => $c()->delete($r, $id($a)), Permissions::ADMIN_VM_NODES_EDIT, ['DELETE']);
    $app->registerAdminRoute($routes, 'admin-vm-isos-approve', '/api/admin/vm-isos/{id}/approve', static fn (Request $r, array $a) => $c()->approve($r, $id($a)), Permissions::ADMIN_VM_NODES_EDIT, ['POST']);
    $app->registerAdminRoute($routes, 'admin-vm-isos-reject', '/api/admin/vm-isos/{id}/reject', static fn (Request $r, array $a) => $c()->reject($r, $id($a)), Permissions::ADMIN_VM_NODES_EDIT, ['POST']);
};
