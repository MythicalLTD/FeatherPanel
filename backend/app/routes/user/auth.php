<?php

use App\Controllers\User\Auth\ForgotPasswordController;
use App\Controllers\User\Auth\RegisterController;
use App\Controllers\User\Auth\LoginController;
use App\Controllers\User\Auth\ResetPasswordController;
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

	// PUT (forgot password)
	$routes->add('forgot-password', new Route('/api/user/auth/forgot-password', [
		'_controller' => function (Request $request) {
			return (new ForgotPasswordController())->put($request);
		},
		'_middleware' => []
	], [], [], '', [], ['PUT']));

	// GET (reset password)
	$routes->add('reset-password-get', new Route('/api/user/auth/reset-password', [
		'_controller' => function (Request $request) {
			return (new ResetPasswordController())->get($request);
		},
		'_middleware' => []
	], [], [], '', [], ['GET']));

	// PUT (reset password)
	$routes->add('reset-password-put', new Route('/api/user/auth/reset-password', [
		'_controller' => function (Request $request) {
			return (new ResetPasswordController())->put($request);
		},
		'_middleware' => []
	], [], [], '', [], ['PUT']));
};