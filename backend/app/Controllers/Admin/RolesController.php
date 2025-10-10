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

namespace App\Controllers\Admin;

use App\Chat\Role;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\RolesEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'Role',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Role ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Role name'),
        new OA\Property(property: 'display_name', type: 'string', description: 'Role display name'),
        new OA\Property(property: 'color', type: 'string', description: 'Role color'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'RolePagination',
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
    schema: 'RoleCreate',
    type: 'object',
    required: ['name', 'display_name', 'color'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Role name', minLength: 2, maxLength: 255),
        new OA\Property(property: 'display_name', type: 'string', description: 'Role display name', minLength: 2, maxLength: 255),
        new OA\Property(property: 'color', type: 'string', description: 'Role color', maxLength: 32),
    ]
)]
#[OA\Schema(
    schema: 'RoleUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Role name', minLength: 2, maxLength: 255),
        new OA\Property(property: 'display_name', type: 'string', description: 'Role display name', minLength: 2, maxLength: 255),
        new OA\Property(property: 'color', type: 'string', description: 'Role color', maxLength: 32),
    ]
)]
class RolesController
{
    #[OA\Get(
        path: '/api/admin/roles',
        summary: 'Get all roles',
        description: 'Retrieve a paginated list of all roles with optional search functionality.',
        tags: ['Admin - Roles'],
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
                description: 'Search term to filter roles by name or display name',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Roles retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'roles', type: 'array', items: new OA\Items(ref: '#/components/schemas/Role')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/RolePagination'),
                        new OA\Property(property: 'search', type: 'object', properties: [
                            new OA\Property(property: 'query', type: 'string'),
                            new OA\Property(property: 'has_results', type: 'boolean'),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function index(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $offset = ($page - 1) * $limit;
        $roles = Role::getAll($search, $limit, $offset);
        $total = Role::getCount($search);

        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'roles' => $roles,
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
                'has_results' => count($roles) > 0,
            ],
        ], 'Roles fetched successfully', 200);

    }

    #[OA\Get(
        path: '/api/admin/roles/{id}',
        summary: 'Get role by ID',
        description: 'Retrieve a specific role by its ID.',
        tags: ['Admin - Roles'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Role ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Role retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'role', ref: '#/components/schemas/Role'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid role ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Role not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $role = Role::getById($id);
        if (!$role) {
            return ApiResponse::error('Role not found', 'ROLE_NOT_FOUND', 404);
        }

        return ApiResponse::success(['role' => $role], 'Role fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/roles',
        summary: 'Create new role',
        description: 'Create a new role with name, display name, and color. Validates field lengths and data types.',
        tags: ['Admin - Roles'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/RoleCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Role created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'role', ref: '#/components/schemas/Role'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing required fields, invalid data types, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create role'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        $requiredFields = ['name', 'display_name', 'color'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }
        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
        }
        if (!is_string($data['name']) || !is_string($data['display_name']) || !is_string($data['color'])) {
            return ApiResponse::error('Name, display_name, and color must be strings', 'INVALID_DATA_TYPE');
        }
        if (strlen($data['name']) < 2 || strlen($data['name']) > 255) {
            return ApiResponse::error('Name must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (strlen($data['display_name']) < 2 || strlen($data['display_name']) > 255) {
            return ApiResponse::error('Display name must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (strlen($data['color']) > 32) {
            return ApiResponse::error('Color must be less than 32 characters', 'INVALID_DATA_LENGTH');
        }
        $id = Role::createRole($data);
        if (!$id) {
            return ApiResponse::error('Failed to create role', 'ROLE_CREATE_FAILED', 400);
        }
        $role = Role::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_role',
            'context' => 'Created role: ' . $role['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                RolesEvent::onRoleCreated(),
                [
                    'role' => $role,
                    'created_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['role' => $role], 'Role created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/roles/{id}',
        summary: 'Update role',
        description: 'Update an existing role. Only provided fields will be updated. Validates field lengths and data types.',
        tags: ['Admin - Roles'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Role ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/RoleUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Role updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'role', ref: '#/components/schemas/Role'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, no data provided, invalid data types, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Role not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update role'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $role = Role::getById($id);
        if (!$role) {
            return ApiResponse::error('Role not found', 'ROLE_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }
        if (isset($data['id'])) {
            unset($data['id']);
        }
        if (isset($data['name'])) {
            if (!is_string($data['name'])) {
                return ApiResponse::error('Name must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['name']) < 2 || strlen($data['name']) > 255) {
                return ApiResponse::error('Name must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
            }
        }
        if (isset($data['display_name'])) {
            if (!is_string($data['display_name'])) {
                return ApiResponse::error('Display name must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['display_name']) < 2 || strlen($data['display_name']) > 255) {
                return ApiResponse::error('Display name must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
            }
        }
        if (isset($data['color'])) {
            if (!is_string($data['color'])) {
                return ApiResponse::error('Color must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['color']) > 32) {
                return ApiResponse::error('Color must be less than 32 characters', 'INVALID_DATA_LENGTH');
            }
        }
        $success = Role::updateRole($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update role', 'ROLE_UPDATE_FAILED', 400);
        }
        $role = Role::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_role',
            'context' => 'Updated role: ' . $role['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                RolesEvent::onRoleUpdated(),
                [
                    'role' => $role,
                    'updated_data' => $data,
                    'updated_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['role' => $role], 'Role updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/roles/{id}',
        summary: 'Delete role',
        description: 'Permanently delete a role from the database. Default roles (Admin, Moderator, User, Banned) cannot be deleted. This action cannot be undone.',
        tags: ['Admin - Roles'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Role ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Role deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid role ID or cannot delete default role'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Role not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete role'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $role = Role::getById($id);
        if (!$role) {
            return ApiResponse::error('Role not found', 'ROLE_NOT_FOUND', 404);
        }
        $prevent_delete = [1, 2, 3, 4]; // 1 = Admin, 2 = Moderator, 3 = User, 4 = Banned
        if (in_array($id, $prevent_delete)) {
            return ApiResponse::error('Cannot delete default role', 'DEFAULT_ROLE_DELETE_FAILED', 400);
        }
        $success = Role::deleteRole($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete role', 'ROLE_DELETE_FAILED', 400);
        }

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_role',
            'context' => 'Deleted role: ' . $role['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                RolesEvent::onRoleDeleted(),
                [
                    'role' => $role,
                    'deleted_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([], 'Role deleted successfully', 200);
    }
}
