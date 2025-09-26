<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

use App\App;
use App\Permissions;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\DatabaseManagmentController;

return function (RouteCollection $routes): void {
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-databases-management-status',
		'/api/admin/databases/management/status',
		function (Request $request) {
			return (new DatabaseManagmentController())->status($request);
		},
		Permissions::ADMIN_DATABASES_VIEW,
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-databases-management-migrate',
		'/api/admin/databases/management/migrate',
		function (Request $request) {
			return (new DatabaseManagmentController())->migrate($request);
		},
		Permissions::ADMIN_DATABASES_MANAGE,
		['POST']
	);
};
