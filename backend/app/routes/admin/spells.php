<?php

/*
 * This file is part of App.
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
use App\Controllers\Admin\SpellsController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spells',
		'/api/admin/spells',
		function (Request $request) {
			return (new SpellsController())->index($request);
		},
		Permissions::ADMIN_SPELLS_VIEW,
	);
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spells-show',
		'/api/admin/spells/{id}',
		function (Request $request, array $args) {
			$id = $args['id'] ?? null;
			if (!$id || !is_numeric($id)) {
				return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
			}

			return (new SpellsController())->show($request, (int) $id);
		},
		Permissions::ADMIN_SPELLS_VIEW,
	);
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spells-update',
		'/api/admin/spells/{id}',
		function (Request $request, array $args) {
			$id = $args['id'] ?? null;
			if (!$id || !is_numeric($id)) {
				return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
			}

			return (new SpellsController())->update($request, (int) $id);
		},
		Permissions::ADMIN_SPELLS_EDIT,
		['PATCH']
	);
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spells-delete',
		'/api/admin/spells/{id}',
		function (Request $request, array $args) {
			$id = $args['id'] ?? null;
			if (!$id || !is_numeric($id)) {
				return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
			}

			return (new SpellsController())->delete($request, (int) $id);
		},
		Permissions::ADMIN_SPELLS_DELETE,
		['DELETE']
	);
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spells-create',
		'/api/admin/spells',
		function (Request $request) {
			return (new SpellsController())->create($request);
		},
		Permissions::ADMIN_SPELLS_CREATE,
		['PUT']
	);
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spells-by-realm',
		'/api/admin/spells/realm/{realmId}',
		function (Request $request, array $args) {
			$realmId = $args['realmId'] ?? null;
			if (!$realmId || !is_numeric($realmId)) {
				return ApiResponse::error('Missing or invalid realm ID', 'INVALID_REALM_ID', 400);
			}

			return (new SpellsController())->getByRealm($request, (int) $realmId);
		},
		Permissions::ADMIN_SPELLS_VIEW,
	);
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spells-import',
		'/api/admin/spells/import',
		function (Request $request) {
			return (new SpellsController())->import($request);
		},
		Permissions::ADMIN_SPELLS_CREATE,
		['POST']
	);
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spells-export',
		'/api/admin/spells/{id}/export',
		function (Request $request, array $args) {
			$id = $args['id'] ?? null;
			if (!$id || !is_numeric($id)) {
				return ApiResponse::error('Missing or invalid spell ID', 'INVALID_ID', 400);
			}

			return (new SpellsController())->export($request, (int) $id);
		},
		Permissions::ADMIN_SPELLS_VIEW,
		['GET']
	);
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spell-variables-list',
		'/api/admin/spells/{spellId}/variables',
		function (Request $request, array $args) {
			$spellId = $args['spellId'] ?? null;
			if (!$spellId || !is_numeric($spellId)) {
				return ApiResponse::error('Missing or invalid spell ID', 'INVALID_SPELL_ID', 400);
			}

			return (new SpellsController())->listVariables($request, (int) $spellId);
		},
		Permissions::ADMIN_SPELLS_VIEW,
		['GET']
	);
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spell-variables-create',
		'/api/admin/spells/{spellId}/variables',
		function (Request $request, array $args) {
			$spellId = $args['spellId'] ?? null;
			if (!$spellId || !is_numeric($spellId)) {
				return ApiResponse::error('Missing or invalid spell ID', 'INVALID_SPELL_ID', 400);
			}

			return (new SpellsController())->createVariable($request, (int) $spellId);
		},
		Permissions::ADMIN_SPELLS_EDIT,
		['POST']
	);
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spell-variables-update',
		'/api/admin/spell-variables/{id}',
		function (Request $request, array $args) {
			$id = $args['id'] ?? null;
			if (!$id || !is_numeric($id)) {
				return ApiResponse::error('Missing or invalid variable ID', 'INVALID_ID', 400);
			}

			return (new SpellsController())->updateVariable($request, (int) $id);
		},
		Permissions::ADMIN_SPELLS_EDIT,
		['PATCH']
	);
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-spell-variables-delete',
		'/api/admin/spell-variables/{id}',
		function (Request $request, array $args) {
			$id = $args['id'] ?? null;
			if (!$id || !is_numeric($id)) {
				return ApiResponse::error('Missing or invalid variable ID', 'INVALID_ID', 400);
			}

			return (new SpellsController())->deleteVariable($request, (int) $id);
		},
		Permissions::ADMIN_SPELLS_EDIT,
		['DELETE']
	);
};
