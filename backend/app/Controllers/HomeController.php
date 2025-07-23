<?php

namespace App\Controllers;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Helpers\ApiResponse;

class HomeController
{
	public function index(Request $request): Response
	{
		return ApiResponse::success(null, 'Welcome to the Home route!');
	}
}