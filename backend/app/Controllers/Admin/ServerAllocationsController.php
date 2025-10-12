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
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\Allocation;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerAllocationsController
{
    /**
     * Get server allocations (Admin).
     */
    #[OA\Get(
        path: '/api/admin/servers/{serverId}/allocations',
        summary: 'Get server allocations (Admin)',
        description: 'Retrieve all allocations assigned to a specific server.',
        tags: ['Admin - Server Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'serverId',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server allocations retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean'),
                        new OA\Property(property: 'data', type: 'object',
                            properties: [
                                new OA\Property(property: 'server', type: 'object'),
                                new OA\Property(property: 'allocations', type: 'array', items: new OA\Items(type: 'object')),
                            ]
                        ),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Server not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function getServerAllocations(Request $request, int $serverId): Response
    {
        try {
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
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch server allocations: ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch server allocations', 'FETCH_FAILED', 500);
        }
    }

    /**
     * Assign allocation to server (Admin).
     */
    #[OA\Post(
        path: '/api/admin/servers/{serverId}/allocations',
        summary: 'Assign allocation to server (Admin)',
        description: 'Assign a specific allocation to a server.',
        tags: ['Admin - Server Allocations'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'allocation_id', type: 'integer', description: 'Allocation ID to assign'),
                ]
            )
        ),
        parameters: [
            new OA\Parameter(
                name: 'serverId',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Allocation assigned successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean'),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(property: 'data', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 404, description: 'Server or allocation not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function assignAllocation(Request $request, int $serverId): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            $allocationId = $data['allocation_id'] ?? null;

            if (!$allocationId) {
                return ApiResponse::error('Allocation ID is required', 'MISSING_ALLOCATION_ID', 400);
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

            // Check if allocation is already assigned
            if ($allocation['server_id'] !== null && (int) $allocation['server_id'] !== 0) {
                return ApiResponse::error('Allocation is already assigned to another server', 'ALLOCATION_IN_USE', 400);
            }

            // Check allocation limit
            $currentAllocations = count(Allocation::getByServerId($serverId));
            $allocationLimit = (int) ($server['allocation_limit'] ?? 100);

            if ($currentAllocations >= $allocationLimit) {
                return ApiResponse::error('Allocation limit reached', 'ALLOCATION_LIMIT_REACHED', 400);
            }

            // Assign the allocation to the server
            $success = Allocation::assignToServer($allocationId, $serverId);
            if (!$success) {
                return ApiResponse::error('Failed to assign allocation', 'ASSIGNMENT_FAILED', 500);
            }

            // Get the updated allocation
            $updatedAllocation = Allocation::getById($allocationId);

            // Sync with Wings daemon
            $node = Node::getNodeById($server['node_id']);
            if ($node) {
                try {
                    $wings = new \App\Services\Wings\Wings(
                        $node['fqdn'],
                        $node['daemonListen'],
                        $node['scheme'],
                        $node['daemon_token'],
                        30
                    );

                    $wings->getServer()->syncServer($server['uuid']);
                } catch (\Exception $e) {
                    App::getInstance(true)->getLogger()->error('Failed to sync with Wings: ' . $e->getMessage());
                }
            }

            return ApiResponse::success([
                'allocation' => $updatedAllocation,
                'message' => 'Allocation assigned successfully',
            ], 'Allocation assigned successfully');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to assign allocation: ' . $e->getMessage());

            return ApiResponse::error('Failed to assign allocation', 'ASSIGNMENT_FAILED', 500);
        }
    }

    /**
     * Delete an allocation from the server (Admin).
     */
    #[OA\Delete(
        path: '/api/admin/servers/{serverId}/allocations/{allocationId}',
        summary: 'Delete server allocation (Admin)',
        description: 'Remove an allocation from a server. Cannot delete the primary allocation.',
        tags: ['Admin - Server Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'serverId',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
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
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean'),
                        new OA\Property(property: 'message', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Cannot delete primary allocation'),
            new OA\Response(response: 404, description: 'Server or allocation not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function deleteAllocation(Request $request, int $serverId, int $allocationId): Response
    {
        try {
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

            // Check if this is the primary allocation
            if ((int) $allocation['id'] === (int) $server['allocation_id']) {
                return ApiResponse::error('Cannot delete primary allocation', 'PRIMARY_ALLOCATION_DELETE', 400);
            }

            // Delete the allocation (unassign from server)
            $success = Allocation::delete($allocationId);
            if (!$success) {
                return ApiResponse::error('Failed to delete allocation', 'ALLOCATION_DELETE_FAILED', 500);
            }

            // Sync with Wings daemon
            $node = Node::getNodeById($server['node_id']);
            if ($node) {
                try {
                    $wings = new \App\Services\Wings\Wings(
                        $node['fqdn'],
                        $node['daemonListen'],
                        $node['scheme'],
                        $node['daemon_token'],
                        30
                    );

                    $wings->getServer()->syncServer($server['uuid']);
                } catch (\Exception $e) {
                    App::getInstance(true)->getLogger()->error('Failed to sync with Wings: ' . $e->getMessage());
                }
            }

            return ApiResponse::success([
                'message' => 'Allocation deleted successfully',
                'deleted_allocation_id' => $allocationId,
            ], 'Allocation deleted successfully');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete allocation: ' . $e->getMessage());

            return ApiResponse::error('Failed to delete allocation', 'DELETE_FAILED', 500);
        }
    }

    /**
     * Set an allocation as primary for the server (Admin).
     */
    #[OA\Post(
        path: '/api/admin/servers/{serverId}/allocations/{allocationId}/primary',
        summary: 'Set primary allocation (Admin)',
        description: 'Set a specific allocation as the primary allocation for the server.',
        tags: ['Admin - Server Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'serverId',
                in: 'path',
                description: 'Server ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
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
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean'),
                        new OA\Property(property: 'message', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 404, description: 'Server or allocation not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function setPrimaryAllocation(Request $request, int $serverId, int $allocationId): Response
    {
        try {
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

            // Sync with Wings daemon
            $node = Node::getNodeById($server['node_id']);
            if ($node) {
                try {
                    $wings = new \App\Services\Wings\Wings(
                        $node['fqdn'],
                        $node['daemonListen'],
                        $node['scheme'],
                        $node['daemon_token'],
                        30
                    );

                    $wings->getServer()->syncServer($server['uuid']);
                } catch (\Exception $e) {
                    App::getInstance(true)->getLogger()->error('Failed to sync with Wings: ' . $e->getMessage());
                }
            }

            return ApiResponse::success([
                'message' => 'Primary allocation updated successfully',
                'new_primary_allocation_id' => $allocationId,
            ], 'Primary allocation updated successfully');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to set primary allocation: ' . $e->getMessage());

            return ApiResponse::error('Failed to set primary allocation', 'UPDATE_FAILED', 500);
        }
    }
}

