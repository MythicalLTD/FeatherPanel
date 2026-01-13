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

namespace App\Controllers\User\Server;

use App\Chat\User;
use App\Chat\Server;
use App\SubuserPermissions;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\ServerGateway;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'UserServerActivity',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Activity ID'),
        new OA\Property(property: 'server_id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID'),
        new OA\Property(property: 'user_id', type: 'integer', nullable: true, description: 'User ID (null for daemon events)'),
        new OA\Property(property: 'event', type: 'string', description: 'Activity event name'),
        new OA\Property(property: 'metadata', type: 'object', nullable: true, description: 'Activity metadata (parsed from JSON)'),
        new OA\Property(property: 'ip', type: 'string', nullable: true, description: 'IP address'),
        new OA\Property(property: 'timestamp', type: 'string', format: 'date-time', description: 'Activity timestamp'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Created timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Updated timestamp'),
        new OA\Property(
            property: 'user',
            type: 'object',
            nullable: true,
            description: 'User information (null for daemon events)',
            properties: [
                new OA\Property(property: 'username', type: 'string', description: 'Username'),
                new OA\Property(property: 'avatar', type: 'string', nullable: true, description: 'User avatar URL'),
                new OA\Property(property: 'role', type: 'string', nullable: true, description: 'User role name'),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'ActivityPagination',
    type: 'object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
        new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
        new OA\Property(property: 'total_records', type: 'integer', description: 'Total number of records'),
        new OA\Property(property: 'total_pages', type: 'integer', description: 'Total number of pages'),
        new OA\Property(property: 'has_next', type: 'boolean', description: 'Whether there is a next page'),
        new OA\Property(property: 'has_prev', type: 'boolean', description: 'Whether there is a previous page'),
        new OA\Property(property: 'from', type: 'integer', description: 'Starting record number'),
        new OA\Property(property: 'to', type: 'integer', description: 'Ending record number'),
    ]
)]
class ServerActivityController
{
    use CheckSubuserPermissionsTrait;

    /**
     * Get activities for a specific server accessible by the user.
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/activities',
        summary: 'Get server activities by UUID',
        description: 'Retrieve paginated activities for a specific server that the user owns or has subuser access to.',
        tags: ['User - Server Activities'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'per_page',
                in: 'query',
                description: 'Number of records per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 50)
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Search term to filter activities by event or metadata',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server activities retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'activities', type: 'array', items: new OA\Items(ref: '#/components/schemas/UserServerActivity')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/ActivityPagination'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve activities'),
        ]
    )]
    public function getServerActivities(Request $request, int $serverId): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get server and validate access
        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied to server', 'FORBIDDEN', 403);
        }

        // Check activity.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::ACTIVITY_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get pagination parameters
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(100, (int) $request->query->get('per_page', 50)));
        $search = $request->query->get('search', '');

        // Get activities for specific server
        // Many daemon-generated rows have NULL user_id, so do not filter by user here
        $result = ServerActivity::getActivitiesWithPagination(
            page: $page,
            perPage: $perPage,
            search: $search,
            serverId: $serverId,
        );

        return ApiResponse::success([
            'activities' => $result,
            'pagination' => $result['pagination'],
        ]);
    }

    /**
     * Check if user can access a specific server.
     */
    private function userCanAccessServer(Request $request, array $server): bool
    {
        $user = $request->get('user');
        if (!$user) {
            return false;
        }

        return ServerGateway::canUserAccessServer($user['uuid'], $server['uuid']);
    }
}
