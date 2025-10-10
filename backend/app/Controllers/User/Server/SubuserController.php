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
use App\Plugins\Events\Events\ServerSubuserEvent;

#[OA\Schema(
    schema: 'Subuser',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Subuser ID'),
        new OA\Property(property: 'user_id', type: 'integer', description: 'User ID'),
        new OA\Property(property: 'server_id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'permissions', type: 'string', description: 'JSON string of permissions'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'SubuserWithDetails',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Subuser ID'),
        new OA\Property(property: 'user_id', type: 'integer', description: 'User ID'),
        new OA\Property(property: 'server_id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'permissions', type: 'string', description: 'JSON string of permissions'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
        new OA\Property(property: 'username', type: 'string', description: 'User username'),
        new OA\Property(property: 'email', type: 'string', format: 'email', description: 'User email'),
        new OA\Property(property: 'first_name', type: 'string', nullable: true, description: 'User first name'),
        new OA\Property(property: 'last_name', type: 'string', nullable: true, description: 'User last name'),
        new OA\Property(property: 'uuid', type: 'string', description: 'User UUID'),
    ]
)]
#[OA\Schema(
    schema: 'SubuserPagination',
    type: 'object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
        new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
        new OA\Property(property: 'total', type: 'integer', description: 'Total number of records'),
        new OA\Property(property: 'last_page', type: 'integer', description: 'Last page number'),
        new OA\Property(property: 'from', type: 'integer', description: 'Starting record number'),
        new OA\Property(property: 'to', type: 'integer', description: 'Ending record number'),
    ]
)]
#[OA\Schema(
    schema: 'SubuserCreateRequest',
    type: 'object',
    required: ['email'],
    properties: [
        new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Email address of user to add as subuser'),
    ]
)]
#[OA\Schema(
    schema: 'SubuserUpdateRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'permissions', type: 'string', nullable: true, description: 'JSON string of permissions'),
    ]
)]
#[OA\Schema(
    schema: 'UserSearchResult',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'User ID'),
        new OA\Property(property: 'username', type: 'string', description: 'Username'),
        new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Email address'),
        new OA\Property(property: 'uuid', type: 'string', description: 'User UUID'),
        new OA\Property(property: 'first_name', type: 'string', nullable: true, description: 'First name'),
        new OA\Property(property: 'last_name', type: 'string', nullable: true, description: 'Last name'),
    ]
)]
#[OA\Schema(
    schema: 'UserSearchResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'users', type: 'array', items: new OA\Items(ref: '#/components/schemas/UserSearchResult')),
        new OA\Property(property: 'total', type: 'integer', description: 'Total number of users found'),
    ]
)]
#[OA\Schema(
    schema: 'PermissionsResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(type: 'string'), description: 'Array of available permissions'),
        new OA\Property(property: 'total', type: 'integer', description: 'Total number of permissions'),
    ]
)]
class SubuserController
{
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/subusers',
        summary: 'Get server subusers',
        description: 'Retrieve all subusers for a specific server that the user owns or has subuser access to.',
        tags: ['User - Server Subusers'],
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
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20)
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Search term to filter subusers by username or email',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server subusers retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/SubuserWithDetails')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/SubuserPagination'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve subusers'),
        ]
    )]
    public function getSubusers(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get page and per_page from query parameters
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(100, (int) $request->query->get('per_page', 20)));
        $search = $request->query->get('search', '');

        // Get subusers from database with pagination and user details
        $subusers = Subuser::getSubusersWithDetailsByServerId($server['id']);

        // Apply search filter if provided
        if (!empty($search)) {
            $subusers = array_filter($subusers, function ($subuser) use ($search) {
                return stripos($subuser['username'], $search) !== false
                    || stripos($subuser['email'], $search) !== false;
            });
        }

        // Apply pagination
        $total = count($subusers);
        $offset = ($page - 1) * $perPage;
        $subusers = array_slice($subusers, $offset, $perPage);

        return ApiResponse::success([
            'data' => $subusers,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total),
            ],
        ]);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/subusers/{subuserId}',
        summary: 'Get specific subuser',
        description: 'Retrieve details of a specific subuser for a server that the user owns or has subuser access to.',
        tags: ['User - Server Subusers'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'subuserId',
                in: 'path',
                description: 'Subuser ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Subuser details retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/Subuser')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or subuser not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve subuser'),
        ]
    )]
    public function getSubuser(Request $request, string $serverUuid, int $subuserId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get subuser info
        $subuser = Subuser::getSubuserById($subuserId);
        if (!$subuser) {
            return ApiResponse::error('Subuser not found', 'SUBUSER_NOT_FOUND', 404);
        }

        // Verify subuser belongs to this server
        if ($subuser['server_id'] != $server['id']) {
            return ApiResponse::error('Subuser not found', 'SUBUSER_NOT_FOUND', 404);
        }

        return ApiResponse::success($subuser);
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/subusers',
        summary: 'Create subuser',
        description: 'Create a new subuser for a server by email address. The user must exist in the system and not already be a subuser for this server.',
        tags: ['User - Server Subusers'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SubuserCreateRequest')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Subuser created successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/SubuserWithDetails')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid email format, user not found, cannot add self, or subuser already exists'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or user not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create subuser'),
        ]
    )]
    public function createSubuser(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get request data
        $data = json_decode($request->getContent(), true);
        if (!$data) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST_DATA', 400);
        }

        // Validate required fields
        $required = ['email'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                return ApiResponse::error("Missing required field: $field", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        // Validate email format
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return ApiResponse::error('Invalid email format', 'INVALID_EMAIL_FORMAT', 400);
        }

        // Find user by email
        $user = User::getUserByEmail($data['email']);
        if (!$user) {
            return ApiResponse::error('User not found with this email', 'USER_NOT_FOUND', 404);
        }

        // Check if user is trying to add themselves
        $currentUser = $request->get('user');
        if ($currentUser && $currentUser['id'] == $user['id']) {
            return ApiResponse::error('Cannot add yourself as a subuser', 'CANNOT_ADD_SELF', 400);
        }

        // Check if subuser already exists for this user+server combination
        $existingSubuser = Subuser::getSubuserByUserAndServer($user['id'], $server['id']);
        if ($existingSubuser) {
            return ApiResponse::error('User is already a subuser for this server', 'SUBUSER_ALREADY_EXISTS', 400);
        }

        // Prepare subuser data
        $subuserData = [
            'user_id' => $user['id'],
            'server_id' => $server['id'],
            'permissions' => json_encode(['*']),
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        // Create subuser
        $subuserId = Subuser::createSubuser($subuserData);
        if (!$subuserId) {
            return ApiResponse::error('Failed to create subuser', 'CREATE_FAILED', 500);
        }

        // Log activity
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'subuser_created',
            'metadata' => json_encode([
                'user_id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'permissions' => '*',
            ]),
            'user_id' => $request->get('user')['id'] ?? null,
        ]);

        // Get created subuser with details
        $subuser = Subuser::getSubuserWithDetails($subuserId);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerSubuserEvent::onServerSubuserCreated(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'subuser_id' => $subuserId,
                ]
            );
        }

        return ApiResponse::success($subuser, 'Subuser created successfully', 201);
    }

    #[OA\Put(
        path: '/api/user/servers/{uuidShort}/subusers/{subuserId}',
        summary: 'Update subuser',
        description: 'Update an existing subuser\'s permissions and other details.',
        tags: ['User - Server Subusers'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'subuserId',
                in: 'path',
                description: 'Subuser ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SubuserUpdateRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Subuser updated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/SubuserWithDetails')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid request data'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or subuser not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update subuser'),
        ]
    )]
    public function updateSubuser(Request $request, string $serverUuid, int $subuserId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get subuser info
        $subuser = Subuser::getSubuserById($subuserId);
        if (!$subuser) {
            return ApiResponse::error('Subuser not found', 'SUBUSER_NOT_FOUND', 404);
        }

        // Verify subuser belongs to this server
        if ($subuser['server_id'] != $server['id']) {
            return ApiResponse::error('Subuser not found', 'SUBUSER_NOT_FOUND', 404);
        }

        // Get request data
        $data = json_decode($request->getContent(), true);
        if (!$data) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST_DATA', 400);
        }

        // Add updated_at timestamp
        $data['updated_at'] = date('Y-m-d H:i:s');

        // Update subuser
        $success = Subuser::updateSubuser($subuserId, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update subuser', 'UPDATE_FAILED', 500);
        }

        // Log activity
        $user = User::getUserById($subuser['user_id']);
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'subuser_updated',
            'metadata' => json_encode([
                'user_id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
            ]),
            'user_id' => $request->get('user')['id'] ?? null,
        ]);

        // Get updated subuser
        $updatedSubuser = Subuser::getSubuserWithDetails($subuserId);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerSubuserEvent::onServerSubuserUpdated(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'subuser_id' => $subuserId,
                ]
            );
        }

        return ApiResponse::success($updatedSubuser, 'Subuser updated successfully');
    }

    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/subusers/{subuserId}',
        summary: 'Delete subuser',
        description: 'Remove a subuser from a server.',
        tags: ['User - Server Subusers'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'subuserId',
                in: 'path',
                description: 'Subuser ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Subuser deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or subuser not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete subuser'),
        ]
    )]
    public function deleteSubuser(Request $request, string $serverUuid, int $subuserId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get subuser info
        $subuser = Subuser::getSubuserById($subuserId);
        if (!$subuser) {
            return ApiResponse::error('Subuser not found', 'SUBUSER_NOT_FOUND', 404);
        }

        // Verify subuser belongs to this server
        if ($subuser['server_id'] != $server['id']) {
            return ApiResponse::error('Subuser not found', 'SUBUSER_NOT_FOUND', 404);
        }

        // Get user info for logging
        $user = User::getUserById($subuser['user_id']);

        // Delete subuser
        $success = Subuser::deleteSubuser($subuserId);
        if (!$success) {
            return ApiResponse::error('Failed to delete subuser', 'DELETE_FAILED', 500);
        }

        // Log activity
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'subuser_deleted',
            'metadata' => json_encode([
                'user_id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
            ]),
            'user_id' => $request->get('user')['id'] ?? null,
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerSubuserEvent::onServerSubuserDeleted(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'subuser_id' => $subuserId,
                ]
            );
        }

        return ApiResponse::success(null, 'Subuser deleted successfully');
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/subusers/{subuserId}/details',
        summary: 'Get subuser with details',
        description: 'Retrieve detailed information about a specific subuser including user and server information.',
        tags: ['User - Server Subusers'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'subuserId',
                in: 'path',
                description: 'Subuser ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Subuser details retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/SubuserWithDetails')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or subuser not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve subuser details'),
        ]
    )]
    public function getSubuserWithDetails(Request $request, string $serverUuid, int $subuserId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get subuser with details
        $subuser = Subuser::getSubuserWithDetails($subuserId);
        if (!$subuser) {
            return ApiResponse::error('Subuser not found', 'SUBUSER_NOT_FOUND', 404);
        }

        // Verify subuser belongs to this server
        if ($subuser['server_id'] != $server['id']) {
            return ApiResponse::error('Subuser not found', 'SUBUSER_NOT_FOUND', 404);
        }

        return ApiResponse::success($subuser);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/subusers/details',
        summary: 'Get all subusers with details',
        description: 'Retrieve all subusers for a server with detailed user information.',
        tags: ['User - Server Subusers'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Subusers with details retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/SubuserWithDetails')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve subusers'),
        ]
    )]
    public function getSubusersWithDetails(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get subusers with details
        $subusers = Subuser::getSubusersWithDetailsByServerId($server['id']);

        return ApiResponse::success($subusers);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/subusers/search-users',
        summary: 'Search users for subuser',
        description: 'Search for users by email or username to add as subusers. Excludes users who are already subusers for this server.',
        tags: ['User - Server Subusers'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Search term for username or email',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Users found successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/UserSearchResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID short or search query'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to search users'),
        ]
    )]
    public function searchUsers(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }
        // Get search query
        $search = $request->query->get('search', '');
        if (empty($search)) {
            return ApiResponse::error('Search query is required', 'MISSING_SEARCH_QUERY', 400);
        }

        // Search for users by email or username
        $users = User::searchUsers(
            page: 1,
            limit: 10,
            search: $search
        );

        // Filter out users who are already subusers for this server
        $existingSubuserIds = array_map(
            fn ($subuser) => $subuser['user_id'],
            Subuser::getSubusersByServerId($server['id'])
        );

        $availableUsers = array_filter($users, function ($user) use ($existingSubuserIds) {
            return !in_array($user['id'], $existingSubuserIds);
        });

        // Format user data for response
        $formattedUsers = array_map(function ($user) {
            return [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'uuid' => $user['uuid'],
                'first_name' => $user['first_name'] ?? '',
                'last_name' => $user['last_name'] ?? '',
            ];
        }, $availableUsers);

        return ApiResponse::success([
            'users' => $formattedUsers,
            'total' => count($formattedUsers),
        ]);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/subusers/permissions',
        summary: 'Get valid permissions',
        description: 'Retrieve the list of valid permissions that can be assigned to subusers.',
        tags: ['User - Server Subusers'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Valid permissions retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/PermissionsResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve permissions'),
        ]
    )]
    public function getValidPermissions(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        return ApiResponse::success([
            'permissions' => ['*'],
            'total' => 1,
        ]);
    }

    /**
     * Centralized check using ServerGateway with current request user.
     */
    private function userCanAccessServer(Request $request, array $server): bool
    {
        $currentUser = $request->get('user');
        if (!$currentUser || !isset($currentUser['uuid'])) {
            return false;
        }

        return ServerGateway::canUserAccessServer($currentUser['uuid'], $server['uuid']);
    }
}
