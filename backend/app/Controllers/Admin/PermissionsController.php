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

use App\Chat\Activity;
use App\Chat\Permission;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\PermissionsEvent;

#[OA\Schema(
    schema: 'Permission',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Permission ID'),
        new OA\Property(property: 'role_id', type: 'integer', description: 'Role ID'),
        new OA\Property(property: 'permission', type: 'string', description: 'Permission name'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'PermissionPagination',
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
    schema: 'PermissionCreate',
    type: 'object',
    required: ['role_id', 'permission'],
    properties: [
        new OA\Property(property: 'role_id', type: 'integer', description: 'Role ID', minimum: 1),
        new OA\Property(property: 'permission', type: 'string', description: 'Permission name', minLength: 2, maxLength: 255),
    ]
)]
#[OA\Schema(
    schema: 'PermissionUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'role_id', type: 'integer', description: 'Role ID', minimum: 1),
        new OA\Property(property: 'permission', type: 'string', description: 'Permission name', minLength: 2, maxLength: 255),
    ]
)]
class PermissionsController
{
    #[OA\Get(
        path: '/api/admin/permissions',
        summary: 'Get all permissions',
        description: 'Retrieve a paginated list of all permissions with optional search functionality and role filtering.',
        tags: ['Admin - Permissions'],
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
                description: 'Search term to filter permissions by permission name',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'role_id',
                in: 'query',
                description: 'Filter permissions by specific role ID',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Permissions retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(ref: '#/components/schemas/Permission')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/PermissionPagination'),
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
        $roleId = $request->query->get('role_id');

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

        if ($roleId) {
            $permissions = Permission::getPermissionsByRoleId((int) $roleId, $limit, $offset);
            $total = Permission::getCountByRoleId((int) $roleId);
        } else {
            $permissions = Permission::getAll($search, $limit, $offset);
            $total = Permission::getCount($search);
        }

        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'permissions' => $permissions,
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
                'has_results' => count($permissions) > 0,
            ],
        ], 'Permissions fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/permissions/{id}',
        summary: 'Get permission by ID',
        description: 'Retrieve a specific permission by its ID.',
        tags: ['Admin - Permissions'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Permission ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Permission retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'permission', ref: '#/components/schemas/Permission'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid permission ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Permission not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $permission = Permission::getById($id);
        if (!$permission) {
            return ApiResponse::error('Permission not found', 'PERMISSION_NOT_FOUND', 404);
        }

        return ApiResponse::success(['permission' => $permission], 'Permission fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/permissions',
        summary: 'Create new permission',
        description: 'Create a new permission for a specific role. Validates role ID and permission name format.',
        tags: ['Admin - Permissions'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/PermissionCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Permission created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'permission', ref: '#/components/schemas/Permission'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing required fields, invalid data types, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create permission'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        $requiredFields = ['role_id', 'permission'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                $missingFields[] = $field;
            }
        }
        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
        }
        if (!is_numeric($data['role_id'])) {
            return ApiResponse::error('role_id must be an integer', 'INVALID_DATA_TYPE');
        }
        if (!is_string($data['permission'])) {
            return ApiResponse::error('Permission must be a string', 'INVALID_DATA_TYPE');
        }
        if (strlen($data['permission']) < 2 || strlen($data['permission']) > 255) {
            return ApiResponse::error('Permission must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
        }
        $id = Permission::createPermission($data);
        if (!$id) {
            return ApiResponse::error('Failed to create permission', 'PERMISSION_CREATE_FAILED', 400);
        }
        $permission = Permission::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_permission',
            'context' => 'Created permission: ' . $permission['permission'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                PermissionsEvent::onPermissionCreated(),
                [
                    'permission' => $permission,
                    'created_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['permission' => $permission], 'Permission created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/permissions/{id}',
        summary: 'Update permission',
        description: 'Update an existing permission. Only provided fields will be updated. Validates role ID and permission name format.',
        tags: ['Admin - Permissions'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Permission ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/PermissionUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Permission updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'permission', ref: '#/components/schemas/Permission'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, no data provided, invalid data types, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Permission not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update permission'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $permission = Permission::getById($id);
        if (!$permission) {
            return ApiResponse::error('Permission not found', 'PERMISSION_NOT_FOUND', 404);
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
        if (isset($data['role_id']) && !is_numeric($data['role_id'])) {
            return ApiResponse::error('role_id must be an integer', 'INVALID_DATA_TYPE');
        }
        if (isset($data['permission'])) {
            if (!is_string($data['permission'])) {
                return ApiResponse::error('Permission must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['permission']) < 2 || strlen($data['permission']) > 255) {
                return ApiResponse::error('Permission must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
            }
        }
        $success = Permission::updatePermission($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update permission', 'PERMISSION_UPDATE_FAILED', 400);
        }
        $permission = Permission::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_permission',
            'context' => 'Updated permission: ' . $permission['permission'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                PermissionsEvent::onPermissionUpdated(),
                [
                    'permission' => $permission,
                    'updated_data' => $data,
                    'updated_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['permission' => $permission], 'Permission updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/permissions/{id}',
        summary: 'Delete permission',
        description: 'Permanently delete a permission from the database. This action cannot be undone.',
        tags: ['Admin - Permissions'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Permission ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Permission deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid permission ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Permission not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete permission'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $permission = Permission::getById($id);
        if (!$permission) {
            return ApiResponse::error('Permission not found', 'PERMISSION_NOT_FOUND', 404);
        }
        $success = Permission::deletePermission($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete permission', 'PERMISSION_DELETE_FAILED', 400);
        }
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_permission',
            'context' => 'Deleted permission: ' . $permission['permission'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                PermissionsEvent::onPermissionDeleted(),
                [
                    'permission' => $permission,
                    'deleted_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([], 'Permission deleted successfully', 200);
    }
}
