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
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SubuserController
{
    /**
     * Get all subusers for a server.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function getSubusers(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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

    /**
     * Get a specific subuser.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $subuserId The subuser ID
     *
     * @return Response The HTTP response
     */
    public function getSubuser(Request $request, string $serverUuid, int $subuserId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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

    /**
     * Create a new subuser.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function createSubuser(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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
        $eventManager->emit(
            ServerEvent::onServerSubuserCreated(),
            ['user_uuid' => $request->get('user')['uuid'], 'server_uuid' => $server['uuid'], 'subuser_id' => $subuserId]
        );

        return ApiResponse::success($subuser, 'Subuser created successfully', 201);
    }

    /**
     * Update a subuser.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $subuserId The subuser ID
     *
     * @return Response The HTTP response
     */
    public function updateSubuser(Request $request, string $serverUuid, int $subuserId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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
        $eventManager->emit(
            ServerEvent::onServerSubuserUpdated(),
            ['user_uuid' => $request->get('user')['uuid'], 'server_uuid' => $server['uuid'], 'subuser_id' => $subuserId]
        );

        return ApiResponse::success($updatedSubuser, 'Subuser updated successfully');
    }

    /**
     * Delete a subuser.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $subuserId The subuser ID
     *
     * @return Response The HTTP response
     */
    public function deleteSubuser(Request $request, string $serverUuid, int $subuserId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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
        $eventManager->emit(
            ServerEvent::onServerSubuserDeleted(),
            ['user_uuid' => $request->get('user')['uuid'], 'server_uuid' => $server['uuid'], 'subuser_id' => $subuserId]
        );

        return ApiResponse::success(null, 'Subuser deleted successfully');
    }

    /**
     * Get subuser with details (user and server info).
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $subuserId The subuser ID
     *
     * @return Response The HTTP response
     */
    public function getSubuserWithDetails(Request $request, string $serverUuid, int $subuserId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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

    /**
     * Get all subusers with details for a server.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function getSubusersWithDetails(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Get subusers with details
        $subusers = Subuser::getSubusersWithDetailsByServerId($server['id']);

        return ApiResponse::success($subusers);
    }

    /**
     * Search for users by email to add as subusers.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function searchUsers(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // TODO: Add user permission check here
        // if (!$this->userCanAccessServer($request, $server)) {
        //     return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        // }

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

    /**
     * Get valid permissions list.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function getValidPermissions(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // TODO: Add user permission check here
        // if (!$this->userCanAccessServer($request, $server)) {
        //     return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        // }

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
