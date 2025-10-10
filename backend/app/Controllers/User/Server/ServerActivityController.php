<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Controllers\User\Server;

use App\Chat\User;
use App\Chat\Server;
use App\Chat\Subuser;
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
        new OA\Property(property: 'user_id', type: 'integer', nullable: true, description: 'User ID (null for daemon events)'),
        new OA\Property(property: 'event', type: 'string', description: 'Activity event name'),
        new OA\Property(property: 'metadata', type: 'object', nullable: true, description: 'Activity metadata (parsed JSON)'),
        new OA\Property(property: 'ip_address', type: 'string', nullable: true, description: 'IP address'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Activity timestamp'),
        new OA\Property(property: 'server_name', type: 'string', nullable: true, description: 'Server name'),
        new OA\Property(property: 'server_uuid', type: 'string', nullable: true, description: 'Server UUID'),
        new OA\Property(property: 'server_uuid_short', type: 'string', nullable: true, description: 'Server short UUID'),
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
    /**
     * Get user's server activities with pagination.
     */
    #[OA\Get(
        path: '/api/user/server-activities',
        summary: 'Get user server activities',
        description: 'Retrieve paginated server activities for all servers the user owns or has subuser access to, including daemon events.',
        tags: ['User - Server Activities'],
        parameters: [
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
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve activities'),
        ]
    )]
    public function getUserServerActivities(Request $request): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get pagination parameters
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(100, (int) $request->query->get('per_page', 50)));
        $search = $request->query->get('search', '');

        // Get servers the user owns
        $ownedServers = Server::getServersByOwnerId((int) $user['id']);

        // Get servers where user is a subuser
        $subusers = Subuser::getSubusersByUserId((int) $user['id']);

        // Combine and deduplicate server IDs
        $serverIds = [];
        foreach ($ownedServers as $server) {
            $serverIds[] = (int) $server['id'];
        }
        foreach ($subusers as $subuser) {
            $serverId = (int) $subuser['server_id'];
            if (!in_array($serverId, $serverIds, true)) {
                $serverIds[] = $serverId;
            }
        }

        // Get activities for user's servers (include daemon events with NULL user_id)
        $result = ServerActivity::getActivitiesWithPagination(
            page: $page,
            perPage: $perPage,
            search: $search,
            serverIds: $serverIds,
        );

        // Add server information to activities
        $activities = [];
        foreach ($result['data'] as $activity) {
            $activityData = $activity;

            // Parse metadata if it's JSON
            if (!empty($activity['metadata'])) {
                try {
                    $metadata = json_decode($activity['metadata'], true);
                    if (is_array($metadata)) {
                        $activityData['metadata'] = $metadata;
                    }
                } catch (\Exception $e) {
                    // Keep original metadata if parsing fails
                }
            }

            $activities[] = $activityData;
        }

        return ApiResponse::success([
            'activities' => $activities,
            'pagination' => $result['pagination'],
        ]);
    }

    /**
     * Get user's recent server activities (last 10).
     */
    #[OA\Get(
        path: '/api/user/server-activities/recent',
        summary: 'Get recent server activities',
        description: 'Retrieve the last 10 server activities for all servers the user owns or has subuser access to.',
        tags: ['User - Server Activities'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Recent server activities retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'activities', type: 'array', items: new OA\Items(ref: '#/components/schemas/UserServerActivity')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve recent activities'),
        ]
    )]
    public function getRecentServerActivities(Request $request): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get recent activities with server information
        $activities = ServerActivity::getActivitiesByUserIdWithServerInfo($user['id'], 10);

        // Parse metadata for each activity
        foreach ($activities as &$activity) {
            if (!empty($activity['metadata'])) {
                try {
                    $metadata = json_decode($activity['metadata'], true);
                    if (is_array($metadata)) {
                        $activity['metadata'] = $metadata;
                    }
                } catch (\Exception $e) {
                    // Keep original metadata if parsing fails
                }
            }
        }

        return ApiResponse::success([
            'activities' => $activities,
        ]);
    }

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

        // Add server information to activities
        $activities = [];
        foreach ($result['data'] as $activity) {
            $activityData = $activity;

            // Parse metadata if it's JSON
            if (!empty($activity['metadata'])) {
                try {
                    $metadata = json_decode($activity['metadata'], true);
                    if (is_array($metadata)) {
                        $activityData['metadata'] = $metadata;
                    }
                } catch (\Exception $e) {
                    // Keep original metadata if parsing fails
                }
            }

            $activities[] = $activityData;
        }

        return ApiResponse::success([
            'activities' => $activities,
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
