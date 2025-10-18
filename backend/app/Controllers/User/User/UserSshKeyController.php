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

namespace App\Controllers\User\User;

use App\Chat\User;
use App\Chat\Activity;
use App\Chat\UserSshKey;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Middleware\AuthMiddleware;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use App\Plugins\Events\Events\UserSshKeyEvent;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'UserSshKey',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'SSH key ID'),
        new OA\Property(property: 'user_id', type: 'integer', description: 'User ID'),
        new OA\Property(property: 'name', type: 'string', description: 'SSH key name'),
        new OA\Property(property: 'public_key', type: 'string', description: 'SSH public key'),
        new OA\Property(property: 'fingerprint', type: 'string', description: 'SSH key fingerprint'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
        new OA\Property(property: 'deleted_at', type: 'string', format: 'date-time', nullable: true, description: 'Deletion timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'UserSshKeyList',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'SSH key ID'),
        new OA\Property(property: 'user_id', type: 'integer', description: 'User ID'),
        new OA\Property(property: 'name', type: 'string', description: 'SSH key name'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
        new OA\Property(property: 'deleted_at', type: 'string', format: 'date-time', nullable: true, description: 'Deletion timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'SshKeyPagination',
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
#[OA\Schema(
    schema: 'SshKeySearch',
    type: 'object',
    properties: [
        new OA\Property(property: 'query', type: 'string', description: 'Search query'),
        new OA\Property(property: 'has_results', type: 'boolean', description: 'Whether search returned results'),
    ]
)]
#[OA\Schema(
    schema: 'SshKeyCreateRequest',
    type: 'object',
    required: ['name', 'public_key'],
    properties: [
        new OA\Property(property: 'name', type: 'string', minLength: 1, maxLength: 191, description: 'SSH key name'),
        new OA\Property(property: 'public_key', type: 'string', description: 'SSH public key'),
    ]
)]
#[OA\Schema(
    schema: 'SshKeyUpdateRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', minLength: 1, maxLength: 191, description: 'SSH key name'),
        new OA\Property(property: 'public_key', type: 'string', description: 'SSH public key'),
    ]
)]
#[OA\Schema(
    schema: 'SshKeyFingerprintRequest',
    type: 'object',
    required: ['public_key'],
    properties: [
        new OA\Property(property: 'public_key', type: 'string', description: 'SSH public key to generate fingerprint for'),
    ]
)]
#[OA\Schema(
    schema: 'SshKeyFingerprintResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'fingerprint', type: 'string', description: 'Generated fingerprint'),
        new OA\Property(property: 'public_key', type: 'string', description: 'Original public key'),
    ]
)]
#[OA\Schema(
    schema: 'SshKeyActivity',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Activity ID'),
        new OA\Property(property: 'user_uuid', type: 'string', description: 'User UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'Activity name'),
        new OA\Property(property: 'context', type: 'string', description: 'Activity context'),
        new OA\Property(property: 'ip_address', type: 'string', description: 'IP address'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
    ]
)]
class UserSshKeyController
{
    #[OA\Get(
        path: '/api/user/ssh-keys',
        summary: 'Get SSH keys',
        description: 'Retrieve all SSH keys for the authenticated user with pagination and search functionality.',
        tags: ['User - SSH Keys'],
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
                description: 'Search term to filter SSH keys by name',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'include_deleted',
                in: 'query',
                description: 'Include soft-deleted SSH keys',
                required: false,
                schema: new OA\Schema(type: 'boolean', default: false)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'SSH keys retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ssh_keys', type: 'array', items: new OA\Items(ref: '#/components/schemas/UserSshKeyList')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/SshKeyPagination'),
                        new OA\Property(property: 'search', ref: '#/components/schemas/SshKeySearch'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve SSH keys'),
        ]
    )]
    public function getUserSshKeys(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');
        $includeDeleted = $request->query->get('include_deleted', 'false') === 'true';

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        // Get user's SSH keys with pagination and search
        $sshKeys = UserSshKey::searchUserSshKeys(
            page: $page,
            limit: $limit,
            search: $search,
            userId: $user['id'],
            includeDeleted: $includeDeleted
        );

        // Sanitize sensitive data for response
        foreach ($sshKeys as &$key) {
            unset($key['public_key'], $key['fingerprint']); // Don't expose full public key in list
            // Don't expose fingerprint in list
        }

        $total = UserSshKey::getCount($search, $user['id']);
        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'ssh_keys' => $sshKeys,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from,
                'to' => $to,
            ],
            'search' => [
                'query' => $search,
                'has_results' => count($sshKeys) > 0,
            ],
        ], 'User SSH keys fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/ssh-keys/{id}',
        summary: 'Get specific SSH key',
        description: 'Retrieve details of a specific SSH key by ID for the authenticated user.',
        tags: ['User - SSH Keys'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'SSH key ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'SSH key retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/UserSshKey')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token or SSH key ID'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to SSH key'),
            new OA\Response(response: 404, description: 'Not found - SSH key not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve SSH key'),
        ]
    )]
    public function getUserSshKey(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
        }

        $sshKey = UserSshKey::getUserSshKeyById($id);
        if (!$sshKey) {
            return ApiResponse::error('SSH key not found', 'SSH_KEY_NOT_FOUND', 404);
        }

        // Ensure the user can only access their own SSH keys
        if ($sshKey['user_id'] != $user['id']) {
            return ApiResponse::error('You are not allowed to access this SSH key', 'UNAUTHORIZED_ACCESS', 403);
        }

        return ApiResponse::success($sshKey, 'SSH key fetched successfully', 200);
    }

    #[OA\Post(
        path: '/api/user/ssh-keys',
        summary: 'Create SSH key',
        description: 'Create a new SSH key for the authenticated user with automatic fingerprint generation.',
        tags: ['User - SSH Keys'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SshKeyCreateRequest')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'SSH key created successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/UserSshKey')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token, missing required fields, or invalid name length'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create SSH key'),
        ]
    )]
    public function createUserSshKey(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $data = json_decode($request->getContent(), true);
        if ($data == null) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST_DATA', 400);
        }

        // Validate required fields
        $required = ['name', 'public_key'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                return ApiResponse::error("Missing required field: $field", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        // Validate data length
        if (strlen($data['name']) < 1 || strlen($data['name']) > 191) {
            return ApiResponse::error('Name must be between 1 and 191 characters', 'INVALID_NAME_LENGTH', 400);
        }

        // Add user_id to the data
        $data['user_id'] = $user['id'];

        // Validate SSH public key format early to return a clear 400 instead of 500
        if (!UserSshKey::isValidSshPublicKey($data['public_key'])) {
            return ApiResponse::error(
                'Invalid SSH public key format. Please paste a full public key such as ssh-ed25519/ssh-rsa one-line or a PEM public key.',
                'INVALID_SSH_PUBLIC_KEY',
                400
            );
        }

        // Create the SSH key
        $sshKeyId = UserSshKey::createUserSshKey($data);
        if ($sshKeyId === false) {
            return ApiResponse::error('Failed to create SSH key', 'SSH_KEY_CREATION_FAILED', 500);
        }

        // Get the created SSH key
        $sshKey = UserSshKey::getUserSshKeyById($sshKeyId);
        if (!$sshKey) {
            return ApiResponse::error('SSH key created but failed to retrieve', 'SSH_KEY_RETRIEVAL_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_created',
            'context' => 'Created SSH key: ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserSshKeyEvent::onUserSshKeyCreated(),
                [
                    'user_uuid' => $user['uuid'],
                    'ssh_key' => $sshKey,
                ]
            );
        }

        return ApiResponse::success($sshKey, 'SSH key created successfully', 201);
    }

    #[OA\Put(
        path: '/api/user/ssh-keys/{id}',
        summary: 'Update SSH key',
        description: 'Update an existing SSH key for the authenticated user. Can update name and public key.',
        tags: ['User - SSH Keys'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'SSH key ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SshKeyUpdateRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'SSH key updated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/UserSshKey')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token, SSH key ID, request data, or invalid name length'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to SSH key'),
            new OA\Response(response: 404, description: 'Not found - SSH key not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update SSH key'),
        ]
    )]
    public function updateUserSshKey(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
        }

        // Check if the SSH key exists and belongs to the user
        $existingSshKey = UserSshKey::getUserSshKeyById($id);
        if (!$existingSshKey) {
            return ApiResponse::error('SSH key not found', 'SSH_KEY_NOT_FOUND', 404);
        }

        if ($existingSshKey['user_id'] != $user['id']) {
            return ApiResponse::error('You are not allowed to access this SSH key', 'UNAUTHORIZED_ACCESS', 403);
        }

        $data = json_decode($request->getContent(), true);
        if ($data == null) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST_DATA', 400);
        }

        // Validate allowed fields
        $allowedFields = ['name', 'public_key'];
        $validData = [];
        foreach ($data as $key => $value) {
            if (in_array($key, $allowedFields)) {
                $validData[$key] = $value;
            }
        }

        if (empty($validData)) {
            return ApiResponse::error('No valid fields to update', 'NO_VALID_FIELDS', 400);
        }

        // Validate data length
        if (isset($validData['name']) && (strlen($validData['name']) < 1 || strlen($validData['name']) > 191)) {
            return ApiResponse::error('Name must be between 1 and 191 characters', 'INVALID_NAME_LENGTH', 400);
        }

        // Update the SSH key
        $success = UserSshKey::updateUserSshKey($id, $validData);
        if (!$success) {
            return ApiResponse::error('Failed to update SSH key', 'SSH_KEY_UPDATE_FAILED', 500);
        }

        // Get the updated SSH key
        $updatedSshKey = UserSshKey::getUserSshKeyById($id);
        if (!$updatedSshKey) {
            return ApiResponse::error('SSH key updated but failed to retrieve', 'SSH_KEY_RETRIEVAL_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_updated',
            'context' => 'Updated SSH key: ' . $existingSshKey['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserSshKeyEvent::onUserSshKeyUpdated(),
                [
                    'user_uuid' => $user['uuid'],
                    'ssh_key' => $updatedSshKey,
                    'updated_data' => $data,
                ]
            );
        }

        return ApiResponse::success($updatedSshKey, 'SSH key updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/user/ssh-keys/{id}',
        summary: 'Delete SSH key',
        description: 'Soft delete an SSH key for the authenticated user. The key can be restored later.',
        tags: ['User - SSH Keys'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'SSH key ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'SSH key deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token or SSH key ID'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to SSH key'),
            new OA\Response(response: 404, description: 'Not found - SSH key not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete SSH key'),
        ]
    )]
    public function deleteUserSshKey(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
        }

        // Check if the SSH key exists and belongs to the user
        $existingSshKey = UserSshKey::getUserSshKeyById($id);
        if (!$existingSshKey) {
            return ApiResponse::error('SSH key not found', 'SSH_KEY_NOT_FOUND', 404);
        }

        if ($existingSshKey['user_id'] != $user['id']) {
            return ApiResponse::error('You are not allowed to access this SSH key', 'UNAUTHORIZED_ACCESS', 403);
        }

        // Delete the SSH key
        $success = UserSshKey::deleteUserSshKey($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete SSH key', 'SSH_KEY_DELETION_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_deleted',
            'context' => 'Deleted SSH key: ' . $existingSshKey['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserSshKeyEvent::onUserSshKeyDeleted(),
                [
                    'user_uuid' => $user['uuid'],
                    'ssh_key' => $existingSshKey,
                ]
            );
        }

        return ApiResponse::success(null, 'SSH key deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/user/ssh-keys/{id}/restore',
        summary: 'Restore SSH key',
        description: 'Restore a soft-deleted SSH key for the authenticated user.',
        tags: ['User - SSH Keys'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'SSH key ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'SSH key restored successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/UserSshKey')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token or SSH key ID'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to SSH key'),
            new OA\Response(response: 404, description: 'Not found - SSH key not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to restore SSH key'),
        ]
    )]
    public function restoreUserSshKey(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
        }

        // Check if the SSH key exists and belongs to the user (including deleted ones)
        $existingSshKey = UserSshKey::getUserSshKeyById($id);
        if (!$existingSshKey) {
            // Try to get it with deleted ones included
            $sshKeys = UserSshKey::getUserSshKeysByUserId($user['id'], true);
            $sshKey = null;
            foreach ($sshKeys as $key) {
                if ($key['id'] == $id) {
                    $sshKey = $key;
                    break;
                }
            }

            if (!$sshKey) {
                return ApiResponse::error('SSH key not found', 'SSH_KEY_NOT_FOUND', 404);
            }
        } else {
            $sshKey = $existingSshKey;
        }

        if ($sshKey['user_id'] != $user['id']) {
            return ApiResponse::error('You are not allowed to access this SSH key', 'UNAUTHORIZED_ACCESS', 403);
        }

        // Restore the SSH key
        $success = UserSshKey::restoreUserSshKey($id);
        if (!$success) {
            return ApiResponse::error('Failed to restore SSH key', 'SSH_KEY_RESTORE_FAILED', 500);
        }

        // Get the restored SSH key
        $restoredSshKey = UserSshKey::getUserSshKeyById($id);
        if (!$restoredSshKey) {
            return ApiResponse::error('SSH key restored but failed to retrieve', 'SSH_KEY_RETRIEVAL_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_restored',
            'context' => 'Restored SSH key: ' . $sshKey['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserSshKeyEvent::onUserSshKeyUpdated(),
                [
                    'user_uuid' => $user['uuid'],
                    'ssh_key' => $restoredSshKey,
                    'action' => 'restored',
                ]
            );
        }

        return ApiResponse::success($restoredSshKey, 'SSH key restored successfully', 200);
    }

    #[OA\Delete(
        path: '/api/user/ssh-keys/{id}/hard-delete',
        summary: 'Hard delete SSH key',
        description: 'Permanently delete an SSH key for the authenticated user. This action cannot be undone.',
        tags: ['User - SSH Keys'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'SSH key ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'SSH key permanently deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token or SSH key ID'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to SSH key'),
            new OA\Response(response: 404, description: 'Not found - SSH key not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to permanently delete SSH key'),
        ]
    )]
    public function hardDeleteUserSshKey(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
        }

        // Check if the SSH key exists and belongs to the user (including deleted ones)
        $sshKeys = UserSshKey::getUserSshKeysByUserId($user['id'], true);
        $sshKey = null;
        foreach ($sshKeys as $key) {
            if ($key['id'] == $id) {
                $sshKey = $key;
                break;
            }
        }

        if (!$sshKey) {
            return ApiResponse::error('SSH key not found', 'SSH_KEY_NOT_FOUND', 404);
        }

        if ($sshKey['user_id'] != $user['id']) {
            return ApiResponse::error('You are not allowed to access this SSH key', 'UNAUTHORIZED_ACCESS', 403);
        }

        // Hard delete the SSH key
        $success = UserSshKey::hardDeleteUserSshKey($id);
        if (!$success) {
            return ApiResponse::error('Failed to permanently delete SSH key', 'SSH_KEY_HARD_DELETION_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_hard_deleted',
            'context' => 'Permanently deleted SSH key: ' . $sshKey['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserSshKeyEvent::onUserSshKeyDeleted(),
                [
                    'user_uuid' => $user['uuid'],
                    'ssh_key' => $sshKey,
                    'action' => 'hard_deleted',
                ]
            );
        }

        return ApiResponse::success(null, 'SSH key permanently deleted successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/ssh-keys/activities',
        summary: 'Get SSH key activities',
        description: 'Retrieve SSH key related activities for the authenticated user with pagination.',
        tags: ['User - SSH Keys'],
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
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'SSH key activities retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'activities', type: 'array', items: new OA\Items(ref: '#/components/schemas/SshKeyActivity')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/SshKeyPagination'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve activities'),
        ]
    )]
    public function getUserSshKeyActivities(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        // Get user's SSH key related activities
        $activities = Activity::getActivitiesByUser($user['uuid']);
        $sshKeyActivities = array_filter($activities, function ($activity) {
            return str_starts_with($activity['name'], 'ssh_key_');
        });

        // Apply pagination
        $total = count($sshKeyActivities);
        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit;
        $to = min($from + $limit, $total);
        $paginatedActivities = array_slice($sshKeyActivities, $from, $limit);

        return ApiResponse::success([
            'activities' => $paginatedActivities,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from + 1,
                'to' => $to,
            ],
        ], 'SSH key activities fetched successfully', 200);
    }

    #[OA\Post(
        path: '/api/user/ssh-keys/generate-fingerprint',
        summary: 'Generate SSH key fingerprint',
        description: 'Generate a fingerprint from an SSH public key for validation purposes.',
        tags: ['User - SSH Keys'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SshKeyFingerprintRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Fingerprint generated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/SshKeyFingerprintResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token, missing public key, empty public key, or invalid SSH key format'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to generate fingerprint'),
        ]
    )]
    public function generateFingerprint(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $data = json_decode($request->getContent(), true);
        if ($data == null || !isset($data['public_key'])) {
            return ApiResponse::error('Public key is required', 'PUBLIC_KEY_REQUIRED', 400);
        }

        $publicKey = trim($data['public_key']);
        if (empty($publicKey)) {
            return ApiResponse::error('Public key cannot be empty', 'PUBLIC_KEY_EMPTY', 400);
        }

        // Validate the public key format
        if (!UserSshKey::isValidSshPublicKey($publicKey)) {
            return ApiResponse::error('Invalid SSH public key format', 'INVALID_SSH_KEY_FORMAT', 400);
        }

        // Generate the fingerprint
        $fingerprint = UserSshKey::generateFingerprint($publicKey);

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_fingerprint_generated',
            'context' => 'Generated fingerprint for SSH key',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'fingerprint' => $fingerprint,
            'public_key' => $publicKey,
        ], 'Fingerprint generated successfully', 200);
    }
}
