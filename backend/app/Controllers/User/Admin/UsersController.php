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

namespace App\Controllers\User\Admin;

use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class UsersController
{
    public function index(Request $request): Response
    {
        $page = $request->query->get('page', 1);
        $limit = $request->query->get('limit', 10);
        $search = $request->query->get('search', '');

        $users = \App\Chat\User::searchUsers(
            (int) $page,
            (int) $limit,
            $search,
            false, // no deleted users
            [
                'username',
                'uuid',
                'role_id',
                'avatar',
                'last_seen',
                'email',
            ],
            'id',
            'ASC'
        );

        $roles = \App\Chat\Role::getAllRoles();
        // Build a map of role_id => [name, real_name, color]
        $rolesMap = [];
        foreach ($roles as $role) {
            $rolesMap[$role['id']] = [
                'name' => $role['name'],
                'display_name' => $role['display_name'],
                'color' => $role['color'],
            ];
        }

        foreach ($users as &$user) {
            $roleId = $user['role_id'];
            if (isset($rolesMap[$roleId])) {
                $user['role']['name'] = $rolesMap[$roleId]['name'];
                $user['role']['display_name'] = $rolesMap[$roleId]['display_name'];
                $user['role']['color'] = $rolesMap[$roleId]['color'];
            } else {
                $user['role']['name'] = $roleId;
                $user['role']['display_name'] = 'User';
                $user['role']['color'] = '#666666';
            }
            unset($user['role_id']);
        }

        // Get total count for pagination (without limit/offset)
        $allUsers = \App\Chat\User::getAllUsers(false);
        $total = count($allUsers);

        return ApiResponse::success([
            'users' => $users,
            'pagination' => [
                'page' => (int) $page,
                'limit' => (int) $limit,
                'total' => (int) $total,
            ],
        ], 'Users fetched successfully', 200);
    }

    public function show(Request $request, string $uuid): Response
    {
        $user = \App\Chat\User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }
        $roles = \App\Chat\Role::getAllRoles();
        $rolesMap = [];
        foreach ($roles as $role) {
            $rolesMap[$role['id']] = [
                'name' => $role['name'],
                'display_name' => $role['display_name'],
                'color' => $role['color'],
            ];
        }
        $roleId = $user['role_id'] ?? null;
        if ($roleId && isset($rolesMap[$roleId])) {
            $user['role']['name'] = $rolesMap[$roleId]['name'];
            $user['role']['display_name'] = $rolesMap[$roleId]['display_name'];
            $user['role']['color'] = $rolesMap[$roleId]['color'];
        } else {
            $user['role']['name'] = $roleId;
            $user['role']['display_name'] = 'User';
            $user['role']['color'] = '#666666';
        }
        unset($user['role_id']);

        return ApiResponse::success(['user' => $user], 'User fetched successfully', 200);
    }

    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        // Required fields for user creation
        $requiredFields = ['username', 'first_name', 'last_name', 'email', 'password'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }
        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
        }
        // Validate data types and format
        foreach ($requiredFields as $field) {
            if (!is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE');
            }
            $data[$field] = trim($data[$field]);
        }
        // Validate data length
        $lengthRules = [
            'username' => [3, 32],
            'first_name' => [1, 64],
            'last_name' => [1, 64],
            'email' => [3, 255],
            'password' => [8, 255],
        ];
        foreach ($lengthRules as $field => [$min, $max]) {
            $len = strlen($data[$field]);
            if ($len < $min) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $min characters long", 'INVALID_DATA_LENGTH');
            }
            if ($len > $max) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $max characters long", 'INVALID_DATA_LENGTH');
            }
        }
        // Validate email format
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return ApiResponse::error('Invalid email address', 'INVALID_EMAIL_ADDRESS');
        }
        // Check for existing email/username
        if (\App\Chat\User::getUserByEmail($data['email'])) {
            return ApiResponse::error('Email already exists', 'EMAIL_ALREADY_EXISTS', 409);
        }
        if (\App\Chat\User::getUserByUsername($data['username'])) {
            return ApiResponse::error('Username already exists', 'USERNAME_ALREADY_EXISTS', 409);
        }
        // Hash password
        $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        // Generate UUID
        $data['uuid'] = \Ramsey\Uuid\Uuid::uuid4()->toString();
        // Set default avatar if not provided
        if (empty($data['avatar'])) {
            $data['avatar'] = 'https://github.com/mythicalltd.png';
        }
        // Set default role if not provided
        if (empty($data['role_id'])) {
            $data['role_id'] = 1;
        }
        $userId = \App\Chat\User::createUser($data);
        if (!$userId) {
            return ApiResponse::error('Failed to create user', 'FAILED_TO_CREATE_USER', 500);
        }

        return ApiResponse::success(['user_id' => $userId], 'User created successfully', 201);
    }

    public function update(Request $request, string $uuid): Response
    {
        $user = \App\Chat\User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }
        if (isset($data['id'])) {
            unset($data['id']);
        }
        if (isset($data['uuid'])) {
            unset($data['uuid']);
        }
        // Validation rules (only for fields being updated)
        $lengthRules = [
            'username' => [3, 32],
            'first_name' => [1, 64],
            'last_name' => [1, 64],
            'email' => [3, 255],
            'password' => [8, 255],
        ];
        foreach ($data as $field => $value) {
            if (isset($lengthRules[$field])) {
                if (!is_string($value)) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE');
                }
                $len = strlen($value);
                [$min, $max] = $lengthRules[$field];
                if ($len < $min) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $min characters long", 'INVALID_DATA_LENGTH');
                }
                if ($len > $max) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $max characters long", 'INVALID_DATA_LENGTH');
                }
            }
        }
        // Validate email format if updating email
        if (isset($data['email'])) {
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return ApiResponse::error('Invalid email address', 'INVALID_EMAIL_ADDRESS');
            }
            $existingUser = \App\Chat\User::getUserByEmail($data['email']);
            if ($existingUser && $existingUser['uuid'] !== $user['uuid']) {
                return ApiResponse::error('Email already exists', 'EMAIL_ALREADY_EXISTS', 409);
            }
        }
        // Validate username uniqueness if updating username
        if (isset($data['username'])) {
            $existingUser = \App\Chat\User::getUserByUsername($data['username']);
            if ($existingUser && $existingUser['uuid'] !== $user['uuid']) {
                return ApiResponse::error('Username already exists', 'USERNAME_ALREADY_EXISTS', 409);
            }
        }
        // Hash password if updating password
        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        $updated = \App\Chat\User::updateUser($user['uuid'], $data);
        if (!$updated) {
            return ApiResponse::error('Failed to update user', 'FAILED_TO_UPDATE_USER', 500);
        }

        return ApiResponse::success([], 'User updated successfully', 200);
    }

    public function delete(Request $request, string $uuid): Response
    {
        $user = \App\Chat\User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }
        $deleted = \App\Chat\User::hardDeleteUser($user['id']);
        if (!$deleted) {
            return ApiResponse::error('Failed to delete user', 'FAILED_TO_DELETE_USER', 500);
        }

        return ApiResponse::success([], 'User deleted successfully', 200);
    }
}
