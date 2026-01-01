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

namespace App\Controllers\Admin;

use App\Chat\User;
use App\Chat\Ticket;
use App\Chat\Activity;
use App\Chat\TicketMessage;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\TicketEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'TicketMessage',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Message ID'),
        new OA\Property(property: 'ticket_id', type: 'integer', description: 'Ticket ID'),
        new OA\Property(property: 'user_uuid', type: 'string', format: 'uuid', nullable: true, description: 'User UUID who sent the message'),
        new OA\Property(property: 'message', type: 'string', description: 'Message content'),
        new OA\Property(property: 'is_internal', type: 'boolean', description: 'Whether this is an internal note (staff only)'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true, description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'TicketMessageCreate',
    type: 'object',
    required: ['message'],
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Message content', minLength: 1),
        new OA\Property(property: 'is_internal', type: 'boolean', nullable: true, description: 'Whether this is an internal note (staff only)', default: false),
    ]
)]
#[OA\Schema(
    schema: 'TicketMessageUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Message content', minLength: 1),
        new OA\Property(property: 'is_internal', type: 'boolean', nullable: true, description: 'Whether this is an internal note (staff only)'),
    ]
)]
class TicketMessagesController
{
    #[OA\Get(
        path: '/api/admin/tickets/{uuid}/messages',
        summary: 'Get all messages for a ticket',
        description: 'Retrieve all messages for a specific ticket by UUID.',
        tags: ['Admin - Ticket Messages'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Ticket UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Messages retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'messages', type: 'array', items: new OA\Items(ref: '#/components/schemas/TicketMessage')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid UUID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Ticket not found'),
        ]
    )]
    public function index(Request $request, string $uuid): Response
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        $messages = TicketMessage::getByTicketId($ticket['id']);

        // Enrich messages with user info
        foreach ($messages as &$message) {
            if ($message['user_uuid']) {
                $user = User::getUserByUuid($message['user_uuid']);
                $message['user'] = $user ? [
                    'uuid' => $user['uuid'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'avatar' => $user['avatar'],
                ] : null;
            } else {
                $message['user'] = null;
            }
        }

        return ApiResponse::success([
            'messages' => $messages,
        ], 'Messages fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/tickets/{uuid}/messages/{id}',
        summary: 'Get ticket message by ID',
        description: 'Retrieve a specific message from a ticket.',
        tags: ['Admin - Ticket Messages'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Ticket UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Message ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Message retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', ref: '#/components/schemas/TicketMessage'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid UUID or ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Ticket or message not found'),
        ]
    )]
    public function show(Request $request, string $uuid, int $id): Response
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        $message = TicketMessage::getById($id);
        if (!$message) {
            return ApiResponse::error('Message not found', 'MESSAGE_NOT_FOUND', 404);
        }

        // Verify message belongs to ticket
        if ($message['ticket_id'] !== $ticket['id']) {
            return ApiResponse::error('Message does not belong to this ticket', 'MESSAGE_MISMATCH', 400);
        }

        // Enrich with user info
        if ($message['user_uuid']) {
            $user = User::getUserByUuid($message['user_uuid']);
            $message['user'] = $user ? [
                'uuid' => $user['uuid'],
                'username' => $user['username'],
                'email' => $user['email'],
                'avatar' => $user['avatar'],
            ] : null;
        } else {
            $message['user'] = null;
        }

        return ApiResponse::success(['message' => $message], 'Message fetched successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/tickets/{uuid}/messages',
        summary: 'Create new message for ticket',
        description: 'Add a new message/reply to a ticket. Support staff can add internal notes.',
        tags: ['Admin - Ticket Messages'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Ticket UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/TicketMessageCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Message created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message_id', type: 'integer', description: 'Created message ID'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Ticket not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function create(Request $request, string $uuid): Response
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!$data) {
            return ApiResponse::error('Invalid JSON data', 'INVALID_JSON', 400);
        }

        if (!isset($data['message']) || trim($data['message']) === '') {
            return ApiResponse::error('Message is required', 'MISSING_MESSAGE', 400);
        }

        $currentUser = $request->get('user');

        $messageData = [
            'ticket_id' => $ticket['id'],
            'user_uuid' => $currentUser['uuid'],
            'message' => trim($data['message']),
            'is_internal' => isset($data['is_internal']) && $data['is_internal'] ? 1 : 0,
        ];

        $messageId = TicketMessage::create($messageData);

        if (!$messageId) {
            return ApiResponse::error('Failed to create message', 'CREATE_FAILED', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'],
            'name' => 'create_ticket_message',
            'context' => 'Created message for ticket: ' . $ticket['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Get created message for event
        $createdMessage = TicketMessage::getById($messageId);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null && $createdMessage) {
            $eventManager->emit(
                TicketEvent::onTicketMessageCreated(),
                [
                    'ticket' => $ticket,
                    'message' => $createdMessage,
                    'message_id' => $messageId,
                    'user_uuid' => $currentUser['uuid'],
                ]
            );
        }

        return ApiResponse::success(['message_id' => $messageId], 'Message created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/tickets/{uuid}/messages/{id}',
        summary: 'Update ticket message',
        description: 'Update an existing message in a ticket.',
        tags: ['Admin - Ticket Messages'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Ticket UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Message ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/TicketMessageUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Message updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Ticket or message not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function update(Request $request, string $uuid, int $id): Response
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        $message = TicketMessage::getById($id);
        if (!$message) {
            return ApiResponse::error('Message not found', 'MESSAGE_NOT_FOUND', 404);
        }

        // Verify message belongs to ticket
        if ($message['ticket_id'] !== $ticket['id']) {
            return ApiResponse::error('Message does not belong to this ticket', 'MESSAGE_MISMATCH', 400);
        }

        $data = json_decode($request->getContent(), true);

        if (!$data) {
            return ApiResponse::error('Invalid JSON data', 'INVALID_JSON', 400);
        }

        if (empty($data)) {
            return ApiResponse::error('No data to update', 'NO_DATA', 400);
        }

        $updated = TicketMessage::update($id, $data);

        if (!$updated) {
            return ApiResponse::error('Failed to update message', 'UPDATE_FAILED', 500);
        }

        // Log activity
        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'],
            'name' => 'update_ticket_message',
            'context' => 'Updated message for ticket: ' . $ticket['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Get updated message for event
        $updatedMessage = TicketMessage::getById($id);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null && $updatedMessage) {
            $eventManager->emit(
                TicketEvent::onTicketMessageUpdated(),
                [
                    'ticket' => $ticket,
                    'message' => $updatedMessage,
                    'updated_data' => $data,
                    'message_id' => $id,
                    'user_uuid' => $currentUser['uuid'],
                ]
            );
        }

        return ApiResponse::success([], 'Message updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/tickets/{uuid}/messages/{id}',
        summary: 'Delete ticket message',
        description: 'Permanently delete a message from a ticket.',
        tags: ['Admin - Ticket Messages'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Ticket UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Message ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Message deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid UUID or ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Ticket or message not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function delete(Request $request, string $uuid, int $id): Response
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        $message = TicketMessage::getById($id);
        if (!$message) {
            return ApiResponse::error('Message not found', 'MESSAGE_NOT_FOUND', 404);
        }

        // Verify message belongs to ticket
        if ($message['ticket_id'] !== $ticket['id']) {
            return ApiResponse::error('Message does not belong to this ticket', 'MESSAGE_MISMATCH', 400);
        }

        $deleted = TicketMessage::delete($id);

        if (!$deleted) {
            return ApiResponse::error('Failed to delete message', 'DELETE_FAILED', 500);
        }

        // Log activity
        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'],
            'name' => 'delete_ticket_message',
            'context' => 'Deleted message from ticket: ' . $ticket['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                TicketEvent::onTicketMessageDeleted(),
                [
                    'ticket' => $ticket,
                    'message_id' => $id,
                    'user_uuid' => $currentUser['uuid'],
                ]
            );
        }

        return ApiResponse::success([], 'Message deleted successfully', 200);
    }
}
