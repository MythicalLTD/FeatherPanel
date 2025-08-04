<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Admin;

use App\Chat\Role;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class RolesController
{
    public function index(Request $request): Response
    {
        // Validate and sanitize pagination parameters
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);

        // Adjust page parameter if it's less than 1
        if ($page < 1) {
            $page = 1;
        }

        // Adjust limit parameter with reasonable bounds
        $maxLimit = 100; // Define maximum limit to prevent performance issues
        if ($limit < 1) {
            $limit = 10; // Default to 10 if limit is less than 1
        }
        if ($limit > $maxLimit) {
            $limit = $maxLimit; // Cap at maximum limit
        }

        $search = $request->query->get('search', '');
        $offset = ($page - 1) * $limit;
        $roles = Role::getAll($search, $limit, $offset);
        $total = Role::getCount($search);

        return ApiResponse::success([
            'roles' => $roles,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
            ],
        ], 'Roles fetched successfully', 200);
    }

    public function show(Request $request, int $id): Response
    {
        $role = Role::getById($id);
        if (!$role) {
            return ApiResponse::error('Role not found', 'ROLE_NOT_FOUND', 404);
        }

        return ApiResponse::success(['role' => $role], 'Role fetched successfully', 200);
    }

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

        return ApiResponse::success(['role' => $role], 'Role created successfully', 201);
    }

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

        return ApiResponse::success(['role' => $role], 'Role updated successfully', 200);
    }

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

        return ApiResponse::success([], 'Role deleted successfully', 200);
    }
}
