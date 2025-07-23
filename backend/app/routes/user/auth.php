<?php

use App\Controllers\User\Auth\RegisterController;
use App\Controllers\User\Auth\LoginController;
use Symfony\Component\Routing\RouteCollection;
use Symfony\Component\Routing\Route;
use Symfony\Component\HttpFoundation\Request;

return function (RouteCollection $routes): void {
	// PUT (register)
	$routes->add('register', new Route('/api/user/auth/register', [
		'_controller' => function (Request $request) {
			return (new RegisterController())->put($request);
		},
		'_middleware' => []
	], [], [], '', [], ['PUT']));

	// PUT (login)
	$routes->add('login', new Route('/api/user/auth/login', [
		'_controller' => function (Request $request) {
			return (new LoginController())->put($request);
		},
		'_middleware' => []
	], [], [], '', [], ['PUT']));
};