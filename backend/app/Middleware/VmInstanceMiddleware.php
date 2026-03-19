<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Middleware;

use App\App;
use App\Chat\VmInstance;
use App\Helpers\VmGateway;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * VmInstanceMiddleware - Validates user access to VM instances.
 * Similar to ServerMiddleware but for VDS/VM instances.
 */
class VmInstanceMiddleware implements MiddlewareInterface
{
	public function handle(Request $request, callable $next): Response
	{
		$user = $request->attributes->get('user');

		unset($user['password'], $user['remember_token']);

		if (!$user) {
			return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401, []);
		}

		// Resolve VM instance ID from route attributes
		$vmInstanceId = null;
		$vmInstanceParamName = $request->attributes->get('vmInstance');

		if ($vmInstanceParamName && $request->attributes->has($vmInstanceParamName)) {
			$vmInstanceId = (int) $request->attributes->get($vmInstanceParamName);
		}

		if (!$vmInstanceId) {
			$vmInstanceId = (int) ($request->attributes->get('id') ?? $request->get('id'));
		}

		if (!$vmInstanceId || $vmInstanceId <= 0) {
			$context = [
				'attributes' => $request->attributes->all(),
				'query' => $request->query->all(),
				'vmInstanceParamName' => $vmInstanceParamName,
				'path' => $request->getPathInfo(),
			];
			App::getInstance(true)->getLogger()->error('VM_INSTANCE_ID_MISSING: Attributes dump: ' . json_encode($context));

			return ApiResponse::error('VM instance ID not provided', 'VM_INSTANCE_ID_MISSING', 400, []);
		}

		// Get the VM instance details
		$vmInstance = VmInstance::getById($vmInstanceId);

		if (!$vmInstance) {
			return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404, [
				'vmInstanceId' => $vmInstanceId,
			]);
		}

		// Check if user can access the VM instance (owner, subuser, or admin)
		if (!VmGateway::canUserAccessVmInstance($user['uuid'], $vmInstanceId)) {
			return ApiResponse::error('Access denied: VM instance not accessible by user', 'ACCESS_DENIED', 403, []);
		}

		if (isset($vmInstance['suspended']) && (int) $vmInstance['suspended'] === 1) {
			return ApiResponse::error(
				'Sorry, but you can\'t access VDS instances while they are suspended.',
				'VM_INSTANCE_SUSPENDED',
				403,
				[]
			);
		}

		// Store VM instance in request attributes for controller use
		$request->attributes->set('vmInstance', $vmInstance);

		return $next($request);
	}

	/**
	 * Get the authenticated user from the request (if available).
	 */
	public static function getCurrentUser(Request $request): ?array
	{
		return $request->attributes->get('user');
	}

	/**
	 * Get the VM instance ID from the request (if available).
	 */
	public static function getVmInstanceId(Request $request): ?int
	{
		$id = $request->attributes->get('id') ?? $request->get('id');

		return $id ? (int) $id : null;
	}

	/**
	 * Get the VM instance from the request (if available).
	 */
	public static function getVmInstance(Request $request): ?array
	{
		return $request->attributes->get('vmInstance');
	}
}
