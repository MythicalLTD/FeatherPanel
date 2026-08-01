<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Node;
use App\Chat\User;
use App\Chat\Realm;
use App\Chat\Spell;
use App\Chat\Server;
use App\Chat\Activity;
use App\Chat\MailList;
use App\Chat\SsoToken;
use App\Chat\MailQueue;
use App\Chat\Allocation;
use App\Chat\VmInstance;
use App\Helpers\UUIDUtils;
use App\Helpers\TimeHelper;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Mail\templates\Welcome;
use App\CloudFlare\CloudFlareRealIP;
use App\Helpers\AbuseIPDBBanReporter;
use App\Helpers\EmailDomainValidator;
use App\Mail\templates\AccountBanned;
use App\Helpers\ModerationReasonHelper;
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
        new OA\Property(property: 'email_verified', type: 'boolean', description: 'Whether the user email is verified'),
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
    schema: 'AdminUserServer',
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
            new OA\Parameter(
                name: 'role',
                in: 'query',
                description: 'Filter users by role ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'banned',
                in: 'query',
                description: 'Filter users by banned status (true/false)',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'user_id',
                in: 'query',
                description: 'Filter users by numeric ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'uuid',
                in: 'query',
                description: 'Filter users by UUID',
                required: false,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
            new OA\Parameter(
                name: 'external_id',
                in: 'query',
                description: 'Filter users by external ID',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'ip',
                in: 'query',
                description: 'Filter users by first or last IP address (partial match)',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'email_verified',
                in: 'query',
                description: 'Filter users by email verification status (true/false)',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'sort_by',
                in: 'query',
                description: 'Field to sort users by (id, username, email, last_seen, created_at)',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'sort_order',
                in: 'query',
                description: 'Sort order (ASC or DESC)',
                required: false,
                schema: new OA\Schema(type: 'string', enum: ['ASC', 'DESC'])
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
        $app = App::getInstance(true);
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');
        $roleId = $request->query->getInt('role', 0) ?: null;
        $bannedParam = $request->query->get('banned');
        $userId = $request->query->getInt('user_id', 0) ?: null;
        $uuid = $request->query->get('uuid');
        $externalId = $request->query->get('external_id');
        $ip = trim((string) $request->query->get('ip', ''));
        $emailVerifiedParam = $request->query->get('email_verified');
        $sortBy = $request->query->get('sort_by', 'id');
        $sortOrder = strtoupper((string) $request->query->get('sort_order', 'ASC'));

        $banned = null;
        if ($bannedParam !== null && $bannedParam !== '') {
            if ($bannedParam === 'true' || $bannedParam === '1') {
                $banned = true;
            } elseif ($bannedParam === 'false' || $bannedParam === '0') {
                $banned = false;
            }
        }

        $emailVerified = null;
        if ($emailVerifiedParam !== null && $emailVerifiedParam !== '') {
            if ($emailVerifiedParam === 'true' || $emailVerifiedParam === '1') {
                $emailVerified = true;
            } elseif ($emailVerifiedParam === 'false' || $emailVerifiedParam === '0') {
                $emailVerified = false;
            }
        }

        $allowedSortFields = ['id', 'username', 'email', 'last_seen', 'created_at'];
        if (!in_array($sortBy, $allowedSortFields, true)) {
            $sortBy = 'id';
        }

        if (!in_array($sortOrder, ['ASC', 'DESC'], true)) {
            $sortOrder = 'ASC';
        }

        // Users table stores account creation time in first_seen, not created_at.
        $sortByColumn = $sortBy === 'created_at' ? 'first_seen' : $sortBy;

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

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
                'first_seen',
                'email',
                'mail_verify',
                'oidc_provider',
                'oidc_subject',
                'ldap_provider_uuid',
                'ldap_dn',
                'first_ip',
                'last_ip',
            ],
            $sortByColumn,
            $sortOrder,
            $roleId,
            $banned,
            $userId,
            $uuid ?: null,
            $externalId ?: null,
            $ip !== '' ? $ip : null,
            $emailVerified,
        );

        $roles = \App\Chat\Role::getAllRoles();
        $rolesMap = [];
        foreach ($roles as $role) {
            $rolesMap[$role['id']] = [
                'name' => $role['name'],
                'display_name' => $role['display_name'],
                'custom_badge' => $role['custom_badge'] ?? null,
                'badge_icon' => $role['badge_icon'] ?? null,
                'color' => $role['color'],
            ];
        }

        foreach ($users as &$user) {
            $userRoleId = $user['role_id'];
            if (isset($rolesMap[$userRoleId])) {
                $user['role']['name'] = $rolesMap[$userRoleId]['name'];
                $user['role']['display_name'] = $rolesMap[$userRoleId]['display_name'];
                $user['role']['custom_badge'] = $rolesMap[$userRoleId]['custom_badge'];
                $user['role']['badge_icon'] = $rolesMap[$userRoleId]['badge_icon'];
                $user['role']['color'] = $rolesMap[$userRoleId]['color'];
            } else {
                $user['role']['name'] = $userRoleId;
                $user['role']['display_name'] = 'User';
                $user['role']['custom_badge'] = null;
                $user['role']['badge_icon'] = null;
                $user['role']['color'] = '#666666';
            }
            $user['email_verified'] = !isset($user['mail_verify']) || trim((string) $user['mail_verify']) === '';
            $user['created_at'] = $user['first_seen'] ?? null;
            if ($app->isDemoMode()) {
                $user['first_ip'] = $app->getIPIntoFBIFormat();
                $user['last_ip'] = $app->getIPIntoFBIFormat();
            }
            unset($user['role_id'], $user['mail_verify']);
        }
        unset($user);

        $users = TimeHelper::normaliseRows($users, ['last_seen', 'first_seen']);

        $total = User::getCount(
            $search,
            $roleId,
            $banned,
            $userId,
            $uuid ?: null,
            $externalId ?: null,
            $ip !== '' ? $ip : null,
            $emailVerified,
        );
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
            'roles' => $rolesMap,
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
        $app = App::getInstance(true);
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
                'custom_badge' => $role['custom_badge'] ?? null,
                'badge_icon' => $role['badge_icon'] ?? null,
                'color' => $role['color'],
            ];
        }
        $roleId = $user['role_id'] ?? null;
        $user['role'] = [
            'name' => $rolesMap[$roleId]['name'] ?? $roleId,
            'display_name' => $rolesMap[$roleId]['display_name'] ?? 'User',
            'custom_badge' => $rolesMap[$roleId]['custom_badge'] ?? null,
            'badge_icon' => $rolesMap[$roleId]['badge_icon'] ?? null,
            'color' => $rolesMap[$roleId]['color'] ?? '#666666',
        ];

        $user['email_verified'] = !isset($user['mail_verify']) || trim((string) $user['mail_verify']) === '';
        unset($user['password'], $user['mail_verify']);

        $user['activities'] = array_map(function ($activity) use ($app) {
            unset($activity['user_uuid'], $activity['id'], $activity['updated_at']);

            if ($app->isDemoMode()) {
                $activity['ip_address'] = $app->getIPIntoFBIFormat();
            }

            return $activity;
        }, Activity::getActivitiesByUser($user['uuid']));

        $mailList = MailList::getByUserUuid($user['uuid']);
        $queueIds = array_column($mailList, 'queue_id');
        $mailQueues = MailQueue::getByIds($queueIds);
        $user['mails'] = [];
        foreach ($mailList as $mailListEntry) {
            $queueId = (int) ($mailListEntry['queue_id'] ?? 0);
            if (!isset($mailQueues[$queueId])) {
                continue;
            }
            $mail = $mailQueues[$queueId];
            $mail['id'] = (int) $mailListEntry['id'];
            unset($mail['user_uuid'], $mail['deleted'], $mail['locked'], $mail['updated_at']);
            $user['mails'][] = $mail;
        }
        if ($app->isDemoMode()) {
            $user['first_ip'] = $app->getIPIntoFBIFormat();
            $user['last_ip'] = $app->getIPIntoFBIFormat();
        }

        $user = ModerationReasonHelper::enrichUserBanMetadata($user);
        $user = TimeHelper::normaliseRow($user, ['last_seen', 'first_seen', 'banned_at']);

        return ApiResponse::success(['user' => $user, 'roles' => $rolesMap], 'User fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/users/external/{externalId}',
        summary: 'Get user by external ID',
        description: 'Retrieve a specific user by its external ID with comprehensive information including role details, activity history, and mail history.',
        tags: ['Admin - Users'],
        parameters: [
            new OA\Parameter(
                name: 'externalId',
                in: 'path',
                description: 'User external ID',
                required: true,
                schema: new OA\Schema(type: 'string')
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
            new OA\Response(response: 400, description: 'Bad request - Invalid external ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
        ]
    )]
    public function showByExternalId(Request $request, string $externalId): Response
    {
        $app = App::getInstance(true);
        if (empty($externalId)) {
            return ApiResponse::error('External ID is required', 'INVALID_EXTERNAL_ID', 400);
        }

        $user = User::getUserByExternalId($externalId);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        $roles = \App\Chat\Role::getAllRoles();
        $rolesMap = [];
        foreach ($roles as $role) {
            $rolesMap[$role['id']] = [
                'name' => $role['name'],
                'display_name' => $role['display_name'],
                'custom_badge' => $role['custom_badge'] ?? null,
                'badge_icon' => $role['badge_icon'] ?? null,
                'color' => $role['color'],
            ];
        }
        $roleId = $user['role_id'] ?? null;
        $user['role'] = [
            'name' => $rolesMap[$roleId]['name'] ?? $roleId,
            'display_name' => $rolesMap[$roleId]['display_name'] ?? 'User',
            'custom_badge' => $rolesMap[$roleId]['custom_badge'] ?? null,
            'badge_icon' => $rolesMap[$roleId]['badge_icon'] ?? null,
            'color' => $rolesMap[$roleId]['color'] ?? '#666666',
        ];

        $user['email_verified'] = !isset($user['mail_verify']) || trim((string) $user['mail_verify']) === '';
        unset($user['password'], $user['mail_verify']);

        $user['activities'] = array_map(function ($activity) use ($app) {
            unset($activity['user_uuid'], $activity['id'], $activity['updated_at']);

            if ($app->isDemoMode()) {
                $activity['ip_address'] = $app->getIPIntoFBIFormat();
            }

            return $activity;
        }, Activity::getActivitiesByUser($user['uuid']));

        $mailList = MailList::getByUserUuid($user['uuid']);
        $queueIds = array_column($mailList, 'queue_id');
        $mailQueues = MailQueue::getByIds($queueIds);
        $user['mails'] = [];
        foreach ($mailList as $mailListEntry) {
            $queueId = (int) ($mailListEntry['queue_id'] ?? 0);
            if (!isset($mailQueues[$queueId])) {
                continue;
            }
            $mail = $mailQueues[$queueId];
            $mail['id'] = (int) $mailListEntry['id'];
            unset($mail['user_uuid'], $mail['deleted'], $mail['locked'], $mail['updated_at']);
            $user['mails'][] = $mail;
        }

        if ($app->isDemoMode()) {
            $user['first_ip'] = $app->getIPIntoFBIFormat();
            $user['last_ip'] = $app->getIPIntoFBIFormat();
        }

        $user = ModerationReasonHelper::enrichUserBanMetadata($user);
        $user = TimeHelper::normaliseRow($user, ['last_seen', 'first_seen', 'banned_at']);

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
        $domainRejection = EmailDomainValidator::getRejection($config, $data['email']);
        if ($domainRejection !== null) {
            return ApiResponse::error($domainRejection['message'], $domainRejection['code'], 400);
        }
        // Check for existing email/username
        if (User::getUserByEmail($data['email'])) {
            return ApiResponse::error('Email already exists', 'EMAIL_ALREADY_EXISTS', 409);
        }
        if (User::getUserByUsername($data['username'])) {
            return ApiResponse::error('Username already exists', 'USERNAME_ALREADY_EXISTS', 409);
        }
        // Hash password
        $tempPassword = $data['password'];
        $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        // Generate UUID
        $data['uuid'] = UUIDUtils::generateV4();
        $config = App::getInstance(true)->getConfig();
        $data['remember_token'] = User::generateAccountToken();
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
            'password' => $tempPassword,
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
            'user_uuid' => $request->attributes->get('user')['uuid'],
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
                    'uuid' => $data['uuid'],
                    'created_by' => $request->attributes->get('user'),
                ]
            );
        }

        return ApiResponse::success([
            'user_id' => $userId,
            'uuid' => $data['uuid'],
        ], 'User created successfully', 201);
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
        $app = App::getInstance(true);
        $config = $app->getConfig();
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
        unset(
            $data['report_to_abuseipdb'],
            $data['abuseipdb_categories'],
            $data['abuseipdb_comment'],
            $data['reason_category'],
            $data['reason_details'],
            $data['reason']
        );

        if ($app->isDemoMode()) {
            if ($user['id'] === 1) {
                return ApiResponse::error('Unmanaged actions are not permitted in demo mode', 'UNMANAGED_ACTIONS_NOT_PERMITTED', 400);
            }

            if ($user['id'] === 2) {
                return ApiResponse::error('Unmanaged actions are not permitted in demo mode', 'UNMANAGED_ACTIONS_NOT_PERMITTED', 400);
            }
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
            if ($data['email'] !== $user['email']) {
                $domainRejection = EmailDomainValidator::getRejection($config, $data['email']);
                if ($domainRejection !== null) {
                    return ApiResponse::error($domainRejection['message'], $domainRejection['code'], 400);
                }
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
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
            $data['remember_token'] = User::generateAccountToken();
        }

        $staffUser = $request->attributes->get('user');
        $wasBanned = $user['banned'] === 'true';
        $becameBanned = false;
        $becameUnbanned = false;
        $banReasonForEmail = '';
        $banRequestBody = [];
        $abuseipdbReport = null;

        if (array_key_exists('banned', $data)) {
            $wantsBanned = $data['banned'] === 'true' || $data['banned'] === true;
            $banRequestBody = json_decode($request->getContent(), true) ?: [];
            unset(
                $data['reason_category'],
                $data['reason_details'],
                $data['reason'],
                $data['report_to_abuseipdb'],
                $data['abuseipdb_categories'],
                $data['abuseipdb_comment']
            );

            if ($wantsBanned && !$wasBanned) {
                $parsed = ModerationReasonHelper::parseRequestBody($banRequestBody);
                $reasonError = ModerationReasonHelper::validateReason($parsed['reason']);
                if ($reasonError !== null) {
                    return ApiResponse::error($reasonError, 'MODERATION_REASON_REQUIRED', 400);
                }
                $data = array_merge($data, ModerationReasonHelper::banAppliedFields($parsed['reason'], $staffUser));
                $banReasonForEmail = $parsed['reason'];
                $becameBanned = true;
            } elseif (!$wantsBanned && $wasBanned) {
                $data = array_merge($data, ModerationReasonHelper::banClearedFields());
                $becameUnbanned = true;
            } elseif ($wantsBanned && $wasBanned) {
                unset($data['banned']);
            }
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
                    'updated_by' => $request->attributes->get('user'),
                ]
            );
        }

        if ($becameBanned) {
            $abuseipdbReport = AbuseIPDBBanReporter::maybeReport($user, $banRequestBody, $banReasonForEmail);
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
                'suspension_reason' => $banReasonForEmail,
            ]);
        } elseif ($becameUnbanned) {
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

        $responseData = [];
        if ($abuseipdbReport !== null && ($abuseipdbReport['attempted'] ?? false)) {
            $responseData['abuseipdb'] = $abuseipdbReport;
        }

        return ApiResponse::success($responseData, 'User updated successfully', 200);
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
            new OA\Response(response: 409, description: 'Conflict - User has active servers or VDS instances and cannot be deleted'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete user or send account deleted email'),
        ]
    )]
    public function delete(Request $request, string $uuid): Response
    {

        $app = App::getInstance(true);
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        if ($app->isDemoMode()) {
            if ($user['id'] === 1) {
                return ApiResponse::error('Unmanaged actions are not permitted in demo mode', 'UNMANAGED_ACTIONS_NOT_PERMITTED', 400);
            }

            if ($user['id'] === 2) {
                return ApiResponse::error('Unmanaged actions are not permitted in demo mode', 'UNMANAGED_ACTIONS_NOT_PERMITTED', 400);
            }
        }

        // Check if user has any servers / VMs delegated to shared service below
        $result = \App\Services\User\UserDeletionService::hardDelete(
            $user,
            $request->attributes->get('user'),
            'User deleted by admin'
        );
        if (!$result['success']) {
            $code = $result['code'] ?? 'FAILED_TO_DELETE_USER';
            $status = in_array($code, ['USER_HAS_SERVERS', 'USER_HAS_VM_INSTANCES', 'USER_HAS_ACTIVE_SUBSCRIPTIONS'], true) ? 409 : 500;

            return ApiResponse::error($result['error'] ?? 'Failed to delete user', $code, $status);
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
                        new OA\Property(property: 'servers', type: 'array', items: new OA\Items(ref: '#/components/schemas/AdminUserServer')),
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

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 25);
        $search = $request->query->get('search', '');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 25;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $total = Server::getCount($search, (int) $user['id']);
        $servers = Server::searchServers(
            page: $page,
            limit: $limit,
            search: $search,
            fields: [],
            sortBy: 'id',
            sortOrder: 'DESC',
            ownerId: (int) $user['id'],
        );

        foreach ($servers as &$server) {
            $node = Node::getNodeById($server['node_id']);
            $server['node'] = $node ? [
                'id' => $node['id'],
                'name' => $node['name'] ?? null,
                'fqdn' => $node['fqdn'] ?? null,
                'maintenance_mode' => (bool) ($node['maintenance_mode'] ?? false),
            ] : null;

            $server['realm'] = Realm::getById($server['realms_id']);
            $server['realm'] = $server['realm'] ? [
                'id' => $server['realm']['id'] ?? null,
                'name' => $server['realm']['name'] ?? null,
            ] : null;

            $server['spell'] = Spell::getSpellById($server['spell_id']);
            $server['spell'] = $server['spell'] ? [
                'id' => $server['spell']['id'] ?? null,
                'name' => $server['spell']['name'] ?? null,
            ] : null;

            $allocation = Allocation::getAllocationById($server['allocation_id']);
            $server['allocation'] = $allocation ? [
                'id' => $allocation['id'],
                'ip' => $allocation['ip'] ?? null,
                'port' => $allocation['port'] ?? null,
                'ip_alias' => $allocation['ip_alias'] ?? null,
            ] : null;

            // Keep resource limits and status for admin view
            unset(
                $server['external_id'],
                $server['node_id'],
                $server['skip_scripts'],
                $server['allocation_id'],
                $server['realms_id'],
                $server['spell_id'],
                $server['startup'],
                $server['image'],
                $server['last_error'],
                $server['installed_at'],
            );
        }

        $totalPages = (int) ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'servers' => $servers,
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
                'has_results' => count($servers) > 0,
            ],
        ], 'Owned servers fetched', 200);
    }

    #[OA\Get(
        path: '/api/admin/users/{uuid}/vm-instances',
        summary: 'Get user owned VM instances',
        description: 'Retrieve VM instances owned by a specific user with pagination and search.',
        tags: ['Admin - Users'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'User UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 1)),
            new OA\Parameter(name: 'limit', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 25)),
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Owned VM instances retrieved successfully'),
            new OA\Response(response: 400, description: 'Bad request - Invalid UUID format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
        ]
    )]
    public function ownedVmInstances(Request $request, string $uuid): Response
    {
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 25);
        $search = $request->query->get('search', '');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 25;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $searchTerm = is_string($search) ? trim($search) : '';
        $total = VmInstance::countByUserUuid($uuid, $searchTerm);
        $instances = VmInstance::getByUserUuid($uuid, $page, $limit, $searchTerm);

        $totalPages = max(1, (int) ceil($total / $limit));
        $from = $total > 0 ? (($page - 1) * $limit + 1) : 0;
        $to = $total > 0 ? min($from + $limit - 1, $total) : 0;

        return ApiResponse::success([
            'instances' => $instances,
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
                'query' => $searchTerm,
                'has_results' => count($instances) > 0,
            ],
        ], 'Owned VM instances fetched', 200);
    }

    #[OA\Get(
        path: '/api/admin/users/{uuid}/potential-alts',
        summary: 'Find potential alt accounts by IP',
        description: 'Find other users who may be alternate accounts by comparing IP addresses from activity logs and first/last IP fields.',
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
                description: 'Potential alt accounts retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'potential_alts', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'source_ips', type: 'array', items: new OA\Items(type: 'string')),
                        new OA\Property(property: 'total', type: 'integer'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
        ]
    )]
    public function potentialAlts(Request $request, string $uuid): Response
    {
        $app = App::getInstance(true);
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        $result = User::findPotentialAltsByUuid($uuid);
        $roles = \App\Chat\Role::getAllRoles();
        $rolesMap = [];
        foreach ($roles as $role) {
            $rolesMap[$role['id']] = [
                'name' => $role['name'],
                'display_name' => $role['display_name'],
                'custom_badge' => $role['custom_badge'] ?? null,
                'badge_icon' => $role['badge_icon'] ?? null,
                'color' => $role['color'],
            ];
        }

        $sourceIps = $result['source_ips'];
        $sourceDevices = $result['source_devices'];
        if ($app->isDemoMode()) {
            $sourceIps = array_map(static fn () => $app->getIPIntoFBIFormat(), $sourceIps);
            $sourceDevices = array_map(static fn ($hash) => substr(hash('sha256', (string) $hash), 0, 16), $sourceDevices);
        }

        $potentialAlts = [];
        foreach ($result['potential_alts'] as $alt) {
            $roleId = $alt['role_id'] ?? null;
            $alt['role'] = [
                'name' => $rolesMap[$roleId]['name'] ?? $roleId,
                'display_name' => $rolesMap[$roleId]['display_name'] ?? 'User',
                'custom_badge' => $rolesMap[$roleId]['custom_badge'] ?? null,
                'badge_icon' => $rolesMap[$roleId]['badge_icon'] ?? null,
                'color' => $rolesMap[$roleId]['color'] ?? '#666666',
            ];
            unset($alt['role_id']);

            if ($app->isDemoMode()) {
                $alt['first_ip'] = $app->getIPIntoFBIFormat();
                $alt['last_ip'] = $app->getIPIntoFBIFormat();
                $alt['shared_ips'] = array_map(static fn () => $app->getIPIntoFBIFormat(), $alt['shared_ips']);
                $alt['shared_devices'] = array_map(static fn () => substr(hash('sha256', uniqid('', true)), 0, 16), $alt['shared_devices']);
            } else {
                $alt['shared_devices'] = array_map(static fn ($hash) => substr((string) $hash, 0, 12), $alt['shared_devices']);
            }

            $alt = TimeHelper::normaliseRow($alt, ['last_seen']);
            $potentialAlts[] = $alt;
        }

        return ApiResponse::success([
            'potential_alts' => $potentialAlts,
            'source_ips' => $sourceIps,
            'source_devices' => $sourceDevices,
            'total' => count($potentialAlts),
        ], 'Potential alt accounts fetched successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/users/{uuid}/devices',
        summary: 'Clear device fingerprints for a user',
        description: 'Remove all browser/device sync records associated with a user. Useful when clearing false positives or after support review.',
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
            new OA\Response(response: 200, description: 'Device records cleared successfully'),
            new OA\Response(response: 404, description: 'User not found'),
        ]
    )]
    public function clearUserDevices(Request $request, string $uuid): Response
    {
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        if (!\App\Chat\UserDevice::deleteUserData($uuid)) {
            return ApiResponse::error('Failed to clear device records', 'DEVICE_CLEAR_FAILED', 500);
        }

        $admin = $request->attributes->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? $uuid,
            'name' => 'admin_clear_user_devices',
            'context' => 'Cleared device fingerprints for user ' . $user['username'] . ' (' . $uuid . ')',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Device records cleared for user', 200);
    }

    #[OA\Delete(
        path: '/api/admin/devices',
        summary: 'Clear all device fingerprints globally',
        description: 'Remove every browser/device sync record in the panel. Use after policy changes or to reset alt detection data.',
        tags: ['Admin - Users'],
        responses: [
            new OA\Response(response: 200, description: 'All device records cleared successfully'),
        ]
    )]
    public function clearAllDevices(Request $request): Response
    {
        if (!\App\Chat\UserDevice::deleteAll()) {
            return ApiResponse::error('Failed to clear device records', 'DEVICE_CLEAR_FAILED', 500);
        }

        $admin = $request->attributes->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? '',
            'name' => 'admin_clear_all_devices',
            'context' => 'Cleared all device fingerprint records globally',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'All device records cleared', 200);
    }

    #[OA\Get(
        path: '/api/admin/users/serverRequest/{id}',
        summary: 'Get server request by id (INTERNAL USE ONLY) - DO NOT USE THIS ENDPOINT IN YOUR CODE!',
        description: 'Retrieve a server request by its ID (INTERNAL USE ONLY) - DO NOT USE THIS ENDPOINT IN YOUR CODE!',
        tags: ['Admin - Users'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', description: 'User ID', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'User retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'user', ref: '#/components/schemas/User'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
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

    #[OA\Post(
        path: '/api/admin/users/{uuid}/sso-token',
        summary: 'Create SSO login token for user',
        description: 'Generate a short-lived single sign-on (SSO) token that can be used to log the user in via the public login endpoint.',
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
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'expires_in',
                        type: 'integer',
                        minimum: 1,
                        maximum: 1440,
                        description: 'Token lifetime in minutes (overrides the admin default when provided)'
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'SSO token created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'token', type: 'string', description: 'SSO login token'),
                        new OA\Property(property: 'expires_in', type: 'integer', description: 'Token expiration time in minutes'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid expires_in value'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
        ]
    )]
    public function createSsoToken(Request $request, string $uuid): Response
    {
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        $config = App::getInstance(true)->getConfig();
        $defaultExpiresInMinutes = (int) $config->getSetting(
            ConfigInterface::APP_SSO_TOKEN_LIFETIME_MINUTES,
            '5'
        );
        if ($defaultExpiresInMinutes < 1 || $defaultExpiresInMinutes > 1440) {
            $defaultExpiresInMinutes = 5;
        }

        $expiresInMinutes = $defaultExpiresInMinutes;
        $body = json_decode($request->getContent(), true);
        if (is_array($body) && array_key_exists('expires_in', $body)) {
            if (!is_int($body['expires_in']) && !(is_string($body['expires_in']) && ctype_digit($body['expires_in']))) {
                return ApiResponse::error(
                    'expires_in must be an integer between 1 and 1440',
                    'INVALID_EXPIRES_IN',
                    400
                );
            }

            $expiresInMinutes = (int) $body['expires_in'];
            if ($expiresInMinutes < 1 || $expiresInMinutes > 1440) {
                return ApiResponse::error(
                    'expires_in must be between 1 and 1440 minutes',
                    'INVALID_EXPIRES_IN',
                    400
                );
            }
        }

        $token = SsoToken::createTokenForUser($user['uuid'], $expiresInMinutes);
        if ($token === null) {
            return ApiResponse::error('Failed to create SSO token', 'FAILED_TO_CREATE_SSO_TOKEN', 500);
        }

        $logger = App::getInstance(true)->getLogger();
        $logger->info('Created SSO login token for user ' . $user['uuid']);

        return ApiResponse::success([
            'token' => $token,
            'expires_in' => $expiresInMinutes,
        ], 'SSO token created successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/users/{uuid}/send-email',
        summary: 'Send email to user',
        description: 'Queue a direct email to a specific user with subject and HTML body content.',
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
            content: new OA\JsonContent(
                required: ['subject', 'body'],
                properties: [
                    new OA\Property(property: 'subject', type: 'string', minLength: 1, maxLength: 255),
                    new OA\Property(property: 'body', type: 'string', minLength: 1, maxLength: 65535, description: 'HTML content is supported'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Email queued successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to queue email'),
        ]
    )]
    public function sendEmail(Request $request, string $uuid): Response
    {
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        $subject = isset($data['subject']) && is_string($data['subject']) ? trim($data['subject']) : '';
        $body = isset($data['body']) && is_string($data['body']) ? trim($data['body']) : '';

        if ($subject === '' || $body === '') {
            return ApiResponse::error('Subject and body are required', 'MISSING_REQUIRED_FIELDS', 400);
        }
        if (strlen($subject) > 255) {
            return ApiResponse::error('Subject must be less than 255 characters long', 'INVALID_DATA_LENGTH', 400);
        }
        if (strlen($body) > 65535) {
            return ApiResponse::error('Body must be less than 65535 characters long', 'INVALID_DATA_LENGTH', 400);
        }

        $queueData = [
            'user_uuid' => $user['uuid'],
            'subject' => $subject,
            'body' => $body,
            'status' => 'pending',
            'locked' => 'false',
            'created_at' => date('Y-m-d H:i:s'),
            'deleted' => 'false',
        ];

        $queueId = MailQueue::create($queueData);
        if ($queueId === true) {
            return ApiResponse::error('SMTP disabled skipping enqueue/send', 'SMTP_DISABLED', 400);
        }
        if ($queueId === false) {
            return ApiResponse::error('Failed to queue email', 'FAILED_TO_QUEUE_EMAIL', 500);
        }

        $listData = [
            'queue_id' => $queueId,
            'user_uuid' => $user['uuid'],
            'created_at' => date('Y-m-d H:i:s'),
            'deleted' => 'false',
        ];

        if (!MailList::create($listData)) {
            return ApiResponse::error('Failed to create mail list entry', 'FAILED_TO_CREATE_MAIL_LIST', 500);
        }

        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => 'send_user_email',
            'context' => 'Sent email to user ' . ($user['username'] ?? $user['uuid']) . '. Subject: ' . $subject,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'queue_id' => $queueId,
        ], 'Email queued successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/users/{uuid}/mails/{id}/resend',
        summary: 'Resend a failed user email',
        description: 'Re-queue a failed system email for delivery to the specified user.',
        tags: ['Admin - Users'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'User UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Mail list entry ID',
                required: true,
                schema: new OA\Schema(type: 'integer', minimum: 1)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Email queued for resend'),
            new OA\Response(response: 400, description: 'Bad request - Mail cannot be resent or SMTP disabled'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User or mail not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to resend mail'),
        ]
    )]
    public function resendMail(Request $request, string $uuid, int $mailId): Response
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid UUID format', 'INVALID_UUID', 400);
        }

        if ($mailId <= 0) {
            return ApiResponse::error('Invalid mail ID', 'INVALID_MAIL_ID', 400);
        }

        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        $mailListEntry = MailList::getById($mailId);
        if (!$mailListEntry || ($mailListEntry['user_uuid'] ?? '') !== $user['uuid']) {
            return ApiResponse::error('Mail not found', 'MAIL_NOT_FOUND', 404);
        }

        $queueId = (int) ($mailListEntry['queue_id'] ?? 0);
        $queueEntry = MailQueue::getById($queueId);
        if (!$queueEntry) {
            return ApiResponse::error('Mail not found', 'MAIL_NOT_FOUND', 404);
        }

        if (($queueEntry['status'] ?? '') !== 'failed') {
            return ApiResponse::error('Only failed emails can be resent', 'MAIL_NOT_RESENDABLE', 400);
        }

        $app = App::getInstance(true);
        if ($app->getConfig()->getSetting(ConfigInterface::SMTP_ENABLED, 'false') !== 'true') {
            return ApiResponse::error('SMTP is not enabled', 'SMTP_DISABLED', 400);
        }

        if (!MailQueue::retry($queueId)) {
            return ApiResponse::error('Failed to queue email for resend', 'FAILED_TO_RESEND_MAIL', 500);
        }

        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => 'resend_user_email',
            'context' => 'Resent failed email to user ' . ($user['username'] ?? $user['uuid']) . '. Subject: ' . ($queueEntry['subject'] ?? ''),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Email queued for resend', 200);
    }

    #[OA\Post(
        path: '/api/admin/users/{uuid}/verify-email',
        summary: 'Force verify user email',
        description: 'Mark a user email address as verified by clearing their pending email verification token.',
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
            new OA\Response(response: 200, description: 'User email verified successfully'),
            new OA\Response(response: 400, description: 'Bad request - User is already verified or demo mode restriction'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to verify email'),
        ]
    )]
    public function forceVerifyEmail(Request $request, string $uuid): Response
    {
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        $app = App::getInstance(true);
        if ($app->isDemoMode() && in_array((int) $user['id'], [1, 2], true)) {
            return ApiResponse::error('Unmanaged actions are not permitted in demo mode', 'UNMANAGED_ACTIONS_NOT_PERMITTED', 400);
        }

        if (!isset($user['mail_verify']) || trim((string) $user['mail_verify']) === '') {
            return ApiResponse::error('User email is already verified', 'EMAIL_ALREADY_VERIFIED', 400);
        }

        $updated = User::updateUser($user['uuid'], ['mail_verify' => null]);
        if (!$updated) {
            return ApiResponse::error('Failed to verify user email', 'FAILED_TO_VERIFY_EMAIL', 500);
        }

        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => 'force_verify_user_email',
            'context' => 'Force verified email for user ' . ($user['username'] ?? $user['uuid']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserEvent::onUserUpdated(),
                [
                    'user' => $user,
                    'updated_data' => ['mail_verify' => null],
                    'updated_by' => $request->attributes->get('user'),
                ]
            );
        }

        $app->getLogger()->info('User ' . $user['uuid'] . ' email force verified by ' . ($request->attributes->get('user')['uuid'] ?? 'unknown'));

        return ApiResponse::success([], 'User email verified successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/users/{uuid}/ban',
        summary: 'Ban a user',
        description: 'Ban a user account. The user will be immediately blocked from all authenticated endpoints and receive a suspension email notification.',
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
            new OA\Response(response: 200, description: 'User banned successfully'),
            new OA\Response(response: 400, description: 'Bad request - User is already banned or demo mode restriction'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to ban user'),
        ]
    )]
    public function ban(Request $request, string $uuid): Response
    {
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        if ($user['banned'] === 'true') {
            return ApiResponse::error('User is already banned', 'USER_ALREADY_BANNED', 400);
        }

        $app = App::getInstance(true);
        if ($app->isDemoMode()) {
            if ($user['id'] === 1 || $user['id'] === 2) {
                return ApiResponse::error('Unmanaged actions are not permitted in demo mode', 'UNMANAGED_ACTIONS_NOT_PERMITTED', 400);
            }
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            $body = [];
        }
        $parsed = ModerationReasonHelper::parseRequestBody($body);
        $reasonError = ModerationReasonHelper::validateReason($parsed['reason']);
        if ($reasonError !== null) {
            return ApiResponse::error($reasonError, 'MODERATION_REASON_REQUIRED', 400);
        }

        $staffUser = $request->attributes->get('user');
        $updated = User::updateUser($user['uuid'], ModerationReasonHelper::banAppliedFields($parsed['reason'], $staffUser));
        if (!$updated) {
            return ApiResponse::error('Failed to ban user', 'FAILED_TO_BAN_USER', 500);
        }

        $abuseipdbReport = AbuseIPDBBanReporter::maybeReport($user, $body, $parsed['reason']);

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserEvent::onUserUpdated(),
                [
                    'user' => $user,
                    'updated_data' => array_merge(ModerationReasonHelper::banAppliedFields($parsed['reason'], $staffUser), ['ban_reason' => $parsed['reason']]),
                    'updated_by' => $staffUser,
                ]
            );
        }

        $config = $app->getConfig();
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
            'suspension_reason' => $parsed['reason'],
        ]);

        $app->getLogger()->info('User ' . $user['uuid'] . ' banned by ' . ($request->attributes->get('user')['uuid'] ?? 'unknown'));

        $responseData = [];
        if ($abuseipdbReport['attempted'] ?? false) {
            $responseData['abuseipdb'] = $abuseipdbReport;
        }

        return ApiResponse::success($responseData, 'User banned successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/users/{uuid}/unban',
        summary: 'Unban a user',
        description: 'Unban a user account. The user will regain access to all authenticated endpoints and receive an unsuspension email notification.',
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
            new OA\Response(response: 200, description: 'User unbanned successfully'),
            new OA\Response(response: 400, description: 'Bad request - User is not banned or demo mode restriction'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'User not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to unban user'),
        ]
    )]
    public function unban(Request $request, string $uuid): Response
    {
        $user = User::getUserByUuid($uuid);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        if ($user['banned'] !== 'true') {
            return ApiResponse::error('User is not banned', 'USER_NOT_BANNED', 400);
        }

        $app = App::getInstance(true);
        if ($app->isDemoMode()) {
            if ($user['id'] === 1 || $user['id'] === 2) {
                return ApiResponse::error('Unmanaged actions are not permitted in demo mode', 'UNMANAGED_ACTIONS_NOT_PERMITTED', 400);
            }
        }

        $updated = User::updateUser($user['uuid'], ModerationReasonHelper::banClearedFields());
        if (!$updated) {
            return ApiResponse::error('Failed to unban user', 'FAILED_TO_UNBAN_USER', 500);
        }

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserEvent::onUserUpdated(),
                [
                    'user' => $user,
                    'updated_data' => ModerationReasonHelper::banClearedFields(),
                    'updated_by' => $request->attributes->get('user'),
                ]
            );
        }

        $config = $app->getConfig();
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

        $app->getLogger()->info('User ' . $user['uuid'] . ' unbanned by ' . ($request->attributes->get('user')['uuid'] ?? 'unknown'));

        return ApiResponse::success([], 'User unbanned successfully', 200);
    }
}
