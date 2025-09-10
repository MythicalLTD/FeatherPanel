<?php

use App\App;
use App\Permissions;
use App\Controllers\Admin\RedirectLinksController;
use Symfony\Component\HttpFoundation\Request;

return function ($routes) {
	// List redirect links
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-redirect-links-list',
		'/api/admin/redirect-links',
		function (Request $request) {
			return (new RedirectLinksController())->index($request);
		},
		Permissions::ADMIN_REDIRECT_LINKS_VIEW,
		['GET']
	);

	// Get specific redirect link
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-redirect-links-show',
		'/api/admin/redirect-links/{id}',
		function (Request $request, int $id) {
			return (new RedirectLinksController())->show($request, $id);
		},
		Permissions::ADMIN_REDIRECT_LINKS_VIEW,
		['GET']
	);

	// Create new redirect link
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-redirect-links-create',
		'/api/admin/redirect-links',
		function (Request $request) {
			return (new RedirectLinksController())->create($request);
		},
		Permissions::ADMIN_REDIRECT_LINKS_CREATE,
		['POST']
	);

	// Update redirect link
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-redirect-links-update',
		'/api/admin/redirect-links/{id}',
		function (Request $request, int $id) {
			return (new RedirectLinksController())->update($request, $id);
		},
		Permissions::ADMIN_REDIRECT_LINKS_EDIT,
		['PATCH']
	);

	// Delete redirect link
	App::getInstance(true)->registerAdminRoute(
		$routes,
		'admin-redirect-links-delete',
		'/api/admin/redirect-links/{id}',
		function (Request $request, int $id) {
			return (new RedirectLinksController())->delete($request, $id);
		},
		Permissions::ADMIN_REDIRECT_LINKS_DELETE,
		['DELETE']
	);
};
