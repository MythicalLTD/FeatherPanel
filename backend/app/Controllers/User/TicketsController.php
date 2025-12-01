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

namespace App\Controllers\User;

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
use App\Middleware\AuthMiddleware;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\TicketEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class TicketsController
{
    #[OA\Get(
        path: '/api/user/tickets',
        summary: 'Get user tickets',
        description: 'Retrieve all tickets created by the authenticated user with pagination and optional filtering.',
        tags: ['User - Tickets'],
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
                description: 'Search term to filter tickets',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'status_id',
                in: 'query',
                description: 'Filter by status ID',
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
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Tickets retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'tickets', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'pagination', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function index(Request $request): Response
    {
        if (!$this->isTicketSystemEnabled()) {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        $user = AuthMiddleware::getCurrentUser($request);
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');
        $statusId = $request->query->get('status_id');
        $categoryId = $request->query->get('category_id');

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
        $searchQuery = $search && trim($search) !== '' ? trim($search) : null;

        // Get tickets for this user
        $tickets = Ticket::getAll($searchQuery, $limit, $offset, $user['uuid'], null, $categoryId, $statusId);
        $total = Ticket::getCount($searchQuery, $user['uuid'], null, $categoryId, $statusId);

        // Enrich tickets with related data
        foreach ($tickets as &$ticket) {
            $ticket = $this->enrichTicketData($ticket);
        }

        $totalPages = ceil($total / $limit);
        $from = $total > 0 ? $offset + 1 : 0;
        $to = min($offset + $limit, $total);

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
        ], 'Tickets retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/tickets/{uuid}',
        summary: 'Get ticket details',
        description: 'Retrieve detailed information about a specific ticket including messages and attachments.',
        tags: ['User - Tickets'],
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
            new OA\Response(response: 200, description: 'Ticket retrieved successfully'),
            new OA\Response(response: 404, description: 'Ticket not found'),
            new OA\Response(response: 403, description: 'Access denied - ticket belongs to another user'),
        ]
    )]
    public function show(Request $request, string $uuid): Response
    {
        if (!$this->isTicketSystemEnabled()) {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        $user = AuthMiddleware::getCurrentUser($request);
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        // Verify ticket belongs to user
        if ($ticket['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Enrich ticket data
        $ticket = $this->enrichTicketData($ticket);

        // Get messages for this ticket
        $messages = TicketMessage::getByTicketId((int) $ticket['id'], 100, 0);
        foreach ($messages as &$message) {
            $message = $this->enrichMessageData($message);
        }

        // Get attachments for this ticket
        $attachments = TicketAttachment::getAll((int) $ticket['id'], null, 100, 0);

        return ApiResponse::success([
            'ticket' => $ticket,
            'messages' => $messages,
            'attachments' => $attachments,
        ], 'Ticket retrieved successfully', 200);
    }

    #[OA\Put(
        path: '/api/user/tickets',
        summary: 'Create ticket',
        description: 'Create a new support ticket with optional server link and attachments.',
        tags: ['User - Tickets'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'title', type: 'string', description: 'Ticket title'),
                    new OA\Property(property: 'description', type: 'string', description: 'Ticket description'),
                    new OA\Property(property: 'category_id', type: 'integer', description: 'Category ID'),
                    new OA\Property(property: 'priority_id', type: 'integer', description: 'Priority ID'),
                    new OA\Property(property: 'server_id', type: 'integer', nullable: true, description: 'Optional server ID'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Ticket created successfully'),
            new OA\Response(response: 400, description: 'Bad request - Invalid data'),
        ]
    )]
    public function create(Request $request): Response
    {
        if (!$this->isTicketSystemEnabled()) {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        $user = AuthMiddleware::getCurrentUser($request);
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $data = json_decode($request->getContent(), true);
        if (!$data) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST_DATA', 400);
        }

        $requiredFields = ['title', 'description', 'category_id', 'priority_id'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                return ApiResponse::error("Missing required field: {$field}", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        // Validate category exists
        $category = TicketCategory::getById((int) $data['category_id']);
        if (!$category) {
            return ApiResponse::error('Invalid category', 'INVALID_CATEGORY', 400);
        }

        // Validate priority exists
        $priority = TicketPriority::getById((int) $data['priority_id']);
        if (!$priority) {
            return ApiResponse::error('Invalid priority', 'INVALID_PRIORITY', 400);
        }

        // Check max open tickets limit
        $app = App::getInstance(true);
        $maxOpenTickets = (int) $app->getConfig()->getSetting(ConfigInterface::TICKET_SYSTEM_MAX_OPEN_TICKETS, '10');
        if ($maxOpenTickets > 0) {
            $openTicketsCount = Ticket::getOpenTicketsCount($user['uuid']);
            if ($openTicketsCount >= $maxOpenTickets) {
                return ApiResponse::error(
                    "You have reached the maximum number of open tickets ({$maxOpenTickets}). Please close or wait for resolution of existing tickets before creating a new one.",
                    'MAX_OPEN_TICKETS_REACHED',
                    403
                );
            }
        }

        // Validate server if provided
        $serverId = isset($data['server_id']) && $data['server_id'] !== '' ? (int) $data['server_id'] : null;
        if ($serverId !== null) {
            $server = Server::getServerById($serverId);
            if (!$server) {
                return ApiResponse::error('Invalid server', 'INVALID_SERVER', 400);
            }

            // Verify user owns the server or is a subuser
            if ($server['owner_id'] != $user['id']) {
                // Check if user is a subuser
                $subusers = \App\Chat\Subuser::getSubusersByUserId((int) $user['id']);
                $subuserServerIds = array_map(static fn ($subuser) => (int) $subuser['server_id'], $subusers);
                if (!in_array($serverId, $subuserServerIds, true)) {
                    return ApiResponse::error('You do not have access to this server', 'SERVER_ACCESS_DENIED', 403);
                }
            }
        }

        // Get "Open" status specifically (not just first status)
        $allStatuses = TicketStatus::getAll(null, 100, 0);
        $openStatus = null;
        foreach ($allStatuses as $status) {
            if (strtolower($status['name']) === 'open') {
                $openStatus = $status;
                break;
            }
        }

        // Fallback to first status if "Open" not found
        if (!$openStatus && !empty($allStatuses)) {
            $openStatus = $allStatuses[0];
        }

        if (!$openStatus) {
            return ApiResponse::error('No ticket statuses configured', 'NO_STATUSES', 500);
        }

        // Generate UUID for the ticket
        $ticketUuid = Ticket::generateUuid();

        // Create ticket
        $ticketData = [
            'uuid' => $ticketUuid,
            'user_uuid' => $user['uuid'],
            'server_id' => $serverId,
            'category_id' => (int) $data['category_id'],
            'priority_id' => (int) $data['priority_id'],
            'status_id' => (int) $openStatus['id'],
            'title' => trim($data['title']),
            'description' => trim($data['description']),
        ];

        $ticketId = Ticket::create($ticketData);
        if (!$ticketId) {
            return ApiResponse::error('Failed to create ticket', 'CREATE_FAILED', 500);
        }

        // Create initial message with the description
        $messageData = [
            'ticket_id' => $ticketId,
            'user_uuid' => $user['uuid'],
            'message' => trim($data['description']),
            'is_internal' => false,
        ];

        $messageId = TicketMessage::create($messageData);
        if (!$messageId) {
            // Log warning but don't fail ticket creation
            App::getInstance(true)->getLogger()->warning('Failed to create initial message for ticket: ' . $ticketId);
        }

        $ticket = Ticket::getById($ticketId);
        $ticket = $this->enrichTicketData($ticket);

        // Log activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'create_ticket',
            'context' => 'Created ticket: ' . $ticketData['title'],
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
                    'user_uuid' => $user['uuid'],
                ]
            );
        }

        return ApiResponse::success([
            'ticket' => $ticket,
            'message_id' => $messageId,
        ], 'Ticket created successfully', 201);
    }

    #[OA\Post(
        path: '/api/user/tickets/{uuid}/reply',
        summary: 'Reply to ticket',
        description: 'Add a reply message to a ticket.',
        tags: ['User - Tickets'],
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
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string', description: 'Reply message'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Reply sent successfully'),
            new OA\Response(response: 403, description: 'Access denied'),
        ]
    )]
    public function reply(Request $request, string $uuid): Response
    {
        if (!$this->isTicketSystemEnabled()) {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        $user = AuthMiddleware::getCurrentUser($request);
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        // Verify ticket belongs to user
        if ($ticket['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!$data || !isset($data['message']) || trim($data['message']) === '') {
            return ApiResponse::error('Message is required', 'MISSING_MESSAGE', 400);
        }

        // Get message content
        $messageContent = trim($data['message']);

        // Always add signature if user has one
        $userData = User::getUserByUuid($user['uuid']);
        if ($userData && !empty($userData['ticket_signature'])) {
            $messageContent .= "\n\n---\n" . $userData['ticket_signature'];
        }

        // Create message (users cannot create internal messages)
        $messageData = [
            'ticket_id' => (int) $ticket['id'],
            'user_uuid' => $user['uuid'],
            'message' => $messageContent,
            'is_internal' => false,
        ];

        $messageId = TicketMessage::create($messageData);
        if (!$messageId) {
            return ApiResponse::error('Failed to create reply', 'CREATE_FAILED', 500);
        }

        $message = TicketMessage::getById($messageId);
        $message = $this->enrichMessageData($message);

        // Log activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
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
                    'user_uuid' => $user['uuid'],
                ]
            );
        }

        return ApiResponse::success([
            'message' => $message,
            'message_id' => $messageId,
        ], 'Reply sent successfully', 201);
    }

    #[OA\Post(
        path: '/api/user/tickets/{uuid}/attachments',
        summary: 'Upload attachment',
        description: 'Upload an attachment file for a ticket or message.',
        tags: ['User - Tickets'],
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
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    type: 'object',
                    required: ['file'],
                    properties: [
                        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'File to upload'),
                        new OA\Property(property: 'message_id', type: 'integer', nullable: true, description: 'Optional message ID to attach to'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Attachment uploaded successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
        ]
    )]
    public function uploadAttachment(Request $request, string $uuid): Response
    {
        if (!$this->isTicketSystemEnabled()) {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        $app = App::getInstance(true);
        $config = $app->getConfig();

        if ($config->getSetting(ConfigInterface::TICKET_SYSTEM_ALLOW_ATTACHMENTS, 'true') !== 'true') {
            return ApiResponse::error('Attachments are disabled', 'ATTACHMENTS_DISABLED', 403);
        }

        $user = AuthMiddleware::getCurrentUser($request);
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        // Verify ticket belongs to user
        if ($ticket['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        if (!$request->files->has('file')) {
            return ApiResponse::error('No file provided', 'NO_FILE_PROVIDED', 400);
        }

        $file = $request->files->get('file');
        if (!$file->isValid()) {
            return ApiResponse::error('Invalid file upload', 'INVALID_FILE', 400);
        }

        // Get file properties BEFORE moving (must be done before move())
        $fileSize = $file->getSize();
        $originalName = $file->getClientOriginalName();

        // Check file size (max 50MB)
        if ($fileSize > 50 * 1024 * 1024) {
            return ApiResponse::error('File size too large. Maximum size is 50MB', 'FILE_TOO_LARGE', 400);
        }

        // Define allowed MIME types for ticket attachments
        $allowedMimeTypes = [
            // Images (for screenshots)
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/svg+xml',
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'text/plain',
            'text/csv',
            // Spreadsheets
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            // Archives
            'application/zip',
            'application/x-rar-compressed',
            'application/x-tar',
            'application/gzip',
        ];

        // Define allowed file extensions (must match MIME types)
        $allowedExtensions = [
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
            'pdf', 'doc', 'docx', 'txt', 'csv',
            'xls', 'xlsx',
            'zip', 'rar', 'tar', 'gz',
        ];

        // Get file extension from original filename
        $originalExtension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $originalExtension = preg_replace('/[^a-zA-Z0-9]/', '', $originalExtension);

        // Validate extension
        if (empty($originalExtension) || !in_array($originalExtension, $allowedExtensions, true)) {
            $allowedList = implode(', ', array_map('strtoupper', $allowedExtensions));

            return ApiResponse::error(
                'File type not allowed. Allowed file types: ' . $allowedList,
                'INVALID_FILE_TYPE',
                400
            );
        }

        // Get MIME type using reliable server-side detection
        // Use finfo_file for more reliable detection than getMimeType()
        $detectedMimeType = null;
        if (extension_loaded('fileinfo')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $tempPath = $file->getPathname();
            if ($tempPath && file_exists($tempPath)) {
                $detectedMimeType = finfo_file($finfo, $tempPath);
            }
        }

        // Fallback to uploaded file's MIME type if finfo failed
        if (!$detectedMimeType) {
            $detectedMimeType = $file->getMimeType();
        }

        // Validate MIME type
        if (empty($detectedMimeType) || !in_array($detectedMimeType, $allowedMimeTypes, true)) {
            return ApiResponse::error(
                'File type not allowed. Please upload a valid file type (images, documents, PDF, archives).',
                'INVALID_MIME_TYPE',
                400
            );
        }

        // Create attachments directory if it doesn't exist
        // Note: Ensure .htaccess or nginx configuration prevents PHP execution in this directory
        // Example .htaccess: <FilesMatch "\.php$"> Require all denied </FilesMatch>
        // Example nginx: location ~ ^/attachments/.*\.php$ { deny all; }
        $attachmentsDir = APP_PUBLIC . '/attachments/';
        if (!is_dir($attachmentsDir)) {
            mkdir($attachmentsDir, 0755, true);
        }

        // Generate unique filename with sanitized extension
        $sanitizedBase = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
        $filename = uniqid() . '_ticket_' . $sanitizedBase . '.' . $originalExtension;
        $filePath = $attachmentsDir . $filename;

        // Move uploaded file
        try {
            $file->move($attachmentsDir, $filename);

            // Set safe file permissions (read-only for owner and group, no execute)
            // This prevents accidental execution even if PHP execution is somehow enabled
            @chmod($filePath, 0644);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to save file: ' . $e->getMessage(), 'SAVE_FAILED', 500);
        }

        // Use detected MIME type for storage
        $mimeType = $detectedMimeType;

        // Generate URL
        $baseUrl = $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems');
        $url = $baseUrl . '/attachments/' . $filename;

        // Get message ID if provided (from FormData)
        $messageId = null;
        if ($request->request->has('message_id')) {
            $messageIdParam = $request->request->get('message_id');
            if (is_string($messageIdParam) && $messageIdParam !== '' && is_numeric($messageIdParam)) {
                $messageId = (int) $messageIdParam;
            }
        }

        // Verify message belongs to ticket if provided
        if ($messageId !== null) {
            $message = TicketMessage::getById($messageId);
            if (!$message || (int) $message['ticket_id'] !== (int) $ticket['id']) {
                return ApiResponse::error('Invalid message ID', 'INVALID_MESSAGE_ID', 400);
            }
        }

        // Create attachment record
        $attachmentData = [
            'ticket_id' => (int) $ticket['id'],
            'message_id' => $messageId,
            'file_name' => $originalName,
            'file_path' => $filename,
            'file_size' => $fileSize,
            'file_type' => $mimeType,
            'user_downloadable' => true,
        ];

        $attachmentId = TicketAttachment::create($attachmentData);
        if (!$attachmentId) {
            // Clean up uploaded file if database insert fails
            if (file_exists($filePath)) {
                unlink($filePath);
            }

            return ApiResponse::error('Failed to create attachment record', 'CREATE_FAILED', 500);
        }

        $attachment = TicketAttachment::getById($attachmentId);
        $attachment['url'] = $url;

        return ApiResponse::success(['attachment' => $attachment], 'Attachment uploaded successfully', 201);
    }

    #[OA\Delete(
        path: '/api/user/tickets/{uuid}/messages/{id}',
        summary: 'Delete a ticket message',
        description: 'Delete a message from a ticket. Users can only delete their own messages.',
        tags: ['User - Tickets'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                required: true,
                description: 'Ticket UUID',
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                description: 'Message ID',
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Message deleted successfully'),
            new OA\Response(response: 403, description: 'Access denied - user does not own this message'),
            new OA\Response(response: 404, description: 'Ticket or message not found'),
        ]
    )]
    public function deleteMessage(Request $request, string $uuid, int $id): Response
    {
        if (!$this->isTicketSystemEnabled()) {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        $user = AuthMiddleware::getCurrentUser($request);
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Validate ticket UUID
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid ticket UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        // Verify ticket belongs to user
        if ($ticket['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        $message = TicketMessage::getById($id);
        if (!$message) {
            return ApiResponse::error('Message not found', 'MESSAGE_NOT_FOUND', 404);
        }

        // Verify message belongs to ticket
        if ((int) $message['ticket_id'] !== (int) $ticket['id']) {
            return ApiResponse::error('Message does not belong to this ticket', 'MESSAGE_MISMATCH', 400);
        }

        // Verify user owns the message (users can only delete their own messages)
        if ($message['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('You can only delete your own messages', 'ACCESS_DENIED', 403);
        }

        // Prevent deletion of internal messages by users
        if (!empty($message['is_internal'])) {
            return ApiResponse::error('Cannot delete internal messages', 'ACCESS_DENIED', 403);
        }

        $deleted = TicketMessage::delete($id);
        if (!$deleted) {
            return ApiResponse::error('Failed to delete message', 'DELETE_FAILED', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
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
                    'user_uuid' => $user['uuid'],
                ]
            );
        }

        return ApiResponse::success([], 'Message deleted successfully', 200);
    }

    #[OA\Delete(
        path: '/api/user/tickets/{uuid}',
        summary: 'Delete a ticket',
        description: 'Delete a ticket and all its associated messages and attachments. Users can only delete their own tickets.',
        tags: ['User - Tickets'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                required: true,
                description: 'Ticket UUID',
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Ticket deleted successfully'),
            new OA\Response(response: 403, description: 'Access denied - user does not own this ticket'),
            new OA\Response(response: 404, description: 'Ticket not found'),
        ]
    )]
    public function delete(Request $request, string $uuid): Response
    {
        if (!$this->isTicketSystemEnabled()) {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        $user = AuthMiddleware::getCurrentUser($request);
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Validate ticket UUID
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid ticket UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        // Verify ticket belongs to user
        if ($ticket['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        $ticketId = (int) $ticket['id'];

        // Delete all messages and their attachments
        $messages = TicketMessage::getByTicketId($ticketId, 1000, 0);
        foreach ($messages as $message) {
            // Delete attachments for this message
            $attachments = TicketAttachment::getAll($ticketId, (int) $message['id']);
            foreach ($attachments as $attachment) {
                // Delete file from disk
                $filePath = APP_PUBLIC . '/attachments/' . $attachment['file_path'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
                // Delete record from database
                TicketAttachment::delete((int) $attachment['id']);
            }
            // Delete message
            TicketMessage::delete((int) $message['id']);
        }

        // Delete ticket
        $deleted = Ticket::delete($ticketId);
        if (!$deleted) {
            return ApiResponse::error('Failed to delete ticket', 'DELETE_FAILED', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
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
                    'user_uuid' => $user['uuid'],
                ]
            );
        }

        return ApiResponse::success([], 'Ticket deleted successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/tickets/categories',
        summary: 'Get ticket categories',
        description: 'Retrieve all available ticket categories.',
        tags: ['User - Tickets'],
        responses: [
            new OA\Response(response: 200, description: 'Categories retrieved successfully'),
        ]
    )]
    public function getCategories(Request $request): Response
    {
        if (!$this->isTicketSystemEnabled()) {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        $categories = TicketCategory::getAll(null, 100, 0);

        return ApiResponse::success(['categories' => $categories], 'Categories retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/tickets/priorities',
        summary: 'Get ticket priorities',
        description: 'Retrieve all available ticket priorities.',
        tags: ['User - Tickets'],
        responses: [
            new OA\Response(response: 200, description: 'Priorities retrieved successfully'),
        ]
    )]
    public function getPriorities(Request $request): Response
    {
        if (!$this->isTicketSystemEnabled()) {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        $priorities = TicketPriority::getAll(null, 100, 0);

        return ApiResponse::success(['priorities' => $priorities], 'Priorities retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/tickets/statuses',
        summary: 'Get ticket statuses',
        description: 'Retrieve all available ticket statuses.',
        tags: ['User - Tickets'],
        responses: [
            new OA\Response(response: 200, description: 'Statuses retrieved successfully'),
        ]
    )]
    public function getStatuses(Request $request): Response
    {
        if (!$this->isTicketSystemEnabled()) {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        $statuses = TicketStatus::getAll(null, 100, 0);

        return ApiResponse::success(['statuses' => $statuses], 'Statuses retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/tickets/servers',
        summary: 'Get user servers',
        description: 'Retrieve all servers owned by the user for ticket linking.',
        tags: ['User - Tickets'],
        responses: [
            new OA\Response(response: 200, description: 'Servers retrieved successfully'),
        ]
    )]
    public function getServers(Request $request): Response
    {
        if (!$this->isTicketSystemEnabled()) {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        $user = AuthMiddleware::getCurrentUser($request);
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get owned servers
        $ownedServers = Server::getServersByOwnerId((int) $user['id']);

        // Get subuser servers
        $subusers = \App\Chat\Subuser::getSubusersByUserId((int) $user['id']);
        $subuserServerIds = array_map(static fn ($subuser) => (int) $subuser['server_id'], $subusers);
        $subuserServers = [];
        foreach ($subuserServerIds as $serverId) {
            $server = Server::getServerById($serverId);
            if ($server) {
                $subuserServers[] = $server;
            }
        }

        // Combine and format
        $allServers = array_merge($ownedServers, $subuserServers);
        $formattedServers = [];
        foreach ($allServers as $server) {
            $formattedServers[] = [
                'id' => (int) $server['id'],
                'uuid' => $server['uuid'],
                'uuidShort' => $server['uuidShort'],
                'name' => $server['name'],
                'description' => $server['description'] ?? null,
            ];
        }

        return ApiResponse::success(['servers' => $formattedServers], 'Servers retrieved successfully', 200);
    }

    /**
     * Enrich ticket data with related information.
     */
    private function enrichTicketData(array $ticket): array
    {
        // Add category
        if (isset($ticket['category_id'])) {
            $category = TicketCategory::getById((int) $ticket['category_id']);
            $ticket['category'] = $category ? [
                'id' => (int) $category['id'],
                'name' => $category['name'],
                'icon' => $category['icon'] ?? null,
                'color' => $category['color'] ?? null,
            ] : null;
        }

        // Add priority
        if (isset($ticket['priority_id'])) {
            $priority = TicketPriority::getById((int) $ticket['priority_id']);
            $ticket['priority'] = $priority ? [
                'id' => (int) $priority['id'],
                'name' => $priority['name'],
                'color' => $priority['color'] ?? null,
            ] : null;
        }

        // Add status
        if (isset($ticket['status_id'])) {
            $status = TicketStatus::getById((int) $ticket['status_id']);
            $ticket['status'] = $status ? [
                'id' => (int) $status['id'],
                'name' => $status['name'],
                'color' => $status['color'] ?? null,
            ] : null;
        }

        // Add server
        if (isset($ticket['server_id']) && $ticket['server_id'] !== null) {
            $server = Server::getServerById((int) $ticket['server_id']);
            $ticket['server'] = $server ? [
                'id' => (int) $server['id'],
                'uuid' => $server['uuid'],
                'uuidShort' => $server['uuidShort'],
                'name' => $server['name'],
            ] : null;
        } else {
            $ticket['server'] = null;
        }

        return $ticket;
    }

    /**
     * Enrich message data with user information (including admin roles).
     */
    private function enrichMessageData(array $message): array
    {
        if (isset($message['user_uuid']) && $message['user_uuid']) {
            $user = User::getUserByUuid($message['user_uuid']);
            if ($user) {
                $message['user'] = [
                    'uuid' => $user['uuid'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'avatar' => $user['avatar'] ?? null,
                    'first_name' => $user['first_name'] ?? null,
                    'last_name' => $user['last_name'] ?? null,
                ];

                // Add role information if user is admin/staff
                $role = \App\Chat\Role::getById((int) $user['role_id']);
                if ($role) {
                    $message['user']['role'] = [
                        'id' => (int) $role['id'],
                        'name' => $role['display_name'] ?? $role['name'], // Use display_name if available, fallback to name
                        'color' => $role['color'] ?? null, // Include role color
                    ];
                }
            }
        }

        // Get attachments for this message
        if (isset($message['id'])) {
            $attachments = TicketAttachment::getAll(null, (int) $message['id'], 100, 0);
            $baseUrl = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems');
            foreach ($attachments as &$attachment) {
                // Ensure file_path is just the filename (not a full path)
                $filePath = $attachment['file_path'];
                // Remove leading slash if present
                $filePath = ltrim($filePath, '/');
                // Remove 'attachments/' prefix if present
                $filePath = preg_replace('#^attachments/#', '', $filePath);
                $attachment['url'] = rtrim($baseUrl, '/') . '/attachments/' . $filePath;
            }
            $message['attachments'] = $attachments;
        } else {
            // Always set attachments array, even if empty
            $message['attachments'] = [];
        }

        return $message;
    }

    /**
     * Check if ticket system is enabled.
     */
    private function isTicketSystemEnabled(): bool
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();

        return $config->getSetting(ConfigInterface::TICKET_SYSTEM_ENABLED, 'true') === 'true';
    }
}
