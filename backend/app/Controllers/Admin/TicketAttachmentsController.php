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
use App\Chat\Ticket;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\TicketAttachment;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'TicketAttachment',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Attachment ID'),
        new OA\Property(property: 'ticket_id', type: 'integer', nullable: true, description: 'Ticket ID'),
        new OA\Property(property: 'message_id', type: 'integer', nullable: true, description: 'Message ID'),
        new OA\Property(property: 'file_name', type: 'string', description: 'Stored file name'),
        new OA\Property(property: 'file_path', type: 'string', description: 'Relative file path'),
        new OA\Property(property: 'file_size', type: 'integer', description: 'File size in bytes'),
        new OA\Property(property: 'file_type', type: 'string', description: 'MIME type'),
        new OA\Property(property: 'user_downloadable', type: 'boolean', description: 'Whether users can download this file'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true, description: 'Last update timestamp'),
    ]
)]
class TicketAttachmentsController
{
    #[OA\Post(
        path: '/api/admin/tickets/{uuid}/attachments',
        summary: 'Upload attachment for ticket',
        description: 'Upload an attachment file for a ticket. Supports various file types with a maximum size of 50MB. Files are stored under /attachments using the pattern <ticketUuid>_tk_<name>.<extension>.',
        tags: ['Admin - Ticket Attachments'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Ticket UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
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
                        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'Attachment file (max 50MB)'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Attachment uploaded successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'attachment_id', type: 'integer', description: 'Attachment ID'),
                        new OA\Property(property: 'url', type: 'string', description: 'Public URL of the attachment'),
                        new OA\Property(property: 'filename', type: 'string', description: 'Stored filename'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - No file provided or invalid file'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Attachments disabled'),
            new OA\Response(response: 404, description: 'Ticket not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to save file'),
        ]
    )]
    public function upload(Request $request, string $uuid): Response
    {
        if ($response = $this->assertTicketSystemEnabled()) {
            return $response;
        }
        if ($response = $this->assertAttachmentsAllowed()) {
            return $response;
        }

        // Validate ticket UUID
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid ticket UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        if (!$request->files->has('file')) {
            return ApiResponse::error('No file provided', 'NO_FILE_PROVIDED', 400);
        }

        $file = $request->files->get('file');
        if (!$file || !$file->isValid()) {
            return ApiResponse::error('Invalid file upload', 'INVALID_FILE', 400);
        }

        // 50MB max
        if ($file->getSize() > 50 * 1024 * 1024) {
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

        // Explicitly block dangerous executable extensions
        $blockedExtensions = [
            'php', 'phar', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8',
            'cgi', 'pl', 'py', 'rb', 'sh', 'bash',
            'jsp', 'jspx', 'asp', 'aspx', 'asmx',
            'exe', 'bat', 'cmd', 'com', 'scr', 'vbs', 'wsf',
            'jar', 'war', 'ear',
        ];

        // Get file extension from original filename
        $originalName = $file->getClientOriginalName() ?: 'attachment';
        $pathInfo = pathinfo($originalName);
        $originalExtension = strtolower($pathInfo['extension'] ?? '');
        $originalExtension = preg_replace('/[^a-zA-Z0-9]/', '', $originalExtension);

        // Validate extension - check blocked first
        if (!empty($originalExtension) && in_array($originalExtension, $blockedExtensions, true)) {
            return ApiResponse::error(
                'File type not allowed. Executable files are not permitted.',
                'INVALID_FILE_TYPE',
                400
            );
        }

        // Validate extension against allowlist
        if (empty($originalExtension) || !in_array($originalExtension, $allowedExtensions, true)) {
            $allowedList = implode(', ', array_map('strtoupper', $allowedExtensions));

            return ApiResponse::error(
                'File type not allowed. Allowed file types: ' . $allowedList,
                'INVALID_FILE_TYPE',
                400
            );
        }

        // Get MIME type using reliable server-side detection
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

        // Directory
        $attachmentsDir = APP_PUBLIC . '/attachments/';
        if (!is_dir($attachmentsDir)) {
            mkdir($attachmentsDir, 0755, true);
        }

        // Build filename: <ticketUuid>_tk_<name>.<extension>
        $base = $pathInfo['filename'] ?? 'attachment';
        $base = preg_replace('/[^a-zA-Z0-9._-]/', '_', $base);
        $ext = $originalExtension;

        $ticketUuid = $ticket['uuid'];
        $filename = $ticketUuid . '_tk_' . $base . '.' . $ext;
        $filePath = $attachmentsDir . $filename;

        // Ensure uniqueness
        $counter = 1;
        while (file_exists($filePath)) {
            $filename = $ticketUuid . '_tk_' . $base . '_' . $counter . '.' . $ext;
            $filePath = $attachmentsDir . $filename;
            ++$counter;
        }

        // Capture file properties BEFORE moving the file
        // (getSize() and getMimeType() may return invalid values after move())
        $fileSize = $file->getSize();
        $mimeType = $detectedMimeType ?: 'application/octet-stream';

        try {
            $file->move($attachmentsDir, $filename);

            // Set safe file permissions (read-only for owner and group, no execute)
            // This prevents accidental execution even if PHP execution is somehow enabled
            @chmod($filePath, 0644);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to save file: ' . $e->getMessage(), 'SAVE_FAILED', 500);
        }

        $relativePath = '/attachments/' . $filename;

        $data = [
            'ticket_id' => $ticket['id'],
            'message_id' => null,
            'file_name' => $filename,
            'file_path' => $relativePath,
            'file_size' => $fileSize,
            'file_type' => $mimeType,
            'user_downloadable' => 1,
        ];

        $attachmentId = TicketAttachment::create($data);
        if (!$attachmentId) {
            if (file_exists($filePath)) {
                unlink($filePath);
            }

            return ApiResponse::error('Failed to create attachment record', 'CREATE_FAILED', 500);
        }

        $baseUrl = App::getInstance(true)->getConfig()->getSetting(
            ConfigInterface::APP_URL,
            'https://featherpanel.mythical.systems'
        );
        $url = rtrim($baseUrl, '/') . $relativePath;

        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'] ?? null,
            'name' => 'upload_ticket_attachment',
            'context' => 'Uploaded attachment for ticket ' . $ticketUuid . ': ' . $filename,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'attachment_id' => $attachmentId,
            'url' => $url,
            'filename' => $filename,
        ], 'Attachment uploaded successfully', 201);
    }

    #[OA\Get(
        path: '/api/admin/tickets/{uuid}/attachments',
        summary: 'Get attachments for ticket',
        description: 'Retrieve all attachments associated with a ticket.',
        tags: ['Admin - Ticket Attachments'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Ticket UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Attachments retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'attachments', type: 'array', items: new OA\Items(ref: '#/components/schemas/TicketAttachment')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid UUID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Ticket not found'),
        ]
    )]
    public function index(Request $request, string $uuid): Response
    {
        if ($response = $this->assertTicketSystemEnabled()) {
            return $response;
        }

        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid ticket UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        $attachments = TicketAttachment::getAll((int) $ticket['id'], null);

        return ApiResponse::success([
            'attachments' => $attachments,
        ], 'Attachments fetched successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/tickets/{uuid}/attachments/{attachmentId}',
        summary: 'Delete ticket attachment',
        description: 'Delete a specific attachment associated with a ticket.',
        tags: ['Admin - Ticket Attachments'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Ticket UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'attachmentId',
                in: 'path',
                description: 'Attachment ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Attachment deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Ticket or attachment not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function delete(Request $request, string $uuid, int $attachmentId): Response
    {
        if ($response = $this->assertTicketSystemEnabled()) {
            return $response;
        }

        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return ApiResponse::error('Invalid ticket UUID format', 'INVALID_UUID_FORMAT', 400);
        }

        $ticket = Ticket::getByUuid($uuid);
        if (!$ticket) {
            return ApiResponse::error('Ticket not found', 'TICKET_NOT_FOUND', 404);
        }

        if ($attachmentId <= 0) {
            return ApiResponse::error('Invalid attachment ID', 'INVALID_ATTACHMENT_ID', 400);
        }

        $attachment = TicketAttachment::getById($attachmentId);
        if (!$attachment || (int) $attachment['ticket_id'] !== (int) $ticket['id']) {
            return ApiResponse::error('Attachment not found for this ticket', 'ATTACHMENT_NOT_FOUND', 404);
        }

        // Let the model handle file deletion with proper path sanitization
        $deleted = TicketAttachment::delete($attachmentId);
        if (!$deleted) {
            return ApiResponse::error('Failed to delete attachment', 'DELETE_FAILED', 500);
        }

        $currentUser = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $currentUser['uuid'] ?? null,
            'name' => 'delete_ticket_attachment',
            'context' => 'Deleted attachment ' . $attachmentId . ' for ticket ' . $uuid,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Attachment deleted successfully', 200);
    }

    /**
     * Check if the ticket system is enabled.
     */
    private function assertTicketSystemEnabled(): ?Response
    {
        $app = App::getInstance(true);
        $enabled = $app->getConfig()->getSetting(ConfigInterface::TICKET_SYSTEM_ENABLED, 'true');
        if ($enabled !== 'true') {
            return ApiResponse::error('Ticket system is disabled', 'TICKET_SYSTEM_DISABLED', 403);
        }

        return null;
    }

    /**
     * Check if attachments are allowed.
     */
    private function assertAttachmentsAllowed(): ?Response
    {
        $app = App::getInstance(true);
        $allowed = $app->getConfig()->getSetting(ConfigInterface::TICKET_SYSTEM_ALLOW_ATTACHMENTS, 'true');
        if ($allowed !== 'true') {
            return ApiResponse::error('Ticket attachments are disabled', 'TICKET_ATTACHMENTS_DISABLED', 403);
        }

        return null;
    }
}
