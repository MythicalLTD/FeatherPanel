<?php

namespace App\Middleware;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Helpers\ApiResponse;
use App\Chat\User;

class AuthMiddleware implements MiddlewareInterface
{
	public function handle(Request $request, callable $next): Response
	{
		if (isset($_COOKIE['remember_token'])) {
			$userInfo = User::getUserByRememberToken($_COOKIE['remember_token']);
			if ($userInfo == null) {
				return ApiResponse::error('You are not allowed to access this resource!', "INVALID_ACCOUNT_TOKEN", 400, []);
			}
		} else {
			return ApiResponse::error('You are not allowed to access this resource!', "INVALID_ACCOUNT_TOKEN", 400, []);
		}
		return $next($request);
	}
}