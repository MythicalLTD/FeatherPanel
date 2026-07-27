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

use App\Chat\Activity;
use App\Chat\Notification;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use App\Services\Notifications\WarningService;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\NotificationsEvent;

#[OA\Schema(
    schema: 'Notification',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Notification ID'),
        new OA\Property(property: 'user_id', type: 'integer', nullable: true, description: 'Target user ID (null = global)'),
        new OA\Property(property: 'server_id', type: 'integer', nullable: true, description: 'Target server ID (null = account/global)'),
        new OA\Property(property: 'title', type: 'string', description: 'Notification title'),
        new OA\Property(property: 'message_markdown', type: 'string', description: 'Notification message in Markdown format'),
        new OA\Property(property: 'type', type: 'string', enum: ['info', 'warning', 'danger', 'success', 'error'], description: 'Notification type'),
        new OA\Property(property: 'is_dismissible', type: 'boolean', description: 'Whether the notification can be dismissed'),
        new OA\Property(property: 'is_sticky', type: 'boolean', description: 'Whether the notification stays until explicitly closed'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true, description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'NotificationPagination',
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
    schema: 'NotificationCreate',
    type: 'object',
    required: ['title', 'message_markdown', 'type'],
    properties: [
        new OA\Property(property: 'title', type: 'string', description: 'Notification title', minLength: 1, maxLength: 255),
        new OA\Property(property: 'message_markdown', type: 'string', description: 'Notification message in Markdown format', minLength: 1),
        new OA\Property(property: 'type', type: 'string', enum: ['info', 'warning', 'danger', 'success', 'error'], description: 'Notification type'),
        new OA\Property(property: 'user_id', type: 'integer', nullable: true, description: 'Target user ID (null = all users)'),
        new OA\Property(property: 'server_id', type: 'integer', nullable: true, description: 'Target server ID (optional; implies owner)'),
        new OA\Property(property: 'send_email', type: 'boolean', nullable: true, description: 'Also email the target user (requires user or server target)'),
        new OA\Property(property: 'is_dismissible', type: 'boolean', nullable: true, description: 'Whether the notification can be dismissed (default: true)'),
        new OA\Property(property: 'is_sticky', type: 'boolean', nullable: true, description: 'Whether the notification stays until explicitly closed (default: false)'),
    ]
)]
#[OA\Schema(
    schema: 'NotificationUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'title', type: 'string', description: 'Notification title', minLength: 1, maxLength: 255),
        new OA\Property(property: 'message_markdown', type: 'string', description: 'Notification message in Markdown format', minLength: 1),
        new OA\Property(property: 'type', type: 'string', enum: ['info', 'warning', 'danger', 'success', 'error'], description: 'Notification type'),
        new OA\Property(property: 'user_id', type: 'integer', nullable: true, description: 'Target user ID (null = all users)'),
        new OA\Property(property: 'server_id', type: 'integer', nullable: true, description: 'Target server ID'),
        new OA\Property(property: 'is_dismissible', type: 'boolean', description: 'Whether the notification can be dismissed'),
        new OA\Property(property: 'is_sticky', type: 'boolean', description: 'Whether the notification stays until explicitly closed'),
    ]
)]
class NotificationsController
{
    #[OA\Get(
        path: '/api/admin/notifications',
        summary: 'Get all notifications',
        description: 'Retrieve a paginated list of all notifications with optional search and filtering.',
        tags: ['Admin - Notifications'],
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
                description: 'Search term to filter notifications by title or message',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'type',
                in: 'query',
                description: 'Filter by notification type',
                required: false,
                schema: new OA\Schema(type: 'string', enum: ['info', 'warning', 'danger', 'success', 'error'])
            ),
            new OA\Parameter(
                name: 'user_id',
                in: 'query',
                description: 'Filter by target user ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'server_id',
                in: 'query',
                description: 'Filter by target server ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'global_only',
                in: 'query',
                description: 'When true, only return global (all-users) notifications',
                required: false,
                schema: new OA\Schema(type: 'boolean')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Notifications retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'notifications', type: 'array', items: new OA\Items(ref: '#/components/schemas/Notification')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/NotificationPagination'),
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
        $type = $request->query->get('type');
        $userIdFilter = $request->query->get('user_id');
        $serverIdFilter = $request->query->get('server_id');
        $globalOnlyRaw = $request->query->get('global_only');

        // Validate pagination
        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        // Validate type if provided
        if ($type !== null && $type !== '') {
            $validTypes = ['info', 'warning', 'danger', 'success', 'error'];
            if (!in_array($type, $validTypes, true)) {
                return ApiResponse::error('Invalid notification type', 'INVALID_TYPE', 400);
            }
        }

        $userId = null;
        if ($userIdFilter !== null && $userIdFilter !== '') {
            if (!is_numeric($userIdFilter) || (int) $userIdFilter <= 0) {
                return ApiResponse::error('Invalid user_id filter', 'INVALID_USER_ID', 400);
            }
            $userId = (int) $userIdFilter;
        }

        $serverId = null;
        if ($serverIdFilter !== null && $serverIdFilter !== '') {
            if (!is_numeric($serverIdFilter) || (int) $serverIdFilter <= 0) {
                return ApiResponse::error('Invalid server_id filter', 'INVALID_SERVER_ID', 400);
            }
            $serverId = (int) $serverIdFilter;
        }

        $globalOnly = null;
        if ($globalOnlyRaw !== null && $globalOnlyRaw !== '') {
            $globalOnly = filter_var($globalOnlyRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($globalOnly === null) {
                return ApiResponse::error('Invalid global_only filter', 'INVALID_GLOBAL_ONLY', 400);
            }
        }

        $notifications = Notification::searchNotifications($page, $limit, $search, $type, 'created_at', 'DESC', $userId, $serverId, $globalOnly);
        $total = Notification::getNotificationsCount($search, $type, $userId, $serverId, $globalOnly);

        // Calculate pagination metadata
        $totalPages = ceil($total / $limit);
        $from = $total > 0 ? (($page - 1) * $limit) + 1 : 0;
        $to = min($page * $limit, $total);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                NotificationsEvent::onNotificationsRetrieved(),
                [
                    'notifications' => $notifications,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => $total,
                    ],
                    'filters' => [
                        'search' => $search,
                        'type' => $type,
                    ],
                ]
            );
        }

        return ApiResponse::success([
            'notifications' => $notifications,
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
                'has_results' => count($notifications) > 0,
            ],
        ], 'Notifications fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/notifications/{id}',
        summary: 'Get notification by ID',
        description: 'Retrieve a specific notification by its ID with comprehensive information.',
        tags: ['Admin - Notifications'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Notification ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Notification retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'notification', ref: '#/components/schemas/Notification'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Notification not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        if ($id <= 0) {
            return ApiResponse::error('Invalid notification ID', 'INVALID_ID', 400);
        }

        $notification = Notification::getNotificationById($id);

        if (!$notification) {
            // Emit error event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    NotificationsEvent::onNotificationNotFound(),
                    [
                        'notification_id' => $id,
                        'error_message' => 'Notification not found',
                    ]
                );
            }

            return ApiResponse::error('Notification not found', 'NOTIFICATION_NOT_FOUND', 404);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                NotificationsEvent::onNotificationRetrieved(),
                [
                    'notification_id' => $id,
                    'notification_data' => $notification,
                ]
            );
        }

        return ApiResponse::success([
            'notification' => $notification,
        ], 'Notification fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/notifications',
        summary: 'Create new notification',
        description: 'Create a new notification with comprehensive validation.',
        tags: ['Admin - Notifications'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/NotificationCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Notification created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'notification_id', type: 'integer', description: 'Created notification ID'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Required fields validation
        $requiredFields = ['title', 'message_markdown', 'type'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Validate data types and length
        $validationRules = [
            'title' => ['string', 1, 255],
            'message_markdown' => ['string', 1, null],
        ];

        foreach ($validationRules as $field => [$type, $minLength, $maxLength]) {
            if (!is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
            }

            $length = strlen($data[$field]);
            if ($length < $minLength) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $minLength characters long", 'INVALID_DATA_LENGTH', 400);
            }
            if ($maxLength !== null && $length > $maxLength) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $maxLength characters long", 'INVALID_DATA_LENGTH', 400);
            }
        }

        // Validate type
        $validTypes = ['info', 'warning', 'danger', 'success', 'error'];
        if (!in_array($data['type'], $validTypes, true)) {
            return ApiResponse::error('Invalid notification type. Must be one of: ' . implode(', ', $validTypes), 'INVALID_TYPE', 400);
        }

        // Validate boolean fields
        if (isset($data['is_dismissible']) && !is_bool($data['is_dismissible'])) {
            return ApiResponse::error('is_dismissible must be a boolean', 'INVALID_DATA_TYPE', 400);
        }

        if (isset($data['is_sticky']) && !is_bool($data['is_sticky'])) {
            return ApiResponse::error('is_sticky must be a boolean', 'INVALID_DATA_TYPE', 400);
        }

        if (isset($data['send_email']) && !is_bool($data['send_email'])) {
            return ApiResponse::error('send_email must be a boolean', 'INVALID_DATA_TYPE', 400);
        }

        $userId = null;
        if (array_key_exists('user_id', $data) && $data['user_id'] !== null && $data['user_id'] !== '') {
            if (!is_numeric($data['user_id']) || (int) $data['user_id'] <= 0) {
                return ApiResponse::error('user_id must be a positive integer', 'INVALID_USER_ID', 400);
            }
            $userId = (int) $data['user_id'];
        }

        $serverId = null;
        if (array_key_exists('server_id', $data) && $data['server_id'] !== null && $data['server_id'] !== '') {
            if (!is_numeric($data['server_id']) || (int) $data['server_id'] <= 0) {
                return ApiResponse::error('server_id must be a positive integer', 'INVALID_SERVER_ID', 400);
            }
            $serverId = (int) $data['server_id'];
        }

        $currentUser = $request->attributes->get('user');
        $result = WarningService::send([
            'title' => $data['title'],
            'message_markdown' => $data['message_markdown'],
            'type' => $data['type'],
            'user_id' => $userId,
            'server_id' => $serverId,
            'is_dismissible' => $data['is_dismissible'] ?? true,
            'is_sticky' => $data['is_sticky'] ?? false,
            'send_email' => $data['send_email'] ?? false,
            'actor_uuid' => $currentUser['uuid'] ?? null,
        ]);

        if ($result === false) {
            return ApiResponse::error('Failed to create notification', 'CREATE_FAILED', 500);
        }

        $notificationId = $result['notification_id'];

        // Log activity
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'] ?? '',
            'name' => 'create_notification',
            'context' => 'Created notification: ' . $data['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $notification = Notification::getNotificationById($notificationId);
            $eventManager->emit(
                NotificationsEvent::onNotificationCreated(),
                [
                    'notification_id' => $notificationId,
                    'notification_data' => $notification,
                    'created_by' => $currentUser,
                    'emailed' => $result['emailed'],
                ]
            );
        }

        return ApiResponse::success([
            'notification_id' => $notificationId,
            'emailed' => $result['emailed'],
        ], 'Notification created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/notifications/{id}',
        summary: 'Update notification',
        description: 'Update an existing notification with comprehensive validation.',
        tags: ['Admin - Notifications'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Notification ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/NotificationUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Notification updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Notification not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        if ($id <= 0) {
            return ApiResponse::error('Invalid notification ID', 'INVALID_ID', 400);
        }

        $notification = Notification::getNotificationById($id);

        if (!$notification) {
            return ApiResponse::error('Notification not found', 'NOTIFICATION_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);

        if (empty($data)) {
            return ApiResponse::error('No data to update', 'NO_DATA_PROVIDED', 400);
        }

        // Validate data types and length if provided
        if (isset($data['title'])) {
            if (!is_string($data['title']) || trim($data['title']) === '') {
                return ApiResponse::error('Title must be a non-empty string', 'INVALID_DATA_TYPE', 400);
            }
            if (strlen($data['title']) > 255) {
                return ApiResponse::error('Title must be less than 255 characters long', 'INVALID_DATA_LENGTH', 400);
            }
        }

        if (isset($data['message_markdown'])) {
            if (!is_string($data['message_markdown']) || trim($data['message_markdown']) === '') {
                return ApiResponse::error('Message markdown must be a non-empty string', 'INVALID_DATA_TYPE', 400);
            }
        }

        // Validate type if provided
        if (isset($data['type'])) {
            $validTypes = ['info', 'warning', 'danger', 'success', 'error'];
            if (!in_array($data['type'], $validTypes, true)) {
                return ApiResponse::error('Invalid notification type. Must be one of: ' . implode(', ', $validTypes), 'INVALID_TYPE', 400);
            }
        }

        if (array_key_exists('user_id', $data)) {
            if ($data['user_id'] === null || $data['user_id'] === '') {
                $data['user_id'] = null;
            } elseif (!is_numeric($data['user_id']) || (int) $data['user_id'] <= 0) {
                return ApiResponse::error('user_id must be a positive integer or null', 'INVALID_USER_ID', 400);
            } else {
                $data['user_id'] = (int) $data['user_id'];
            }
        }

        if (array_key_exists('server_id', $data)) {
            if ($data['server_id'] === null || $data['server_id'] === '') {
                $data['server_id'] = null;
            } elseif (!is_numeric($data['server_id']) || (int) $data['server_id'] <= 0) {
                return ApiResponse::error('server_id must be a positive integer or null', 'INVALID_SERVER_ID', 400);
            } else {
                $data['server_id'] = (int) $data['server_id'];
            }
        }

        // send_email is create-only
        unset($data['send_email']);

        // Validate boolean fields
        if (isset($data['is_dismissible']) && !is_bool($data['is_dismissible'])) {
            return ApiResponse::error('is_dismissible must be a boolean', 'INVALID_DATA_TYPE', 400);
        }

        if (isset($data['is_sticky']) && !is_bool($data['is_sticky'])) {
            return ApiResponse::error('is_sticky must be a boolean', 'INVALID_DATA_TYPE', 400);
        }

        $oldNotification = $notification;
        $updated = Notification::updateNotification($id, $data);

        if (!$updated) {
            return ApiResponse::error('Failed to update notification', 'UPDATE_FAILED', 500);
        }

        // Log activity
        $currentUser = $request->attributes->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'] ?? '',
            'name' => 'update_notification',
            'context' => 'Updated notification: ' . ($data['title'] ?? $notification['title']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $updatedNotification = Notification::getNotificationById($id);
            $eventManager->emit(
                NotificationsEvent::onNotificationUpdated(),
                [
                    'notification_id' => $id,
                    'old_data' => $oldNotification,
                    'new_data' => $updatedNotification,
                    'updated_by' => $currentUser,
                ]
            );
        }

        return ApiResponse::success([], 'Notification updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/notifications/{id}',
        summary: 'Delete notification',
        description: 'Permanently delete a notification.',
        tags: ['Admin - Notifications'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Notification ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Notification deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Notification not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        if ($id <= 0) {
            return ApiResponse::error('Invalid notification ID', 'INVALID_ID', 400);
        }

        $notification = Notification::getNotificationById($id);

        if (!$notification) {
            return ApiResponse::error('Notification not found', 'NOTIFICATION_NOT_FOUND', 404);
        }

        $deleted = Notification::hardDeleteNotification($id);

        if (!$deleted) {
            return ApiResponse::error('Failed to delete notification', 'DELETE_FAILED', 500);
        }

        // Log activity
        $currentUser = $request->attributes->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'] ?? '',
            'name' => 'delete_notification',
            'context' => 'Deleted notification: ' . $notification['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                NotificationsEvent::onNotificationDeleted(),
                [
                    'notification_id' => $id,
                    'notification_data' => $notification,
                    'deleted_by' => $currentUser,
                ]
            );
        }

        return ApiResponse::success([], 'Notification deleted successfully', 200);
    }
}
