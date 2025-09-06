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
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerAllocationController
{
    /**
     * Get server allocations.
     */
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
