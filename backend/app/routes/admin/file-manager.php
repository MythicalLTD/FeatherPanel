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
use App\Controllers\Admin\FileManagerController;

return function (RouteCollection $routes): void {
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-file-manager-browse',
		'/api/admin/file-manager/browse',
		function (Request $request) {
			return (new FileManagerController())->browse($request);
		},
		Permissions::ADMIN_ROOT,
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-file-manager-read',
		'/api/admin/file-manager/read',
		function (Request $request) {
			return (new FileManagerController())->readFile($request);
		},
		Permissions::ADMIN_ROOT,
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-file-manager-save',
		'/api/admin/file-manager/save',
		function (Request $request) {
			return (new FileManagerController())->saveFile($request);
		},
		Permissions::ADMIN_ROOT,
		['POST']
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-file-manager-create',
		'/api/admin/file-manager/create',
		function (Request $request) {
			return (new FileManagerController())->createFile($request);
		},
		Permissions::ADMIN_ROOT,
		['POST']
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-file-manager-delete',
		'/api/admin/file-manager/delete',
		function (Request $request) {
			return (new FileManagerController())->deleteFile($request);
		},
		Permissions::ADMIN_ROOT,
		['POST']
	);
};
