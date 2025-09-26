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

namespace App\Controllers\User\Server;

use App\Chat\Server;
use App\Chat\Allocation;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'ServerAllocation',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Allocation ID'),
        new OA\Property(property: 'server_id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID'),
        new OA\Property(property: 'ip', type: 'string', description: 'IP address'),
        new OA\Property(property: 'port', type: 'integer', description: 'Port number'),
        new OA\Property(property: 'notes', type: 'string', nullable: true, description: 'Allocation notes'),
        new OA\Property(property: 'is_primary', type: 'boolean', description: 'Whether this is the primary allocation'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Allocation creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Allocation update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'ServerAllocationInfo',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Server name'),
        new OA\Property(property: 'uuid', type: 'string', description: 'Server UUID'),
        new OA\Property(property: 'allocation_limit', type: 'integer', description: 'Maximum number of allocations allowed'),
        new OA\Property(property: 'current_allocations', type: 'integer', description: 'Current number of allocations'),
        new OA\Property(property: 'can_add_more', type: 'boolean', description: 'Whether more allocations can be added'),
        new OA\Property(property: 'primary_allocation_id', type: 'integer', description: 'ID of the primary allocation'),
    ]
)]
#[OA\Schema(
    schema: 'AllocationResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'server', ref: '#/components/schemas/ServerAllocationInfo'),
        new OA\Property(property: 'allocations', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerAllocation')),
    ]
)]
#[OA\Schema(
    schema: 'AllocationDeleteResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
        new OA\Property(property: 'deleted_allocation_id', type: 'integer', description: 'ID of the deleted allocation'),
    ]
)]
#[OA\Schema(
    schema: 'PrimaryAllocationResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
        new OA\Property(property: 'new_primary_allocation_id', type: 'integer', description: 'ID of the new primary allocation'),
    ]
)]
#[OA\Schema(
    schema: 'AutoAllocationResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'assigned_allocation', ref: '#/components/schemas/ServerAllocation'),
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
    ]
)]
class ServerAllocationController
{
    /**
     * Get server allocations.
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/allocations',
        summary: 'Get server allocations',
        description: 'Retrieve all allocations assigned to a specific server that the user owns or has subuser access to.',
        tags: ['User - Server Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server allocations retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/AllocationResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve allocations'),
        ]
    )]
    public function getServerAllocations(Request $request, int $serverId): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get server details
        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Verify access via ServerGateway
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Get server allocations
        $allocations = Allocation::getByServerId($serverId);

        // Mark which allocation is primary
        foreach ($allocations as &$allocation) {
            $allocation['is_primary'] = ((int) $allocation['id'] === (int) $server['allocation_id']);
        }

        // Get server's allocation limit
        $allocationLimit = (int) ($server['allocation_limit'] ?? 100);
        $currentAllocations = count($allocations);

        return ApiResponse::success([
            'server' => [
                'id' => $server['id'],
                'name' => $server['name'],
                'uuid' => $server['uuid'],
                'allocation_limit' => $allocationLimit,
                'current_allocations' => $currentAllocations,
                'can_add_more' => $currentAllocations < $allocationLimit,
                'primary_allocation_id' => $server['allocation_id'],
            ],
            'allocations' => $allocations,
        ], 'Server allocations fetched successfully');
    }

    /**
     * Delete an allocation from the server.
     */
    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/allocations/{allocationId}',
        summary: 'Delete server allocation',
        description: 'Remove an allocation from a server. Cannot delete the primary allocation.',
        tags: ['User - Server Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'allocationId',
                in: 'path',
                description: 'Allocation ID to delete',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Allocation deleted successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/AllocationDeleteResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing parameters, allocation mismatch, or primary allocation deletion attempt'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or allocation not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete allocation'),
        ]
    )]
    public function deleteAllocation(Request $request, int $serverId, int $allocationId): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get server details
        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Verify access via ServerGateway
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Get allocation details
        $allocation = Allocation::getById($allocationId);
        if (!$allocation) {
            return ApiResponse::error('Allocation not found', 'ALLOCATION_NOT_FOUND', 404);
        }

        // Verify the allocation belongs to this server
        if ((int) $allocation['server_id'] !== $serverId) {
            return ApiResponse::error('Allocation does not belong to this server', 'ALLOCATION_MISMATCH', 400);
        }

        // Check if this is the primary allocation (server's main allocation_id)
        if ((int) $allocation['id'] === (int) $server['allocation_id']) {
            return ApiResponse::error('Cannot delete primary allocation', 'PRIMARY_ALLOCATION_DELETE', 400);
        }

        // Delete the allocation
        $success = Allocation::delete($allocationId);
        if (!$success) {
            return ApiResponse::error('Failed to delete allocation', 'ALLOCATION_DELETE_FAILED', 500);
        }

        // Emit event
        global $eventManager;
        $eventManager->emit(
            ServerEvent::onServerAllocationDeleted(),
            ['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'allocation_id' => $allocationId]
        );

        return ApiResponse::success([
            'message' => 'Allocation deleted successfully',
            'deleted_allocation_id' => $allocationId,
        ], 'Allocation deleted successfully');
    }

    /**
     * Set an allocation as primary for the server.
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/allocations/{allocationId}/primary',
        summary: 'Set primary allocation',
        description: 'Set a specific allocation as the primary allocation for the server.',
        tags: ['User - Server Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'allocationId',
                in: 'path',
                description: 'Allocation ID to set as primary',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Primary allocation updated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/PrimaryAllocationResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing parameters or allocation mismatch'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or allocation not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update primary allocation'),
        ]
    )]
    public function setPrimaryAllocation(Request $request, int $serverId, int $allocationId): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get server details
        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Verify access via ServerGateway
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Get allocation details
        $allocation = Allocation::getById($allocationId);
        if (!$allocation) {
            return ApiResponse::error('Allocation not found', 'ALLOCATION_NOT_FOUND', 404);
        }

        // Verify the allocation belongs to this server
        if ((int) $allocation['server_id'] !== $serverId) {
            return ApiResponse::error('Allocation does not belong to this server', 'ALLOCATION_MISMATCH', 400);
        }

        // Update the server's primary allocation
        $success = Server::updateServerById($serverId, ['allocation_id' => $allocationId]);
        if (!$success) {
            return ApiResponse::error('Failed to set primary allocation', 'PRIMARY_ALLOCATION_UPDATE_FAILED', 500);
        }

        // Emit event
        global $eventManager;
        $eventManager->emit(
            ServerEvent::onServerAllocationUpdated(),
            ['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'allocation_id' => $allocationId]
        );

        return ApiResponse::success([
            'message' => 'Primary allocation updated successfully',
            'new_primary_allocation_id' => $allocationId,
        ], 'Primary allocation updated successfully');
    }

    /**
     * Auto-allocate free allocations to the server.
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/allocations/auto',
        summary: 'Auto-allocate allocation',
        description: 'Automatically assign a free allocation to the server. Only assigns one allocation at a time.',
        tags: ['User - Server Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Allocation assigned successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/AutoAllocationResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID, allocation limit reached, or no free allocations available'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to assign allocation'),
        ]
    )]
    public function autoAllocate(Request $request, int $serverId): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get server details
        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Verify access via ServerGateway
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Check allocation limit
        $currentAllocations = count(Allocation::getByServerId($serverId));
        $allocationLimit = (int) ($server['allocation_limit'] ?? 100);

        if ($currentAllocations >= $allocationLimit) {
            return ApiResponse::error('Allocation limit reached', 'ALLOCATION_LIMIT_REACHED', 400);
        }

        // Get available free allocations
        $availableAllocations = Allocation::getAvailable(100, 0); // Get up to 100 free allocations

        if (empty($availableAllocations)) {
            return ApiResponse::error('No free allocations available', 'NO_FREE_ALLOCATIONS', 400);
        }

        // Only assign 1 allocation at a time
        $canAssign = 1;

        // Randomly select 1 allocation to assign
        shuffle($availableAllocations);
        $selectedAllocation = $availableAllocations[0];

        // Assign the selected allocation to the server
        $success = Allocation::assignToServer($selectedAllocation['id'], $serverId);
        if (!$success) {
            return ApiResponse::error('Failed to assign allocation', 'ASSIGNMENT_FAILED', 500);
        }

        // Get the updated allocation
        $updatedAllocation = Allocation::getById($selectedAllocation['id']);
        if (!$updatedAllocation) {
            return ApiResponse::error('Failed to retrieve assigned allocation', 'RETRIEVAL_FAILED', 500);
        }

        $message = "Successfully assigned allocation {$updatedAllocation['ip']}:{$updatedAllocation['port']} to your server";

        // Emit event
        global $eventManager;
        $eventManager->emit(
            ServerEvent::onServerAllocationCreated(),
            ['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'allocation_id' => $updatedAllocation['id']]
        );

        return ApiResponse::success([
            'assigned_allocation' => $updatedAllocation,
            'message' => $message,
        ], $message);
    }
}
