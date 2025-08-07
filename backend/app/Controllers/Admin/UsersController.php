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

use App\App;
use App\Chat\Activity;
use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Helpers\UUIDUtils;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Mail\templates\Welcome;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/* ---------------------------
 * Author: Cassian Gherman Date: 2025-07-25
 *
 * Changes:
 * - Added support so we can get the activities of a user
 * - Added support so we can get the mails the user got!
 *
 * ---------------------------*/
class UsersController
{
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
        $users = \App\Chat\User::searchUsers(
            $page,
            $limit,
            $search,
            false,
            [
                'id',
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

        $total = \App\Chat\User::getCount($search);
        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'users' => $users,
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
                'has_results' => count($users) > 0,
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
        $user['role'] = [
            'name' => $rolesMap[$roleId]['name'] ?? $roleId,
            'display_name' => $rolesMap[$roleId]['display_name'] ?? 'User',
            'color' => $rolesMap[$roleId]['color'] ?? '#666666',
        ];

        $user['activities'] = array_map(function ($activity) {
            unset($activity['user_uuid'], $activity['id'], $activity['updated_at']);

            return $activity;
        }, Activity::getActivitiesByUser($user['uuid']));

        $mailList = MailList::getByUserUuid($user['uuid']);
        $queueIds = array_column($mailList, 'queue_id');
        $mailQueues = MailQueue::getByIds($queueIds);
        $user['mails'] = [];
        foreach ($queueIds as $queueId) {
            if (isset($mailQueues[$queueId])) {
                $mail = $mailQueues[$queueId];
                unset($mail['id'], $mail['user_uuid'], $mail['deleted'], $mail['locked'], $mail['updated_at']);
                $user['mails'][] = $mail;
            }
        }

        return ApiResponse::success(['user' => $user, 'roles' => $rolesMap], 'User fetched successfully', 200);
    }

    public function create(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();
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
        $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        // Generate UUID
        $data['uuid'] = UUIDUtils::generateV4();
        $data['remember_token'] = bin2hex(random_bytes(16));
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

        Welcome::send([
            'email' => $data['email'],
            'subject' => 'Welcome to ' . $config->getSetting(ConfigInterface::APP_NAME, 'MythicalPanel'),
            'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'MythicalPanel'),
            'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'mythicalpanel.mythical.systems'),
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'username' => $data['username'],
            'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
            'uuid' => $data['uuid'],
            'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
        ]);

        Activity::createActivity([
            'user_uuid' => $data['uuid'],
            'name' => 'register',
            'context' => 'User registered by admin',
            'ip_address' => '0.0.0.0',
        ]);

        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'create_user',
            'context' => 'Created a new user ' . $data['username'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

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
            return ApiResponse::error('Failed to update user', 'FAILED_TO_UPDATE_USER', 500, [
                'error' => $updated,

            ]);
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
