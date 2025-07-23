<?php

use Symfony\Component\Routing\RouteCollection;
use Symfony\Component\Routing\Route;
use App\Controllers\HomeController;
use Symfony\Component\HttpFoundation\Request;

return function (RouteCollection $routes): void {
	// GET example
	$routes->add('home', new Route('/api', [
		'_controller' => function (Request $request) {
			return (new HomeController())->index($request);
		},
		'_middleware' => []
	]));

	// PUT (create) example
	$routes->add('create_item', new Route('/api/item', [
		'_controller' => function (Request $request) {
			return (new HomeController())->create($request);
		},
		'_middleware' => []
	], [], [], '', [], ['PUT']));

	// PATCH (update) example
	$routes->add('update_item', new Route('/api/item/{id}', [
		'_controller' => function (Request $request, $id) {
			return (new HomeController())->update($request, $id);
		},
		'_middleware' => []
	], [], [], '', [], ['PATCH']));

	// DELETE example
	$routes->add('delete_item', new Route('/api/item/{id}', [
		'_controller' => function (Request $request, $id) {
			return (new HomeController())->delete($request, $id);
		},
		'_middleware' => []
	], [], [], '', [], ['DELETE']));
};