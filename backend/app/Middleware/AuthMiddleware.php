<?php

namespace App\Middleware;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        if ($request->headers->get('X-API-TOKEN') !== 'secret') {
			$response = new Response(json_encode([
				'error' => 'Unauthorized',
				'status' => 401,
				'error_code' => 'UNAUTHORIZED',
				'error_message' => 'You are not authorized to access this resource!',
				'success' => false,
			]), 401, ['Content-Type' => 'application/json']);
			return $response;
        }
        return $next($request);
    }
} 