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

use App\App;
use App\Chat\User;
use App\Chat\Server;
use App\Chat\Ticket;
use App\Chat\Activity;
use App\Chat\TicketStatus;
use App\Chat\TicketMessage;
use App\Chat\TicketCategory;
use App\Chat\TicketPriority;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\TicketAttachment;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\TicketEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'Ticket',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Ticket ID'),
        new OA\Property(property: 'uuid', type: 'string', format: 'uuid', description: 'Ticket UUID'),
        new OA\Property(property: 'user_uuid', type: 'string', format: 'uuid', description: 'User UUID who created the ticket'),
        new OA\Property(property: 'server_id', type: 'integer', nullable: true, description: 'Server ID if ticket is related to a server'),
        new OA\Property(property: 'category_id', type: 'integer', description: 'Category ID'),
        new OA\Property(property: 'priority_id', type: 'integer', description: 'Priority ID'),
        new OA\Property(property: 'status_id', type: 'integer', description: 'Status ID'),
        new OA\Property(property: 'title', type: 'string', description: 'Ticket title'),
        new OA\Property(property: 'description', type: 'string', description: 'Ticket description'),
        new OA\Property(property: 'closed_at', type: 'string', format: 'date-time', nullable: true, description: 'Ticket closed timestamp'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true, description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'TicketPagination',
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
    schema: 'TicketCreate',
    type: 'object',
    required: ['user_uuid', 'category_id', 'priority_id', 'status_id', 'title', 'description'],
    properties: [
        new OA\Property(property: 'user_uuid', type: 'string', format: 'uuid', description: 'User UUID who is creating the ticket'),
        new OA\Property(property: 'server_id', type: 'integer', nullable: true, description: 'Server ID if ticket is related to a server'),
        new OA\Property(property: 'category_id', type: 'integer', description: 'Category ID'),
        new OA\Property(property: 'priority_id', type: 'integer', description: 'Priority ID'),
        new OA\Property(property: 'status_id', type: 'integer', description: 'Status ID'),
        new OA\Property(property: 'title', type: 'string', description: 'Ticket title', minLength: 1, maxLength: 255),
        new OA\Property(property: 'description', type: 'string', description: 'Ticket description', minLength: 1),
    ]
)]
#[OA\Schema(
    schema: 'TicketUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'server_id', type: 'integer', nullable: true, description: 'Server ID if ticket is related to a server'),
        new OA\Property(property: 'category_id', type: 'integer', description: 'Category ID'),
        new OA\Property(property: 'priority_id', type: 'integer', description: 'Priority ID'),
        new OA\Property(property: 'status_id', type: 'integer', description: 'Status ID'),
        new OA\Property(property: 'title', type: 'string', description: 'Ticket title', minLength: 1, maxLength: 255),
        new OA\Property(property: 'description', type: 'string', description: 'Ticket description', minLength: 1),
        new OA\Property(property: 'closed_at', type: 'string', format: 'date-time', nullable: true, description: 'Ticket closed timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'TicketReply',
    type: 'object',
    required: ['message'],
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Reply message', minLength: 1),
        new OA\Property(property: 'is_internal', type: 'boolean', nullable: true, description: 'Whether this is an internal note (staff only)', default: false),
    ]
)]
class TicketsController
{
    #[OA\Get(
        path: '/api/admin/tickets',
        summary: 'Get all tickets',
        description: 'Retrieve a paginated list of all tickets with optional filters and search functionality.',
        tags: ['Admin - Tickets'],
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
                description: 'Search term to filter tickets by title or description',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'user_uuid',
                in: 'query',
                description: 'Filter by user UUID',
                required: false,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
            new OA\Parameter(
                name: 'server_id',
                in: 'query',
                description: 'Filter by server ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'category_id',
                in: 'query',
                description: 'Filter by category ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'status_id',
                in: 'query',
                description: 'Filter by status ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Tickets retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'tickets', type: 'array', items: new OA\Items(ref: '#/components/schemas/Ticket')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/TicketPagination'),
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
        $userUuid = $request->query->get('user_uuid', null);
        $serverId = $request->query->get('server_id', null);
        $categoryId = $request->query->get('category_id', null);
        $statusId = $request->query->get('status_id', null);

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        // Validate UUID format if provided
        if ($userUuid !== null && !preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return ApiResponse::error('Invalid user UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        // Validate numeric IDs
        if ($serverId !== null && (!is_numeric($serverId) || $serverId <= 0)) {
            return ApiResponse::error('Invalid server ID', 'INVALID_SERVER_ID', 400);
        }
        if ($categoryId !== null && (!is_numeric($categoryId) || $categoryId <= 0)) {
            return ApiResponse::error('Invalid category ID', 'INVALID_CATEGORY_ID', 400);
        }
        if ($statusId !== null && (!is_numeric($statusId) || $statusId <= 0)) {
            return ApiResponse::error('Invalid status ID', 'INVALID_STATUS_ID', 400);
        }

        $offset = ($page - 1) * $limit;
        $tickets = Ticket::getAll(
            $search ?: null,
            $limit,
            $offset,
            $userUuid,
            $serverId ? (int) $serverId : null,
            $categoryId ? (int) $categoryId : null,
            $statusId ? (int) $statusId : null
        );

        $total = Ticket::getCount(
            $search ?: null,
            $userUuid,
            $serverId ? (int) $serverId : null,
            $categoryId ? (int) $categoryId : null,
            $statusId ? (int) $statusId : null
        );

        $totalPages = ceil($total / $limit);
        $from = $total > 0 ? $offset + 1 : 0;
        $to = min($offset + $limit, $total);

        // Enrich tickets with related data
        // Retrieve all categories/priorities/statuses without pagination for complete mapping
        $categories = TicketCategory::getAll(null, 100, 0);
        $priorities = TicketPriority::getAll(null, 100, 0);
        $statuses = TicketStatus::getAll(null, 100, 0);

        $categoriesMap = [];
        foreach ($categories as $cat) {
            $categoriesMap[$cat['id']] = $cat;
        }

        $prioritiesMap = [];
        foreach ($priorities as $pri) {
            $prioritiesMap[$pri['id']] = $pri;
        }

        $statusesMap = [];
        foreach ($statuses as $stat) {
            $statusesMap[$stat['id']] = $stat;
        }

        foreach ($tickets as &$ticket) {
            $ticket['category'] = $categoriesMap[$ticket['category_id']] ?? null;
            $ticket['priority'] = $prioritiesMap[$ticket['priority_id']] ?? null;
            $ticket['status'] = $statusesMap[$ticket['status_id']] ?? null;

            // Get user info
            $user = User::getUserByUuid($ticket['user_uuid']);
            $ticket['user'] = $user ? [
                'uuid' => $user['uuid'],
                'username' => $user['username'],
                'email' => $user['email'],
                'avatar' => $user['avatar'],
            ] : null;

            // Get server info if applicable
            if ($ticket['server_id']) {
                $server = Server::getServerById($ticket['server_id']);
                $ticket['server'] = $server ? [
                    'id' => $server['id'],
                    'uuid' => $server['uuid'],
                    'name' => $server['name'],
                ] : null;
            } else {
                $ticket['server'] = null;
            }
        }

        return ApiResponse::success([
            'tickets' => $tickets,
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
                'has_results' => count($tickets) > 0,
            ],
        ], 'Tickets fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/tickets/{uuid}',
        summary: 'Get ticket by UUID',
        description: 'Retrieve a specific ticket by its UUID with all messages and attachments.',
        tags: ['Admin - Tickets'],
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
                description: 'Ticket retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ticket', ref: '#/components/schemas/Ticket'),
                        new OA\Property(property: 'messages', type: 'array', items: new OA\Items(type: 'object'), description: 'Ticket messages'),
                        new OA\Property(property: 'attachments', type: 'array', items: new OA\Items(type: 'object'), description: 'Ticket attachments'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid UUID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Ticket not found'),
        ]
    )]
    public function show(Request $request, string $uuid): Response
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        // Get related data
        $category = TicketCategory::getById($ticket['category_id']);
        $priority = TicketPriority::getById($ticket['priority_id']);
        $status = TicketStatus::getById($ticket['status_id']);
        $user = User::getUserByUuid($ticket['user_uuid']);

        $ticket['category'] = $category;
        $ticket['priority'] = $priority;
        $ticket['status'] = $status;
        $ticket['user'] = $user ? [
            'uuid' => $user['uuid'],
            'username' => $user['username'],
            'email' => $user['email'],
            'avatar' => $user['avatar'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
        ] : null;

        if ($ticket['server_id']) {
            $server = Server::getServerById($ticket['server_id']);
            $ticket['server'] = $server ? [
                'id' => $server['id'],
                'uuid' => $server['uuid'],
                'name' => $server['name'],
            ] : null;
        } else {
            $ticket['server'] = null;
        }

        // Get messages
        $messages = TicketMessage::getByTicketId($ticket['id']);
        $roles = \App\Chat\Role::getAllRoles();
        $rolesMap = [];
        foreach ($roles as $role) {
            $rolesMap[$role['id']] = [
                'name' => $role['name'],
                'display_name' => $role['display_name'],
                'color' => $role['color'],
            ];
        }

        foreach ($messages as &$message) {
            if ($message['user_uuid']) {
                $messageUser = User::getUserByUuid($message['user_uuid']);
                if ($messageUser) {
                    $roleId = $messageUser['role_id'] ?? null;
                    $role = $rolesMap[$roleId] ?? null;
                    $message['user'] = [
                        'uuid' => $messageUser['uuid'],
                        'username' => $messageUser['username'],
                        'email' => $messageUser['email'],
                        'avatar' => $messageUser['avatar'],
                        'first_name' => $messageUser['first_name'] ?? null,
                        'last_name' => $messageUser['last_name'] ?? null,
                    ];
                    if ($role) {
                        $message['user']['role'] = $role;
                    }
                } else {
                    $message['user'] = null;
                }
            } else {
                $message['user'] = null;
            }

            // Get attachments for this message
            $messageAttachments = TicketAttachment::getAll($ticket['id'], (int) $message['id']);
            $baseUrl = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems');
            foreach ($messageAttachments as &$attachment) {
                $attachment['url'] = rtrim($baseUrl, '/') . $attachment['file_path'];
            }
            $message['attachments'] = $messageAttachments;
        }

        // Get attachments
        $attachments = TicketAttachment::getAll($ticket['id']);

        return ApiResponse::success([
            'ticket' => $ticket,
            'messages' => $messages,
            'attachments' => $attachments,
        ], 'Ticket fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/tickets',
        summary: 'Create new ticket',
        description: 'Create a new ticket. Admins can create tickets on behalf of users.',
        tags: ['Admin - Tickets'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/TicketCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Ticket created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ticket_id', type: 'integer', description: 'Created ticket ID'),
                        new OA\Property(property: 'ticket_uuid', type: 'string', format: 'uuid', description: 'Created ticket UUID'),
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

        if (!$data) {
            return ApiResponse::error('Invalid JSON data', 'INVALID_JSON', 400);
        }

        $requiredFields = ['user_uuid', 'category_id', 'priority_id', 'status_id', 'title', 'description'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Validate UUID format
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['user_uuid'])) {
            return ApiResponse::error('Invalid user UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        // Validate user exists
        $user = User::getUserByUuid($data['user_uuid']);
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        // Validate foreign keys
        if (!TicketCategory::getById($data['category_id'])) {
            return ApiResponse::error('Invalid category ID', 'INVALID_CATEGORY_ID', 400);
        }

        if (!TicketPriority::getById($data['priority_id'])) {
            return ApiResponse::error('Invalid priority ID', 'INVALID_PRIORITY_ID', 400);
        }

        if (!TicketStatus::getById($data['status_id'])) {
            return ApiResponse::error('Invalid status ID', 'INVALID_STATUS_ID', 400);
        }

        // Validate server if provided
        if (isset($data['server_id']) && $data['server_id'] !== null) {
            if (!is_numeric($data['server_id']) || $data['server_id'] <= 0) {
                return ApiResponse::error('Invalid server ID', 'INVALID_SERVER_ID', 400);
            }
            if (!Server::getServerById($data['server_id'])) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }
        }

        // Generate UUID for ticket
        $data['uuid'] = Ticket::generateUuid();

        $ticketId = Ticket::create($data);

        if (!$ticketId) {
            return ApiResponse::error('Failed to create ticket', 'CREATE_FAILED', 500);
        }

        $ticket = Ticket::getById($ticketId);

        // Log activity
        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'],
            'name' => 'create_ticket',
            'context' => 'Created ticket: ' . $data['title'] . ' for user ' . $user['username'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                TicketEvent::onTicketCreated(),
                [
                    'ticket' => $ticket,
                    'ticket_id' => $ticketId,
                    'user_uuid' => $data['user_uuid'],
                ]
            );
        }

        return ApiResponse::success([
            'ticket_id' => $ticketId,
            'ticket_uuid' => $ticket['uuid'],
        ], 'Ticket created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/tickets/{uuid}',
        summary: 'Update ticket',
        description: 'Update an existing ticket (status, priority, category, etc.).',
        tags: ['Admin - Tickets'],
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
            content: new OA\JsonContent(ref: '#/components/schemas/TicketUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Ticket updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
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
    public function update(Request $request, string $uuid): Response
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

        if (empty($data)) {
            return ApiResponse::error('No data to update', 'NO_DATA', 400);
        }

        // Validate foreign keys if provided
        if (isset($data['category_id']) && !TicketCategory::getById($data['category_id'])) {
            return ApiResponse::error('Invalid category ID', 'INVALID_CATEGORY_ID', 400);
        }

        if (isset($data['priority_id']) && !TicketPriority::getById($data['priority_id'])) {
            return ApiResponse::error('Invalid priority ID', 'INVALID_PRIORITY_ID', 400);
        }

        if (isset($data['status_id']) && !TicketStatus::getById($data['status_id'])) {
            return ApiResponse::error('Invalid status ID', 'INVALID_STATUS_ID', 400);
        }

        if (isset($data['server_id']) && $data['server_id'] !== null) {
            if (!is_numeric($data['server_id']) || $data['server_id'] <= 0) {
                return ApiResponse::error('Invalid server ID', 'INVALID_SERVER_ID', 400);
            }
            if (!Server::getServerById($data['server_id'])) {
                return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
            }
        }

        $oldStatus = TicketStatus::getById($ticket['status_id']);
        $oldStatusName = $oldStatus ? strtolower($oldStatus['name']) : null;

        // Auto-manage closed_at based on status changes
        if (isset($data['status_id'])) {
            $newStatus = TicketStatus::getById($data['status_id']);
            if ($newStatus) {
                $statusName = strtolower($newStatus['name']);
                if ($statusName === 'closed' && !$ticket['closed_at']) {
                    // Set closed_at when closing
                    $data['closed_at'] = date('Y-m-d H:i:s');
                } elseif ($statusName === 'open' && $ticket['closed_at']) {
                    // Clear closed_at when reopening
                    $data['closed_at'] = null;
                }
            }
        }

        $updated = Ticket::updateByUuid($uuid, $data);

        if (!$updated) {
            return ApiResponse::error('Failed to update ticket', 'UPDATE_FAILED', 500);
        }

        // Get updated ticket
        $updatedTicket = Ticket::getById($ticket['id']);
        $newStatus = TicketStatus::getById($updatedTicket['status_id']);
        $newStatusName = $newStatus ? strtolower($newStatus['name']) : null;

        // Log activity
        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'],
            'name' => 'update_ticket',
            'context' => 'Updated ticket: ' . $ticket['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit events
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                TicketEvent::onTicketUpdated(),
                [
                    'ticket' => $updatedTicket,
                    'updated_data' => $data,
                    'user_uuid' => $currentUser['uuid'],
                ]
            );

            // Emit status change event if status changed
            if ($oldStatusName !== $newStatusName) {
                $eventManager->emit(
                    TicketEvent::onTicketStatusChanged(),
                    [
                        'ticket' => $updatedTicket,
                        'old_status' => $oldStatusName,
                        'new_status' => $newStatusName,
                        'user_uuid' => $currentUser['uuid'],
                    ]
                );

                // Emit close/reopen events
                if ($newStatusName === 'closed') {
                    $eventManager->emit(
                        TicketEvent::onTicketClosed(),
                        [
                            'ticket' => $updatedTicket,
                            'user_uuid' => $currentUser['uuid'],
                        ]
                    );
                } elseif ($oldStatusName === 'closed' && $newStatusName === 'open') {
                    $eventManager->emit(
                        TicketEvent::onTicketReopened(),
                        [
                            'ticket' => $updatedTicket,
                            'user_uuid' => $currentUser['uuid'],
                        ]
                    );
                }
            }
        }

        return ApiResponse::success([], 'Ticket updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/tickets/{uuid}',
        summary: 'Delete ticket',
        description: 'Permanently delete a ticket. This will also delete all messages and attachments.',
        tags: ['Admin - Tickets'],
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
                description: 'Ticket deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid UUID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Ticket not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function delete(Request $request, string $uuid): Response
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        $deleted = Ticket::delete($ticket['id']);

        if (!$deleted) {
            return ApiResponse::error('Failed to delete ticket', 'DELETE_FAILED', 500);
        }

        // Log activity
        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'],
            'name' => 'delete_ticket',
            'context' => 'Deleted ticket: ' . $ticket['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                TicketEvent::onTicketDeleted(),
                [
                    'ticket' => $ticket,
                    'user_uuid' => $currentUser['uuid'],
                ]
            );
        }

        return ApiResponse::success([], 'Ticket deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/tickets/{uuid}/reply',
        summary: 'Reply to ticket',
        description: 'Add a reply/message to a ticket. Support staff can add internal notes.',
        tags: ['Admin - Tickets'],
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
            content: new OA\JsonContent(ref: '#/components/schemas/TicketReply')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Reply added successfully',
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
    public function reply(Request $request, string $uuid): Response
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

        // Get message content
        $messageContent = trim($data['message']);

        // Always add signature if user has one and it's not an internal note
        if (!isset($data['is_internal']) || !$data['is_internal']) {
            $userData = User::getUserByUuid($currentUser['uuid']);
            if ($userData && !empty($userData['ticket_signature'])) {
                $messageContent .= "\n\n---\n" . $userData['ticket_signature'];
            }
        }

        // Create message
        $messageData = [
            'ticket_id' => $ticket['id'],
            'user_uuid' => $currentUser['uuid'],
            'message' => $messageContent,
            'is_internal' => isset($data['is_internal']) && $data['is_internal'] ? 1 : 0,
        ];

        $messageId = TicketMessage::create($messageData);

        if (!$messageId) {
            return ApiResponse::error('Failed to create reply', 'CREATE_FAILED', 500);
        }

        $message = TicketMessage::getById($messageId);

        // Log activity
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'],
            'name' => 'ticket_reply',
            'context' => 'Replied to ticket: ' . $ticket['title'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                TicketEvent::onTicketMessageCreated(),
                [
                    'ticket' => $ticket,
                    'message' => $message,
                    'message_id' => $messageId,
                    'user_uuid' => $currentUser['uuid'],
                ]
            );
        }

        return ApiResponse::success([
            'message_id' => $messageId,
        ], 'Reply added successfully', 201);
    }
}
