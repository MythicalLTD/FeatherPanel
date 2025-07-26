<?php

/*
 * This file is part of App.
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
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionsController
{
    public function index(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');
        $roleId = $request->query->get('role_id');
        $offset = ($page - 1) * $limit;
        if ($roleId) {
            $permissions = Permission::getPermissionsByRoleId((int) $roleId);
            $total = count($permissions);
        } else {
            $permissions = Permission::getAll($search, $limit, $offset);
            $total = Permission::getCount($search);
        }

        return ApiResponse::success([
            'permissions' => $permissions,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
            ],
        ], 'Permissions fetched successfully', 200);
    }

    public function show(Request $request, int $id): Response
    {
        $permission = Permission::getById($id);
        if (!$permission) {
            return ApiResponse::error('Permission not found', 'PERMISSION_NOT_FOUND', 404);
        }

        return ApiResponse::success(['permission' => $permission], 'Permission fetched successfully', 200);
    }

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

        return ApiResponse::success(['permission' => $permission], 'Permission created successfully', 201);
    }

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

        return ApiResponse::success(['permission' => $permission], 'Permission updated successfully', 200);
    }

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

        return ApiResponse::success([], 'Permission deleted successfully', 200);
    }
}
