<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

namespace App\Controllers\User;

use App\Chat\User;
use App\Chat\Notification;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\NotificationsEvent;

#[OA\Schema(
    schema: 'UserNotification',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Notification ID'),
        new OA\Property(property: 'title', type: 'string', description: 'Notification title'),
        new OA\Property(property: 'message_markdown', type: 'string', description: 'Notification message in Markdown format'),
        new OA\Property(property: 'type', type: 'string', enum: ['info', 'warning', 'danger', 'success', 'error'], description: 'Notification type'),
        new OA\Property(property: 'is_dismissible', type: 'boolean', description: 'Whether the notification can be dismissed'),
        new OA\Property(property: 'is_sticky', type: 'boolean', description: 'Whether the notification stays until explicitly closed'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true, description: 'Last update timestamp'),
    ]
)]
class NotificationController
{
    #[OA\Get(
        path: '/api/user/notifications',
        summary: 'Get user notifications',
        description: 'Retrieve all active global notifications for the authenticated user.',
        tags: ['User - Notifications'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Notifications retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'notifications', type: 'array', items: new OA\Items(ref: '#/components/schemas/UserNotification')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function index(Request $request): Response
    {
        $currentUser = $request->get('user');

        if (!$currentUser || !isset($currentUser['id'])) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $userId = (int) $currentUser['id'];

        // Get user object to verify user exists
        $user = User::getUserById($userId);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        // Get global notifications
        $notifications = Notification::getNotificationsForUser($userId, false, 100);

        return ApiResponse::success([
            'notifications' => $notifications,
        ], 'Notifications fetched successfully', 200);
    }

    #[OA\Post(
        path: '/api/user/notifications/{id}/dismiss',
        summary: 'Dismiss notification',
        description: 'Dismiss a specific notification for the authenticated user.',
        tags: ['User - Notifications'],
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
                description: 'Notification dismissed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Cannot dismiss this notification'),
            new OA\Response(response: 404, description: 'Notification not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function dismiss(Request $request, int $id): Response
    {
        if ($id <= 0) {
            return ApiResponse::error('Invalid notification ID', 'INVALID_ID', 400);
        }

        $currentUser = $request->get('user');

        if (!$currentUser || !isset($currentUser['id'])) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $userId = (int) $currentUser['id'];

        // Get notification to verify it exists and is global
        $notification = Notification::getNotificationById($id);

        if (!$notification) {
            return ApiResponse::error('Notification not found', 'NOTIFICATION_NOT_FOUND', 404);
        }

        // Check if notification can be dismissed
        if (!$notification['is_dismissible']) {
            return ApiResponse::error('Notification cannot be dismissed', 'NOT_DISMISSIBLE', 403);
        }

        $dismissed = Notification::dismissNotification($id, $userId);

        if (!$dismissed) {
            return ApiResponse::error('Failed to dismiss notification', 'DISMISS_FAILED', 500);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                NotificationsEvent::onNotificationDismissed(),
                [
                    'notification_id' => $id,
                    'user_id' => $userId,
                    'user' => $currentUser,
                ]
            );
        }

        return ApiResponse::success([], 'Notification dismissed successfully', 200);
    }
}
