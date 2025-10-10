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

use App\App;
use App\Chat\User;
use App\Chat\Subuser;
use App\Chat\Activity;
use App\Chat\MailList;
use App\Chat\ApiClient;
use App\Chat\MailQueue;
use App\Helpers\UUIDUtils;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Mail\templates\Welcome;
use App\CloudFlare\CloudFlareRealIP;
use App\Mail\templates\AccountBanned;
use App\Mail\templates\AccountDeleted;
use App\Mail\templates\AccountUnBanned;
use App\Plugins\Events\Events\UserEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'User',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'User ID'),
        new OA\Property(property: 'uuid', type: 'string', description: 'User UUID'),
        new OA\Property(property: 'username', type: 'string', description: 'Username'),
        new OA\Property(property: 'first_name', type: 'string', description: 'First name'),
        new OA\Property(property: 'last_name', type: 'string', description: 'Last name'),
        new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Email address'),
        new OA\Property(property: 'avatar', type: 'string', format: 'uri', description: 'Avatar URL'),
        new OA\Property(property: 'last_seen', type: 'string', format: 'date-time', nullable: true, description: 'Last seen timestamp'),
        new OA\Property(property: 'banned', type: 'boolean', description: 'Banned status'),
        new OA\Property(property: 'two_fa_enabled', type: 'boolean', description: 'Two-factor authentication enabled'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
        new OA\Property(property: 'role', type: 'object', properties: [
            new OA\Property(property: 'name', type: 'string', description: 'Role name'),
            new OA\Property(property: 'display_name', type: 'string', description: 'Role display name'),
            new OA\Property(property: 'color', type: 'string', description: 'Role color'),
        ], description: 'User role information'),
        new OA\Property(property: 'activities', type: 'array', items: new OA\Items(type: 'object'), description: 'User activities'),
        new OA\Property(property: 'mails', type: 'array', items: new OA\Items(type: 'object'), description: 'User mail history'),
    ]
)]
#[OA\Schema(
    schema: 'UserPagination',
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
    schema: 'UserCreate',
    type: 'object',
    required: ['username', 'first_name', 'last_name', 'email', 'password'],
    properties: [
        new OA\Property(property: 'username', type: 'string', description: 'Username', minLength: 3, maxLength: 32),
        new OA\Property(property: 'first_name', type: 'string', description: 'First name', minLength: 1, maxLength: 64),
        new OA\Property(property: 'last_name', type: 'string', description: 'Last name', minLength: 1, maxLength: 64),
        new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Email address', minLength: 3, maxLength: 255),
        new OA\Property(property: 'password', type: 'string', description: 'Password', minLength: 8, maxLength: 255),
        new OA\Property(property: 'avatar', type: 'string', format: 'uri', nullable: true, description: 'Avatar URL'),
        new OA\Property(property: 'role_id', type: 'integer', nullable: true, description: 'Role ID (defaults to 1)'),
    ]
)]
#[OA\Schema(
    schema: 'UserUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'username', type: 'string', description: 'Username', minLength: 3, maxLength: 32),
        new OA\Property(property: 'first_name', type: 'string', description: 'First name', minLength: 1, maxLength: 64),
        new OA\Property(property: 'last_name', type: 'string', description: 'Last name', minLength: 1, maxLength: 64),
        new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Email address', minLength: 3, maxLength: 255),
        new OA\Property(property: 'password', type: 'string', description: 'Password', minLength: 8, maxLength: 255),
        new OA\Property(property: 'avatar', type: 'string', format: 'uri', nullable: true, description: 'Avatar URL'),
        new OA\Property(property: 'role_id', type: 'integer', nullable: true, description: 'Role ID'),
        new OA\Property(property: 'banned', type: 'boolean', nullable: true, description: 'Banned status'),
    ]
)]
#[OA\Schema(
    schema: 'UserActivity',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Activity name'),
        new OA\Property(property: 'context', type: 'string', description: 'Activity context'),
        new OA\Property(property: 'ip_address', type: 'string', description: 'IP address'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Activity timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'UserMail',
    type: 'object',
    properties: [
        new OA\Property(property: 'subject', type: 'string', description: 'Mail subject'),
        new OA\Property(property: 'template', type: 'string', description: 'Mail template'),
        new OA\Property(property: 'data', type: 'object', description: 'Mail data'),
        new OA\Property(property: 'status', type: 'string', description: 'Mail status'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Mail timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'UserServer',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'uuid', type: 'string', description: 'Server UUID'),
        new OA\Property(property: 'uuidShort', type: 'string', description: 'Short server UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'Server name'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Server description'),
        new OA\Property(property: 'status', type: 'string', description: 'Server status'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
    ]
)]
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
    #[OA\Get(
        path: '/api/admin/users',
        summary: 'Get all users',
        description: 'Retrieve a paginated list of all users with role information, search functionality, and comprehensive user data.',
        tags: ['Admin - Users'],
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
                description: 'Search term to filter users by username, email, or name',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Users retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'users', type: 'array', items: new OA\Items(ref: '#/components/schemas/User')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/UserPagination'),
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
        $users = User::searchUsers(
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

        $total = User::getCount($search);
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

    #[OA\Get(
        path: '/api/admin/users/{uuid}',
        summary: 'Get user by UUID',
        description: 'Retrieve a specific user by UUID with comprehensive information including role details, activity history, and mail history.',
        tags: ['Admin - Users'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'User UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'User retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'user', ref: '#/components/schemas/User'),
                        new OA\Property(property: 'roles', type: 'object', description: 'Available roles mapping'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid UUID format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
        ]
    )]
    public function show(Request $request, string $uuid): Response
    {
        $user = User::getUserByUuid($uuid);
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

    #[OA\Put(
        path: '/api/admin/users',
        summary: 'Create new user',
        description: 'Create a new user with comprehensive validation, password hashing, UUID generation, welcome email, and activity logging.',
        tags: ['Admin - Users'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/UserCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'User created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'user_id', type: 'integer', description: 'Created user ID'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid data types, invalid data length, or invalid email format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 409, description: 'Conflict - Email or username already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create user'),
        ]
    )]
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
        if (User::getUserByEmail($data['email'])) {
            return ApiResponse::error('Email already exists', 'EMAIL_ALREADY_EXISTS', 409);
        }
        if (User::getUserByUsername($data['username'])) {
            return ApiResponse::error('Username already exists', 'USERNAME_ALREADY_EXISTS', 409);
        }
        // Hash password
        $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        // Generate UUID
        $data['uuid'] = UUIDUtils::generateV4();
        $data['remember_token'] = User::generateAccountToken();
        // Set default avatar if not provided
        if (empty($data['avatar'])) {
            $data['avatar'] = 'https://cdn.mythical.systems/featherpanel/logo.png';
        }
        // Set default role if not provided
        if (empty($data['role_id'])) {
            $data['role_id'] = 1;
        }
        $userId = User::createUser($data);
        if (!$userId) {
            return ApiResponse::error('Failed to create user', 'FAILED_TO_CREATE_USER', 500);
        }

        Welcome::send([
            'email' => $data['email'],
            'subject' => 'Welcome to ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
            'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
            'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserEvent::onUserCreated(),
                [
                    'user' => $data,
                    'user_id' => $userId,
                    'created_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success(['user_id' => $userId], 'User created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/users/{uuid}',
        summary: 'Update user',
        description: 'Update an existing user with comprehensive validation, password hashing, email notifications for ban/unban, and activity logging.',
        tags: ['Admin - Users'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'User UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/UserUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'User updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - No data provided, invalid data types, invalid data length, or invalid email format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
            new OA\Response(response: 409, description: 'Conflict - Email or username already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update user'),
        ]
    )]
    public function update(Request $request, string $uuid): Response
    {
        $user = User::getUserByUuid($uuid);
        $config = App::getInstance(true)->getConfig();
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
            $existingUser = User::getUserByEmail($data['email']);
            if ($existingUser && $existingUser['uuid'] !== $user['uuid']) {
                return ApiResponse::error('Email already exists', 'EMAIL_ALREADY_EXISTS', 409);
            }
        }
        // Validate username uniqueness if updating username
        if (isset($data['username'])) {
            $existingUser = User::getUserByUsername($data['username']);
            if ($existingUser && $existingUser['uuid'] !== $user['uuid']) {
                return ApiResponse::error('Username already exists', 'USERNAME_ALREADY_EXISTS', 409);
            }
        }
        // Hash password if updating password
        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
            $data['remember_token'] = User::generateAccountToken();
        }
        $updated = User::updateUser($user['uuid'], $data);
        if (!$updated) {
            return ApiResponse::error('Failed to update user', 'FAILED_TO_UPDATE_USER', 500, [
                'error' => $updated,

            ]);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserEvent::onUserUpdated(),
                [
                    'user' => $user,
                    'updated_data' => $data,
                    'updated_by' => $request->get('user'),
                ]
            );
        }

        if (isset($data['banned'])) {
            if ($data['banned'] == 'true') {
                AccountBanned::send([
                    'email' => $user['email'],
                    'subject' => 'Your account has been suspended on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                    'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                    'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'username' => $user['username'],
                    'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                    'uuid' => $user['uuid'],
                    'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                    'suspension_time' => date('Y-m-d H:i:s'),
                ]);
            } else {
                AccountUnBanned::send([
                    'email' => $user['email'],
                    'subject' => 'Your account has been unsuspended on ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                    'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                    'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'username' => $user['username'],
                    'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                    'uuid' => $user['uuid'],
                    'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                    'unsuspension_time' => date('Y-m-d H:i:s'),
                ]);
            }
        }

        return ApiResponse::success([], 'User updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/users/{uuid}',
        summary: 'Delete user',
        description: 'Permanently delete a user with activity logging, event emission, and account deletion email notification.',
        tags: ['Admin - Users'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'User UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'User deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid UUID format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
            new OA\Response(response: 409, description: 'Conflict - User has active servers and cannot be deleted'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete user or send account deleted email'),
        ]
    )]
    public function delete(Request $request, string $uuid): Response
    {
        $config = App::getInstance(true)->getConfig();
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        // Check if user has any servers
        $servers = \App\Chat\Server::searchServers(
            page: 1,
            limit: 1,
            search: '',
            fields: ['id'],
            sortBy: 'id',
            sortOrder: 'ASC',
            ownerId: (int) $user['id']
        );

        if (!empty($servers)) {
            return ApiResponse::error('Cannot delete user with active servers. Please transfer or delete all servers first.', 'USER_HAS_SERVERS', 409);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserEvent::onUserDeleted(),
                [
                    'user' => $user,
                    'deleted_by' => $request->get('user'),
                ]
            );
        }

        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'delete_user',
            'context' => 'User deleted by admin',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        try {
            AccountDeleted::send([
                'email' => $user['email'],
                'subject' => 'Welcome to ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                'uuid' => $user['uuid'],
                'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
            ]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send account deleted email: ' . $e->getMessage());

            return ApiResponse::error('Failed to send account deleted email: ' . $e->getMessage(), 'FAILED_TO_SEND_ACCOUNT_DELETED_EMAIL', 500);
        }

        Activity::deleteUserData($user['uuid']);
        MailList::deleteAllMailListsByUserId($user['uuid']);
        ApiClient::deleteAllApiClientsByUserId($user['uuid']);
        Subuser::deleteAllSubusersByUserId((int) $user['id']);
        MailQueue::deleteAllMailQueueByUserId($user['uuid']);
        $deleted = User::hardDeleteUser($user['id']);
        if (!$deleted) {
            return ApiResponse::error('Failed to delete user', 'FAILED_TO_DELETE_USER', 500);
        }

        return ApiResponse::success([], 'User deleted successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/users/{uuid}/servers',
        summary: 'Get user owned servers',
        description: 'Retrieve all servers owned by a specific user with basic server information.',
        tags: ['Admin - Users'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'User UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Owned servers retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'servers', type: 'array', items: new OA\Items(ref: '#/components/schemas/UserServer')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid UUID format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
        ]
    )]
    public function ownedServers(Request $request, string $uuid): Response
    {
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        $servers = \App\Chat\Server::searchServers(
            page: 1,
            limit: 1000,
            search: '',
            fields: ['id', 'name', 'description', 'status', 'uuidShort', 'uuid', 'created_at'],
            sortBy: 'id',
            sortOrder: 'ASC',
            ownerId: (int) $user['id']
        );

        return ApiResponse::success(['servers' => $servers], 'Owned servers fetched', 200);
    }

    #[OA\Get(
        path: '/api/admin/users/serverRequest/{id}',
        summary: 'Get user by id',
        description: 'Retrieve a user by their ID',
        tags: ['Admin - Users'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', description: 'User ID', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    public function serverRequest(Request $request, int $id): Response
    {
        $user = User::getUserById($id);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        return ApiResponse::success(['user' => $user], 'User fetched successfully', 200);
    }
}
