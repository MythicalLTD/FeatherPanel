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

namespace App\Controllers\Wings\Server;

use App\Chat\Node;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use App\Plugins\Events\Events\WingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WingsServerStatusController
{
    /**
     * Update server container status from Wings.
     */
    public function updateContainerStatus(Request $request, string $uuid): Response
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

        // Get server by UUID and verify it belongs to this node
        $server = Server::getServerByUuidAndNodeId($uuid, (int) $node['id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get request data
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        $state = null;
        if (isset($data['data']) && is_array($data['data'])) {
            $state = $data['data']['new_state'] ?? null;
        } elseif (isset($data['state'])) {
            // Fallback to direct state format
            $state = $data['state'];
        }

        if (!$state || !is_string($state)) {
            return ApiResponse::error('Missing or invalid state field', 'MISSING_STATE', 400);
        }

        // Validate state values
        $validStates = [
            'offline',
            'starting',
            'running',
            'stopping',
            'stopped',
            'installing',
            'install_failed',
            'update_failed',
            'backup_failed',
            'crashed',
            'suspended',
        ];

        if (!in_array($state, $validStates)) {
            return ApiResponse::error('Invalid state value', 'INVALID_STATE', 400);
        }

        // Update server status
        $updateData = [
            'status' => $state,
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        // Add additional status-specific fields
        if ($state === 'running') {
            $updateData['installed_at'] = $server['installed_at'] ?? date('Y-m-d H:i:s');
        } elseif (in_array($state, ['crashed', 'install_failed', 'update_failed', 'backup_failed'])) {
            // Keep track of failure states
            $updateData['last_error'] = $data['data']['error'] ?? null;
        }

        $updated = Server::updateServerById($server['id'], $updateData);
        if (!$updated) {
            return ApiResponse::error('Failed to update server status', 'UPDATE_FAILED', 500);
        }

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsServerStatusUpdated(),
            [
                'server_uuid' => $uuid,
                'server' => $server,
                'node' => $node,
                'old_state' => $server['status'],
                'new_state' => $state,
                'update_data' => $updateData,
            ]
        );

        return ApiResponse::success([
            'message' => 'Server status updated successfully',
            'state' => $state,
            'server_uuid' => $uuid,
        ]);
    }

    /**
     * Get server container status.
     */
    public function getContainerStatus(Request $request, string $uuid): Response
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

        // Get server by UUID and verify it belongs to this node
        $server = Server::getServerByUuidAndNodeId($uuid, (int) $node['id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsServerStatusRetrieved(),
            [
                'server_uuid' => $uuid,
                'server' => $server,
                'node' => $node,
                'state' => $server['status'] ?? 'offline',
            ]
        );

        return ApiResponse::success([
            'state' => $server['status'] ?? 'offline',
            'server_uuid' => $uuid,
            'node_id' => $node['id'],
        ]);
    }
}
