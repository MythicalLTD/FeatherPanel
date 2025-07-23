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

};