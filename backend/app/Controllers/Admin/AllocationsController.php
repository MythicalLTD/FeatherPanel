<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\Activity;
use App\Chat\Allocation;
use App\Helpers\ApiResponse;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class AllocationsController
{
    public function index(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 20);
        $search = $request->query->get('search', '');
        $nodeId = $request->query->get('node_id');
        $serverId = $request->query->get('server_id');

        // Validate pagination parameters
        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 20;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $offset = ($page - 1) * $limit;

        // Convert to integers if provided
        $nodeId = $nodeId ? (int) $nodeId : null;
        $serverId = $serverId ? (int) $serverId : null;

        $allocations = Allocation::getAll($search, $nodeId, $serverId, $limit, $offset);
        $total = Allocation::getCount($search, $nodeId, $serverId);
        $totalPages = ceil($total / $limit);

        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'allocations' => $allocations,
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
            'search' => [
                'query' => $search,
                'has_results' => count($allocations) > 0,
            ],
        ], 'Allocations fetched successfully', 200);
    }

    public function show(Request $request, int $id): Response
    {
        $allocation = Allocation::getWithNodeAndServer($id);
        if (!$allocation) {
            return ApiResponse::error('Allocation not found', 'ALLOCATION_NOT_FOUND', 404);
        }

        return ApiResponse::success(['allocation' => $allocation], 'Allocation fetched successfully', 200);
    }

    public function create(Request $request): Response
    {
        $logger = App::getInstance(true)->getLogger();
        $admin = $request->get('user');
        $data = json_decode($request->getContent(), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        // Validate required fields
        $requiredFields = ['node_id', 'ip', 'port'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Validate data types
        if (!is_numeric($data['node_id']) || (int) $data['node_id'] <= 0) {
            return ApiResponse::error('Node ID must be a positive number', 'INVALID_NODE_ID', 400);
        }

        if (!is_string($data['ip']) || !filter_var($data['ip'], FILTER_VALIDATE_IP)) {
            return ApiResponse::error('Invalid IP address format', 'INVALID_IP_FORMAT', 400);
        }

        // Check if node exists
        $nodeId = (int) $data['node_id'];
        if (!Node::getNodeById($nodeId)) {
            return ApiResponse::error('Node does not exist', 'NODE_NOT_FOUND', 400);
        }

        // Handle port range
        $portInput = $data['port'];
        $ports = [];

        if (is_string($portInput) && strpos($portInput, '-') !== false) {
            // Handle port range (e.g., "25565-25700")
            $portRange = explode('-', $portInput);
            if (count($portRange) !== 2) {
                return ApiResponse::error('Invalid port range format. Use format: start-end (e.g., 25565-25700)', 'INVALID_PORT_RANGE', 400);
            }

            $startPort = (int) trim($portRange[0]);
            $endPort = (int) trim($portRange[1]);

            if ($startPort < 1 || $startPort > 65535 || $endPort < 1 || $endPort > 65535) {
                return ApiResponse::error('Ports must be between 1 and 65535', 'INVALID_PORT_RANGE', 400);
            }

            if ($startPort > $endPort) {
                return ApiResponse::error('Start port must be less than or equal to end port', 'INVALID_PORT_RANGE', 400);
            }

            // Limit range to prevent abuse (max 1000 ports)
            if (($endPort - $startPort + 1) > 1000) {
                return ApiResponse::error('Port range too large. Maximum 1000 ports allowed per request', 'PORT_RANGE_TOO_LARGE', 400);
            }

            for ($port = $startPort; $port <= $endPort; ++$port) {
                $ports[] = $port;
            }
        } else {
            // Single port
            if (!is_numeric($portInput) || (int) $portInput < 1 || (int) $portInput > 65535) {
                return ApiResponse::error('Port must be a number between 1 and 65535', 'INVALID_PORT', 400);
            }
            $ports[] = (int) $portInput;
        }

        // Validate optional fields
        if (isset($data['server_id'])) {
            if (!is_numeric($data['server_id']) || (int) $data['server_id'] <= 0) {
                return ApiResponse::error('Server ID must be a positive number', 'INVALID_SERVER_ID', 400);
            }
            // Note: Server validation would go here when Server model is available
        }

        if (isset($data['ip_alias']) && !is_string($data['ip_alias'])) {
            return ApiResponse::error('IP alias must be a string', 'INVALID_IP_ALIAS', 400);
        }

        if (isset($data['notes']) && !is_string($data['notes'])) {
            return ApiResponse::error('Notes must be a string', 'INVALID_NOTES', 400);
        }

        // Check for existing allocations and prepare batch data
        $allocationsToCreate = [];
        $existingPorts = [];

        foreach ($ports as $port) {
            if (!Allocation::isUniqueIpPort($nodeId, $data['ip'], $port)) {
                $existingPorts[] = $port;
            } else {
                $allocationData = [
                    'node_id' => $nodeId,
                    'ip' => $data['ip'],
                    'port' => $port,
                    'ip_alias' => $data['ip_alias'] ?? null,
                    'server_id' => $data['server_id'] ?? null,
                    'notes' => $data['notes'] ?? null,
                ];
                $allocationsToCreate[] = $allocationData;
            }
        }

        // If all ports already exist, return error
        if (empty($allocationsToCreate)) {
            return ApiResponse::error('All ports in range already exist for this IP and node', 'ALL_PORTS_EXIST', 400);
        }

        // Create allocations in batch
        $createdIds = Allocation::createBatch($allocationsToCreate);
        if (empty($createdIds)) {
            return ApiResponse::error('Failed to create allocations', 'ALLOCATION_CREATE_FAILED', 400);
        }

        // Get created allocations
        $createdAllocations = [];
        foreach ($createdIds as $id) {
            $allocation = Allocation::getById($id);
            if ($allocation) {
                $createdAllocations[] = $allocation;
            }
        }

        // Prepare response message
        $createdCount = count($createdAllocations);
        $totalRequested = count($ports);
        $skippedCount = count($existingPorts);

        $message = "Created {$createdCount} allocation(s)";
        if ($skippedCount > 0) {
            $message .= " (skipped {$skippedCount} existing)";
        }

        // Log activity
        $context = "Created {$createdCount} allocation(s) for IP {$data['ip']} on node ID {$nodeId}";
        if ($skippedCount > 0) {
            $context .= " (skipped {$skippedCount} existing)";
        }

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'allocation_created',
            'context' => $context,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'allocations' => $createdAllocations,
            'created_count' => $createdCount,
            'total_requested' => $totalRequested,
            'skipped_count' => $skippedCount,
            'existing_ports' => $existingPorts,
        ], $message, 201);
    }

    public function update(Request $request, int $id): Response
    {
        $logger = App::getInstance(true)->getLogger();
        $admin = $request->get('user');
        $data = json_decode($request->getContent(), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        // Check if allocation exists
        $existingAllocation = Allocation::getById($id);
        if (!$existingAllocation) {
            return ApiResponse::error('Allocation not found', 'ALLOCATION_NOT_FOUND', 404);
        }

        // Validate data types for provided fields
        if (isset($data['node_id'])) {
            if (!is_numeric($data['node_id']) || (int) $data['node_id'] <= 0) {
                return ApiResponse::error('Node ID must be a positive number', 'INVALID_NODE_ID', 400);
            }
            if (!Node::getNodeById((int) $data['node_id'])) {
                return ApiResponse::error('Node does not exist', 'NODE_NOT_FOUND', 400);
            }
        }

        if (isset($data['ip'])) {
            if (!is_string($data['ip']) || !filter_var($data['ip'], FILTER_VALIDATE_IP)) {
                return ApiResponse::error('Invalid IP address format', 'INVALID_IP_FORMAT', 400);
            }
        }

        if (isset($data['port'])) {
            if (!is_numeric($data['port']) || (int) $data['port'] < 1 || (int) $data['port'] > 65535) {
                return ApiResponse::error('Port must be a number between 1 and 65535', 'INVALID_PORT', 400);
            }
        }

        if (isset($data['server_id'])) {
            if (!is_numeric($data['server_id']) || (int) $data['server_id'] <= 0) {
                return ApiResponse::error('Server ID must be a positive number', 'INVALID_SERVER_ID', 400);
            }
            // Note: Server validation would go here when Server model is available
        }

        if (isset($data['ip_alias']) && !is_string($data['ip_alias'])) {
            return ApiResponse::error('IP alias must be a string', 'INVALID_IP_ALIAS', 400);
        }

        if (isset($data['notes']) && !is_string($data['notes'])) {
            return ApiResponse::error('Notes must be a string', 'INVALID_NOTES', 400);
        }

        // Check uniqueness if IP or port is being changed
        if (isset($data['ip']) || isset($data['port'])) {
            $nodeId = $data['node_id'] ?? $existingAllocation['node_id'];
            $ip = $data['ip'] ?? $existingAllocation['ip'];
            $port = $data['port'] ?? $existingAllocation['port'];

            if (!Allocation::isUniqueIpPort($nodeId, $ip, (int) $port, $id)) {
                return ApiResponse::error('IP and port combination already exists for this node', 'DUPLICATE_IP_PORT', 400);
            }
        }

        $success = Allocation::update($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update allocation', 'ALLOCATION_UPDATE_FAILED', 400);
        }

        $allocation = Allocation::getById($id);

        // Log activity
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'allocation_updated',
            'context' => "Updated allocation ID {$id}",
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['allocation' => $allocation], 'Allocation updated successfully', 200);
    }

    public function delete(Request $request, int $id): Response
    {
        $logger = App::getInstance(true)->getLogger();
        $admin = $request->get('user');

        $allocation = Allocation::getById($id);
        if (!$allocation) {
            return ApiResponse::error('Allocation not found', 'ALLOCATION_NOT_FOUND', 404);
        }

        $success = Allocation::delete($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete allocation', 'ALLOCATION_DELETE_FAILED', 400);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'allocation_deleted',
            'context' => "Deleted allocation ID {$id} ({$allocation['ip']}:{$allocation['port']})",
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Allocation deleted successfully', 200);
    }

    public function assignToServer(Request $request, int $id): Response
    {
        $logger = App::getInstance(true)->getLogger();
        $admin = $request->get('user');
        $data = json_decode($request->getContent(), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (!isset($data['server_id']) || !is_numeric($data['server_id']) || (int) $data['server_id'] <= 0) {
            return ApiResponse::error('Server ID is required and must be a positive number', 'INVALID_SERVER_ID', 400);
        }

        $allocation = Allocation::getById($id);
        if (!$allocation) {
            return ApiResponse::error('Allocation not found', 'ALLOCATION_NOT_FOUND', 404);
        }

        $serverId = (int) $data['server_id'];
        // Note: Server validation would go here when Server model is available

        $success = Allocation::assignToServer($id, $serverId);
        if (!$success) {
            return ApiResponse::error('Failed to assign allocation to server', 'ASSIGNMENT_FAILED', 400);
        }

        $updatedAllocation = Allocation::getById($id);

        // Log activity
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'allocation_assigned',
            'context' => "Assigned allocation ID {$id} to server ID {$serverId}",
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['allocation' => $updatedAllocation], 'Allocation assigned to server successfully', 200);
    }

    public function unassignFromServer(Request $request, int $id): Response
    {
        $logger = App::getInstance(true)->getLogger();
        $admin = $request->get('user');

        $allocation = Allocation::getById($id);
        if (!$allocation) {
            return ApiResponse::error('Allocation not found', 'ALLOCATION_NOT_FOUND', 404);
        }

        if (!$allocation['server_id']) {
            return ApiResponse::error('Allocation is not assigned to any server', 'NOT_ASSIGNED', 400);
        }

        $success = Allocation::unassignFromServer($id);
        if (!$success) {
            return ApiResponse::error('Failed to unassign allocation from server', 'UNASSIGNMENT_FAILED', 400);
        }

        $updatedAllocation = Allocation::getById($id);

        // Log activity
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'allocation_unassigned',
            'context' => "Unassigned allocation ID {$id} from server ID {$allocation['server_id']}",
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['allocation' => $updatedAllocation], 'Allocation unassigned from server successfully', 200);
    }

    public function getAvailable(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);

        // Validate pagination parameters
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

        $allocations = Allocation::getAvailable($limit, $offset);
        $total = Allocation::getAvailableCount();

        return ApiResponse::success([
            'allocations' => $allocations,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
            ],
        ], 'Available allocations fetched successfully', 200);
    }
}
