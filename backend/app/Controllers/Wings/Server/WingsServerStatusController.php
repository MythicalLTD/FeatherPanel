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

namespace App\Controllers\Wings\Server;

use App\Chat\Node;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Plugins\Events\Events\WingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'ServerStatusUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'data', type: 'object', properties: [
            new OA\Property(property: 'new_state', type: 'string', enum: ['offline', 'starting', 'running', 'stopping', 'stopped', 'installing', 'install_failed', 'update_failed', 'backup_failed', 'crashed', 'suspended'], description: 'New server state'),
            new OA\Property(property: 'error', type: 'string', description: 'Error message if applicable'),
        ]),
        new OA\Property(property: 'state', type: 'string', enum: ['offline', 'starting', 'running', 'stopping', 'stopped', 'installing', 'install_failed', 'update_failed', 'backup_failed', 'crashed', 'suspended'], description: 'Server state (fallback format)'),
    ]
)]
#[OA\Schema(
    schema: 'ServerStatusUpdateResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
        new OA\Property(property: 'state', type: 'string', description: 'Updated server state'),
        new OA\Property(property: 'server_uuid', type: 'string', description: 'Server UUID'),
    ]
)]
#[OA\Schema(
    schema: 'ServerStatusResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'state', type: 'string', description: 'Current server state'),
        new OA\Property(property: 'server_uuid', type: 'string', description: 'Server UUID'),
        new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID'),
    ]
)]
class WingsServerStatusController
{
    #[OA\Post(
        path: '/api/remote/servers/{uuid}/container/status',
        summary: 'Update server container status',
        description: 'Update server container status from Wings daemon. Accepts various server states including running, stopped, crashed, etc. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Server'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Server UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ServerStatusUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server status updated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ServerStatusUpdateResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing server UUID, invalid JSON, missing state field, or invalid state value'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid Wings authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Invalid Wings authentication'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update server status'),
        ]
    )]
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

    #[OA\Get(
        path: '/api/remote/servers/{uuid}/container/status',
        summary: 'Get server container status',
        description: 'Retrieve current server container status from the database. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Server'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Server UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server status retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ServerStatusResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing server UUID'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid Wings authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Invalid Wings authentication'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
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
