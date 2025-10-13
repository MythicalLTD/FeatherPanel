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

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\Allocation;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\ServerAllocationEvent;

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
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerAllocationEvent::onServerAllocationDeleted(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                    'allocation_id' => $allocationId,
                ]
            );
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Get updated server data
        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;
        try {
            $wings = new \App\Services\Wings\Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            $response = $wings->getServer()->syncServer($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                if ($response->getStatusCode() === 400) {
                    return ApiResponse::error('Invalid server configuration: ' . $error, 'INVALID_SERVER_CONFIG', 400);
                } elseif ($response->getStatusCode() === 401) {
                    return ApiResponse::error('Unauthorized access to Wings daemon', 'WINGS_UNAUTHORIZED', 401);
                } elseif ($response->getStatusCode() === 403) {
                    return ApiResponse::error('Forbidden access to Wings daemon', 'WINGS_FORBIDDEN', 403);
                } elseif ($response->getStatusCode() === 422) {
                    return ApiResponse::error('Invalid server data: ' . $error, 'INVALID_SERVER_DATA', 422);
                }

                return ApiResponse::error('Failed to send power action to Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send power action to Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to send power action to Wings: ' . $e->getMessage(), 'FAILED_TO_SEND_POWER_ACTION_TO_WINGS', 500);
        }
        // Log activity
        $this->logActivity($server, $node, 'allocation_deleted', [
            'allocation_ip' => $allocation['ip'],
            'allocation_port' => $allocation['port'],
        ], $user);

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
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerAllocationEvent::onServerAllocationSetPrimary(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                    'allocation_id' => $allocationId,
                ]
            );
        }

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Get updated server data
        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;
        try {
            $wings = new \App\Services\Wings\Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            $response = $wings->getServer()->syncServer($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                if ($response->getStatusCode() === 400) {
                    return ApiResponse::error('Invalid server configuration: ' . $error, 'INVALID_SERVER_CONFIG', 400);
                } elseif ($response->getStatusCode() === 401) {
                    return ApiResponse::error('Unauthorized access to Wings daemon', 'WINGS_UNAUTHORIZED', 401);
                } elseif ($response->getStatusCode() === 403) {
                    return ApiResponse::error('Forbidden access to Wings daemon', 'WINGS_FORBIDDEN', 403);
                } elseif ($response->getStatusCode() === 422) {
                    return ApiResponse::error('Invalid server data: ' . $error, 'INVALID_SERVER_DATA', 422);
                }

                return ApiResponse::error('Failed to send power action to Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }
            // Log activity
            $this->logActivity($server, $node, 'allocation_primary_set', [
                'allocation_ip' => $allocation['ip'],
                'allocation_port' => $allocation['port'],
            ], $user);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send power action to Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to send power action to Wings: ' . $e->getMessage(), 'FAILED_TO_SEND_POWER_ACTION_TO_WINGS', 500);
        }

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

        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Get updated server data
        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;
        try {
            $wings = new \App\Services\Wings\Wings(
                $host,
                $port,
                $scheme,
                $token,
                $timeout
            );

            $response = $wings->getServer()->syncServer($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                if ($response->getStatusCode() === 400) {
                    return ApiResponse::error('Invalid server configuration: ' . $error, 'INVALID_SERVER_CONFIG', 400);
                } elseif ($response->getStatusCode() === 401) {
                    return ApiResponse::error('Unauthorized access to Wings daemon', 'WINGS_UNAUTHORIZED', 401);
                } elseif ($response->getStatusCode() === 403) {
                    return ApiResponse::error('Forbidden access to Wings daemon', 'WINGS_FORBIDDEN', 403);
                } elseif ($response->getStatusCode() === 422) {
                    return ApiResponse::error('Invalid server data: ' . $error, 'INVALID_SERVER_DATA', 422);
                }

                return ApiResponse::error('Failed to send power action to Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to send power action to Wings: ' . $e->getMessage());

            return ApiResponse::error('Failed to send power action to Wings: ' . $e->getMessage(), 'FAILED_TO_SEND_POWER_ACTION_TO_WINGS', 500);
        }
        // Log activity
        $this->logActivity($server, $node, 'allocation_auto_allocated', [
            'allocation_ip' => $updatedAllocation['ip'],
            'allocation_port' => $updatedAllocation['port'],
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerAllocationCreated(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                    'allocation_id' => $updatedAllocation['id'],
                ]
            );
        }

        return ApiResponse::success([
            'assigned_allocation' => $updatedAllocation,
            'message' => $message,
        ], $message);
    }

    /**
     * Helper method to log server activity.
     */
    private function logActivity(array $server, array $node, string $event, array $metadata, array $user): void
    {
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'],
            'ip' => $user['last_ip'],
            'event' => $event,
            'metadata' => json_encode($metadata),
        ]);
    }
}
