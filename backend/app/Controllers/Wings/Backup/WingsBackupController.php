<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Wings\Backup;

use App\Chat\Node;
use App\Chat\Backup;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WingsBackupController
{
    /**
     * Get backup upload information for S3/remote backups.
     * This endpoint is called by Wings to get presigned upload URLs.
     *
     * @param Request $request The HTTP request
     * @param string $backupUuid The backup UUID
     *
     * @return Response The HTTP response
     */
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

        return ApiResponse::success([
            'parts' => $parts,
            'part_size' => $partSize,
        ]);
    }

    /**
     * Report backup completion and metadata.
     * This endpoint is called by Wings after a backup is completed.
     *
     * @param Request $request The HTTP request
     * @param string $backupUuid The backup UUID
     *
     * @return Response The HTTP response
     */
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

        return ApiResponse::success(null, 'Backup completion reported successfully', 204);
    }

    /**
     * Report backup restoration completion.
     * This endpoint is called by Wings after a backup restoration is completed.
     *
     * @param Request $request The HTTP request
     * @param string $backupUuid The backup UUID
     *
     * @return Response The HTTP response
     */
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

        return ApiResponse::success(null, 'Backup restoration reported successfully', 204);
    }
}
