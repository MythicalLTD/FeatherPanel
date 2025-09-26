<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Admin;

use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use OpenApi\Attributes as OA;

#[OA\Schema(
	schema: 'ServerActivity',
	type: 'object',
	properties: [
		new OA\Property(property: 'id', type: 'integer', description: 'Activity ID'),
		new OA\Property(property: 'server_id', type: 'integer', description: 'Server ID'),
		new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID'),
		new OA\Property(property: 'user_id', type: 'integer', description: 'User ID'),
		new OA\Property(property: 'activity_type', type: 'string', description: 'Type of activity'),
		new OA\Property(property: 'activity_description', type: 'string', description: 'Activity description'),
		new OA\Property(property: 'metadata', type: 'object', nullable: true, description: 'Activity metadata'),
		new OA\Property(property: 'ip_address', type: 'string', nullable: true, description: 'IP address'),
		new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
		new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp')
	]
)]
#[OA\Schema(
	schema: 'ServerActivityPagination',
	type: 'object',
	properties: [
		new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
		new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
		new OA\Property(property: 'total_records', type: 'integer', description: 'Total number of records'),
		new OA\Property(property: 'total_pages', type: 'integer', description: 'Total number of pages'),
		new OA\Property(property: 'has_next', type: 'boolean', description: 'Whether there is a next page'),
		new OA\Property(property: 'has_prev', type: 'boolean', description: 'Whether there is a previous page'),
		new OA\Property(property: 'from', type: 'integer', description: 'Starting record number'),
		new OA\Property(property: 'to', type: 'integer', description: 'Ending record number')
	]
)]
class ServerActivitiesController
{
	#[OA\Get(
		path: '/api/admin/server-activities',
		summary: 'Get all server activities',
		description: 'Retrieve a paginated list of all server activities with optional filtering by server, node, user, and search functionality.',
		tags: ['Admin - Server Activities'],
		parameters: [
			new OA\Parameter(
				name: 'page',
				in: 'query',
				description: 'Page number for pagination',
				required: false,
				schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
			),
			new OA\Parameter(
				name: 'limit',
				in: 'query',
				description: 'Number of records per page',
				required: false,
				schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 10)
			),
			new OA\Parameter(
				name: 'search',
				in: 'query',
				description: 'Search term to filter activities by description or type',
				required: false,
				schema: new OA\Schema(type: 'string')
			),
			new OA\Parameter(
				name: 'server_id',
				in: 'query',
				description: 'Filter activities by server ID',
				required: false,
				schema: new OA\Schema(type: 'integer')
			),
			new OA\Parameter(
				name: 'node_id',
				in: 'query',
				description: 'Filter activities by node ID',
				required: false,
				schema: new OA\Schema(type: 'integer')
			),
			new OA\Parameter(
				name: 'user_id',
				in: 'query',
				description: 'Filter activities by user ID',
				required: false,
				schema: new OA\Schema(type: 'integer')
			)
		],
		responses: [
			new OA\Response(
				response: 200,
				description: 'Server activities retrieved successfully',
				content: new OA\JsonContent(
					properties: [
						new OA\Property(property: 'activities', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerActivity')),
						new OA\Property(property: 'pagination', ref: '#/components/schemas/ServerActivityPagination'),
						new OA\Property(property: 'search', type: 'object', properties: [
							new OA\Property(property: 'query', type: 'string'),
							new OA\Property(property: 'has_results', type: 'boolean')
						])
					]
				)
			),
			new OA\Response(response: 401, description: 'Unauthorized'),
			new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions')
		]
	)]
	public function index(Request $request): Response
	{
		$page = (int) $request->query->get('page', 1);
		$limit = (int) $request->query->get('limit', 10);
		$search = (string) $request->query->get('search', '');
		$serverId = $request->query->get('server_id');
		$nodeId = $request->query->get('node_id');
		$userId = $request->query->get('user_id');

		if ($page < 1) {
			$page = 1;
		}
		if ($limit < 1) {
			$limit = 10;
		}
		if ($limit > 100) {
			$limit = 100;
		}

		$serverId = $serverId !== null ? (int) $serverId : null;
		$nodeId = $nodeId !== null ? (int) $nodeId : null;
		$userId = $userId !== null ? (int) $userId : null;

		$result = ServerActivity::getActivitiesWithPagination(
			page: $page,
			perPage: $limit,
			search: $search,
			serverId: $serverId,
			nodeId: $nodeId,
			userId: $userId,
		);

		$activities = [];
		foreach ($result['data'] as $activity) {
			$activityData = $activity;
			if (!empty($activity['metadata'])) {
				try {
					$metadata = json_decode($activity['metadata'], true);
					if (is_array($metadata)) {
						$activityData['metadata'] = $metadata;
					}
				} catch (\Exception) {
					// Keep original metadata if parsing fails
				}
			}
			$activities[] = $activityData;
		}

		$pagination = $result['pagination'];
		$totalPages = (int) $pagination['last_page'];

		return ApiResponse::success([
			'activities' => $activities,
			'pagination' => [
				'current_page' => $pagination['current_page'],
				'per_page' => $pagination['per_page'],
				'total_records' => $pagination['total'],
				'total_pages' => $totalPages,
				'has_next' => $pagination['current_page'] < $totalPages,
				'has_prev' => $pagination['current_page'] > 1,
				'from' => $pagination['from'],
				'to' => $pagination['to'],
			],
			'search' => [
				'query' => $search,
				'has_results' => count($activities) > 0,
			],
		], 'Server activities fetched successfully', 200);
	}

	#[OA\Get(
		path: '/api/admin/servers/{id}/activities',
		summary: 'Get server activities by server ID',
		description: 'Retrieve a paginated list of activities for a specific server with optional search functionality.',
		tags: ['Admin - Server Activities'],
		parameters: [
			new OA\Parameter(
				name: 'id',
				in: 'path',
				description: 'Server ID',
				required: true,
				schema: new OA\Schema(type: 'integer')
			),
			new OA\Parameter(
				name: 'page',
				in: 'query',
				description: 'Page number for pagination',
				required: false,
				schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
			),
			new OA\Parameter(
				name: 'limit',
				in: 'query',
				description: 'Number of records per page',
				required: false,
				schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 10)
			),
			new OA\Parameter(
				name: 'search',
				in: 'query',
				description: 'Search term to filter activities by description or type',
				required: false,
				schema: new OA\Schema(type: 'string')
			)
		],
		responses: [
			new OA\Response(
				response: 200,
				description: 'Server activities retrieved successfully',
				content: new OA\JsonContent(
					properties: [
						new OA\Property(property: 'activities', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerActivity')),
						new OA\Property(property: 'pagination', ref: '#/components/schemas/ServerActivityPagination'),
						new OA\Property(property: 'search', type: 'object', properties: [
							new OA\Property(property: 'query', type: 'string'),
							new OA\Property(property: 'has_results', type: 'boolean')
						])
					]
				)
			),
			new OA\Response(response: 400, description: 'Bad request - Invalid server ID'),
			new OA\Response(response: 401, description: 'Unauthorized'),
			new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
			new OA\Response(response: 404, description: 'Server not found')
		]
	)]
	public function byServer(Request $request, int $serverId): Response
	{
		$page = (int) $request->query->get('page', 1);
		$limit = (int) $request->query->get('limit', 10);
		$search = (string) $request->query->get('search', '');

		if ($page < 1) {
			$page = 1;
		}
		if ($limit < 1) {
			$limit = 10;
		}
		if ($limit > 100) {
			$limit = 100;
		}

		$result = ServerActivity::getActivitiesWithPagination(
			page: $page,
			perPage: $limit,
			search: $search,
			serverId: $serverId,
		);

		$activities = [];
		foreach ($result['data'] as $activity) {
			$activityData = $activity;
			if (!empty($activity['metadata'])) {
				try {
					$metadata = json_decode($activity['metadata'], true);
					if (is_array($metadata)) {
						$activityData['metadata'] = $metadata;
					}
				} catch (\Exception) {
					// Keep original metadata if parsing fails
				}
			}
			$activities[] = $activityData;
		}

		$pagination = $result['pagination'];
		$totalPages = (int) $pagination['last_page'];

		return ApiResponse::success([
			'activities' => $activities,
			'pagination' => [
				'current_page' => $pagination['current_page'],
				'per_page' => $pagination['per_page'],
				'total_records' => $pagination['total'],
				'total_pages' => $totalPages,
				'has_next' => $pagination['current_page'] < $totalPages,
				'has_prev' => $pagination['current_page'] > 1,
				'from' => $pagination['from'],
				'to' => $pagination['to'],
			],
			'search' => [
				'query' => $search,
				'has_results' => count($activities) > 0,
			],
		], 'Server activities fetched successfully', 200);
	}
}
