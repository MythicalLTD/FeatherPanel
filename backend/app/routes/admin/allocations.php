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
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\Admin\AllocationsController;

return function (RouteCollection $routes): void {
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-allocations',
		'/api/admin/allocations',
		function (Request $request) {
			return (new AllocationsController())->index($request);
		},
		Permissions::ADMIN_ALLOCATIONS_VIEW,
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-allocations-show',
		'/api/admin/allocations/{id}',
		function (Request $request, array $args) {
			$id = $args['id'] ?? null;
			if (!$id || !is_numeric($id)) {
				return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
			}

			return (new AllocationsController())->show($request, (int) $id);
		},
		Permissions::ADMIN_ALLOCATIONS_VIEW,
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-allocations-update',
		'/api/admin/allocations/{id}',
		function (Request $request, array $args) {
			$id = $args['id'] ?? null;
			if (!$id || !is_numeric($id)) {
				return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
			}

			return (new AllocationsController())->update($request, (int) $id);
		},
		Permissions::ADMIN_ALLOCATIONS_EDIT,
		['PATCH']
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-allocations-delete',
		'/api/admin/allocations/{id}',
		function (Request $request, array $args) {
			$id = $args['id'] ?? null;
			if (!$id || !is_numeric($id)) {
				return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
			}

			return (new AllocationsController())->delete($request, (int) $id);
		},
		Permissions::ADMIN_ALLOCATIONS_DELETE,
		['DELETE']
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-allocations-create',
		'/api/admin/allocations',
		function (Request $request) {
			return (new AllocationsController())->create($request);
		},
		Permissions::ADMIN_ALLOCATIONS_CREATE,
		['PUT']
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-allocations-assign',
		'/api/admin/allocations/{id}/assign',
		function (Request $request, array $args) {
			$id = $args['id'] ?? null;
			if (!$id || !is_numeric($id)) {
				return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
			}

			return (new AllocationsController())->assignToServer($request, (int) $id);
		},
		Permissions::ADMIN_ALLOCATIONS_EDIT,
		['POST']
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-allocations-unassign',
		'/api/admin/allocations/{id}/unassign',
		function (Request $request, array $args) {
			$id = $args['id'] ?? null;
			if (!$id || !is_numeric($id)) {
				return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
			}

			return (new AllocationsController())->unassignFromServer($request, (int) $id);
		},
		Permissions::ADMIN_ALLOCATIONS_EDIT,
		['POST']
	);

	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-allocations-available',
		'/api/admin/allocations/available',
		function (Request $request) {
			return (new AllocationsController())->getAvailable($request);
		},
		Permissions::ADMIN_ALLOCATIONS_VIEW,
	);
};
