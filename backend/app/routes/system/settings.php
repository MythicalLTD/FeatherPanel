<?php

use App\Controllers\System\SettingsController;
use Symfony\Component\Routing\RouteCollection;
use Symfony\Component\Routing\Route;
use Symfony\Component\HttpFoundation\Request;

return function (RouteCollection $routes): void {
	// GET example
	$routes->add('settings', new Route('/api/system/settings', [
		'_controller' => function (Request $request) {
			return (new SettingsController())->index($request);
		},
		'_middleware' => []
	]));
};