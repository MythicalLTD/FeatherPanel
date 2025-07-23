<?php

namespace App\Controllers;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Helpers\ApiResponse;

class HomeController
{
	public function index(Request $request): Response
	{
		return ApiResponse::success(null, 'Welcome to the Symfony-powered Home route!');
	}

	public function create(Request $request): Response
	{
		$data = json_decode($request->getContent(), true);
		return ApiResponse::success($data, 'Resource created', 201);
	}

	public function update(Request $request, $id): Response
	{
		$data = json_decode($request->getContent(), true);
		return ApiResponse::success(['id' => $id, 'data' => $data], 'Resource updated');
	}

	public function delete(Request $request, $id): Response
	{
		return ApiResponse::success(['id' => $id], 'Resource deleted');
	}
}