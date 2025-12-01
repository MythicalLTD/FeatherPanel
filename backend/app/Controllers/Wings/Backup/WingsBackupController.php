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

namespace App\Controllers\Wings\Backup;

use App\Chat\Node;
use App\Chat\Backup;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Plugins\Events\Events\WingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'BackupUploadInfo',
    type: 'object',
    properties: [
        new OA\Property(property: 'parts', type: 'array', items: new OA\Items(type: 'string'), description: 'Array of upload URLs for each part'),
        new OA\Property(property: 'part_size', type: 'integer', description: 'Size of each part in bytes'),
    ]
)]
#[OA\Schema(
    schema: 'BackupCompletion',
    type: 'object',
    required: ['checksum', 'checksum_type', 'size', 'successful'],
    properties: [
        new OA\Property(property: 'checksum', type: 'string', description: 'Backup file checksum'),
        new OA\Property(property: 'checksum_type', type: 'string', description: 'Type of checksum algorithm'),
        new OA\Property(property: 'size', type: 'integer', description: 'Backup file size in bytes'),
        new OA\Property(property: 'successful', type: 'boolean', description: 'Whether backup was successful'),
        new OA\Property(property: 'upload_id', type: 'string', description: 'Upload ID for multipart uploads'),
    ]
)]
#[OA\Schema(
    schema: 'BackupRestoration',
    type: 'object',
    required: ['successful'],
    properties: [
        new OA\Property(property: 'successful', type: 'boolean', description: 'Whether restoration was successful'),
    ]
)]
class WingsBackupController
{
    #[OA\Get(
        path: '/api/remote/backups/{backupUuid}',
        summary: 'Get backup upload information',
        description: 'Get presigned upload URLs for S3/remote backup storage. Returns multipart upload URLs for large backup files. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Backup'],
        parameters: [
            new OA\Parameter(
                name: 'backupUuid',
                in: 'path',
                description: 'Backup UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
            new OA\Parameter(
                name: 'size',
                in: 'query',
                description: 'Backup file size in bytes',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Backup upload information retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/BackupUploadInfo')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing backup UUID or invalid size parameter'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid Wings authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Invalid Wings authentication'),
            new OA\Response(response: 404, description: 'Not found - Backup, server, or node not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function getBackupUploadInfo(Request $request, string $backupUuid): Response
    {
        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);
        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get backup info
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Get server info to verify it belongs to this node
        $server = Server::getServerById($backup['server_id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if ($server['node_id'] != $node['id']) {
            return ApiResponse::error('Server not found on this node', 'SERVER_NOT_FOUND', 404);
        }

        // Get size from query parameter
        $size = $request->query->get('size');
        if (!$size || !is_numeric($size)) {
            return ApiResponse::error('Invalid size parameter', 'INVALID_SIZE_PARAMETER', 400);
        }

        // For now, return a simple response with mock data
        // In a real implementation, you would generate presigned URLs for S3
        $partSize = 5 * 1024 * 1024; // 5MB parts
        $totalParts = ceil((int) $size / $partSize);

        $parts = [];
        for ($i = 1; $i <= $totalParts; ++$i) {
            $parts[] = "https://example.com/upload/part{$i}"; // Mock URLs
        }

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsBackupUploadInfoRetrieved(),
            [
                'backup_uuid' => $backupUuid,
                'backup' => $backup,
                'server' => $server,
                'node' => $node,
                'upload_info' => [
                    'parts' => $parts,
                    'part_size' => $partSize,
                    'total_size' => $size,
                ],
            ]
        );

        return ApiResponse::success([
            'parts' => $parts,
            'part_size' => $partSize,
        ]);
    }

    #[OA\Post(
        path: '/api/remote/backups/{backupUuid}',
        summary: 'Report backup completion',
        description: 'Report backup completion and metadata to update backup record with checksum, size, and success status. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Backup'],
        parameters: [
            new OA\Parameter(
                name: 'backupUuid',
                in: 'path',
                description: 'Backup UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/BackupCompletion')
        ),
        responses: [
            new OA\Response(
                response: 204,
                description: 'Backup completion reported successfully'
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing backup UUID, invalid request body, or missing required fields'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid Wings authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Invalid Wings authentication'),
            new OA\Response(response: 404, description: 'Not found - Backup, server, or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update backup'),
        ]
    )]
    public function reportBackupCompletion(Request $request, string $backupUuid): Response
    {
        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);
        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get backup info
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Get server info to verify it belongs to this node
        $server = Server::getServerById($backup['server_id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if ($server['node_id'] != $node['id']) {
            return ApiResponse::error('Server not found on this node', 'SERVER_NOT_FOUND', 404);
        }

        // Parse request body
        $body = json_decode($request->getContent(), true);
        if (!$body) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        // Validate required fields
        $required = ['checksum', 'checksum_type', 'size', 'successful'];
        foreach ($required as $field) {
            if (!isset($body[$field])) {
                return ApiResponse::error("Missing required field: {$field}", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        // Update backup with completion data
        $updateData = [
            'checksum' => $body['checksum'],
            'bytes' => (int) $body['size'],
            'is_successful' => $body['successful'] ? 1 : 0,
            'is_locked' => 0,
            'completed_at' => date('Y-m-d H:i:s'),
        ];

        // Add upload_id if provided
        if (!empty($body['upload_id'])) {
            $updateData['upload_id'] = $body['upload_id'];
        }

        // Update the backup
        if (!Backup::updateBackup($backup['id'], $updateData)) {
            return ApiResponse::error('Failed to update backup', 'UPDATE_FAILED', 500);
        }

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsBackupCompletionReported(),
            [
                'backup_uuid' => $backupUuid,
                'backup' => $backup,
                'server' => $server,
                'node' => $node,
                'completion_data' => $updateData,
            ]
        );

        return ApiResponse::success(null, 'Backup completion reported successfully', 204);
    }

    #[OA\Post(
        path: '/api/remote/backups/{backupUuid}/restore',
        summary: 'Report backup restoration completion',
        description: 'Report backup restoration completion status to log restoration activities. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Backup'],
        parameters: [
            new OA\Parameter(
                name: 'backupUuid',
                in: 'path',
                description: 'Backup UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/BackupRestoration')
        ),
        responses: [
            new OA\Response(
                response: 204,
                description: 'Backup restoration completion reported successfully'
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing backup UUID, invalid request body, or missing required field'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid Wings authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Invalid Wings authentication'),
            new OA\Response(response: 404, description: 'Not found - Backup, server, or node not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function reportBackupRestoration(Request $request, string $backupUuid): Response
    {
        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);
        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get backup info
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }

        // Get server info to verify it belongs to this node
        $server = Server::getServerById($backup['server_id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if ($server['node_id'] != $node['id']) {
            return ApiResponse::error('Server not found on this node', 'SERVER_NOT_FOUND', 404);
        }

        // Parse request body
        $body = json_decode($request->getContent(), true);
        if (!$body) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        // Validate required fields
        if (!isset($body['successful'])) {
            return ApiResponse::error('Missing required field: successful', 'MISSING_REQUIRED_FIELD', 400);
        }

        // Log the restoration completion
        // In a real implementation, you might want to update the backup record
        // or create a restoration log entry

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsBackupRestorationReported(),
            [
                'backup_uuid' => $backupUuid,
                'backup' => $backup,
                'server' => $server,
                'node' => $node,
                'restoration_data' => $body,
            ]
        );

        return ApiResponse::success(null, 'Backup restoration reported successfully', 204);
    }
}
