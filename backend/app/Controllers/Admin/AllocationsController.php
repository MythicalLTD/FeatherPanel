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
use App\Chat\Activity;
use App\Chat\Allocation;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\AllocationsEvent;

#[OA\Schema(
    schema: 'Allocation',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Allocation ID'),
        new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID'),
        new OA\Property(property: 'ip', type: 'string', description: 'IP address'),
        new OA\Property(property: 'ip_alias', type: 'string', nullable: true, description: 'IP alias'),
        new OA\Property(property: 'port', type: 'integer', description: 'Port number'),
        new OA\Property(property: 'server_id', type: 'integer', nullable: true, description: 'Assigned server ID'),
        new OA\Property(property: 'notes', type: 'string', nullable: true, description: 'Allocation notes'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'Pagination',
    type: 'object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer'),
        new OA\Property(property: 'per_page', type: 'integer'),
        new OA\Property(property: 'total_records', type: 'integer'),
        new OA\Property(property: 'total_pages', type: 'integer'),
        new OA\Property(property: 'has_next', type: 'boolean'),
        new OA\Property(property: 'has_prev', type: 'boolean'),
        new OA\Property(property: 'from', type: 'integer'),
        new OA\Property(property: 'to', type: 'integer'),
    ]
)]
class AllocationsController
{
    #[OA\Get(
        path: '/api/admin/allocations',
        summary: 'Get all allocations',
        description: 'Retrieve a paginated list of all IP allocations with optional filtering by node, server, and search query.',
        tags: ['Admin - Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of records per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20)
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Search term to filter allocations by IP, port, or notes',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'node_id',
                in: 'query',
                description: 'Filter allocations by node ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'server_id',
                in: 'query',
                description: 'Filter allocations by server ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Allocations retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'allocations', type: 'array', items: new OA\Items(ref: '#/components/schemas/Allocation')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/Pagination'),
                        new OA\Property(property: 'search', type: 'object', properties: [
                            new OA\Property(property: 'query', type: 'string'),
                            new OA\Property(property: 'has_results', type: 'boolean'),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function index(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 20);
        $search = $request->query->get('search', '');
        $notUsed = $request->query->get('not_used', false);
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
        $notUsed = $notUsed ? true : false;

        $allocations = Allocation::getAll($search, $nodeId, $serverId, $limit, $offset, $notUsed);
        $total = Allocation::getCount($search, $nodeId, $serverId, $notUsed);
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

    #[OA\Get(
        path: '/api/admin/allocations/{id}',
        summary: 'Get allocation by ID',
        description: 'Retrieve a specific allocation by its ID with associated node and server information.',
        tags: ['Admin - Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Allocation ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Allocation retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'allocation', ref: '#/components/schemas/Allocation'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Invalid ID format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Allocation not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $allocation = Allocation::getWithNodeAndServer($id);
        if (!$allocation) {
            return ApiResponse::error('Allocation not found', 'ALLOCATION_NOT_FOUND', 404);
        }

        return ApiResponse::success(['allocation' => $allocation], 'Allocation fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/allocations',
        summary: 'Create new allocation(s)',
        description: 'Create one or more IP allocations. Supports single port or port range creation. Port ranges are limited to 1000 ports maximum.',
        tags: ['Admin - Allocations'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['node_id', 'ip', 'port'],
                properties: [
                    new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID where allocation will be created', minimum: 1),
                    new OA\Property(property: 'ip', type: 'string', description: 'IP address for the allocation', example: '192.168.1.100'),
                    new OA\Property(property: 'port', oneOf: [
                        new OA\Schema(type: 'integer', description: 'Single port number', minimum: 1, maximum: 65535),
                        new OA\Schema(type: 'string', description: 'Port range in format start-end', example: '25565-25700'),
                    ]),
                    new OA\Property(property: 'ip_alias', type: 'string', nullable: true, description: 'Optional IP alias'),
                    new OA\Property(property: 'server_id', type: 'integer', nullable: true, description: 'Optional server ID to assign allocation to', minimum: 1),
                    new OA\Property(property: 'notes', type: 'string', nullable: true, description: 'Optional notes for the allocation'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Allocation(s) created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'allocations', type: 'array', items: new OA\Items(ref: '#/components/schemas/Allocation')),
                        new OA\Property(property: 'created_count', type: 'integer', description: 'Number of allocations created'),
                        new OA\Property(property: 'total_requested', type: 'integer', description: 'Total number of ports requested'),
                        new OA\Property(property: 'skipped_count', type: 'integer', description: 'Number of ports skipped (already exist)'),
                        new OA\Property(property: 'existing_ports', type: 'array', items: new OA\Items(type: 'integer'), description: 'List of ports that already existed'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid data or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function create(Request $request): Response
    {
        $logger = App::getInstance(true)->getLogger();
        $admin = $request->get('user');
        $data = json_decode($request->getContent(), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        // Check for invalid fields
        $allowedFields = ['node_id', 'ip', 'ip_alias', 'port', 'server_id', 'notes'];
        $invalidFields = array_diff(array_keys($data), $allowedFields);
        if (!empty($invalidFields)) {
            return ApiResponse::error(
                'Invalid fields provided: ' . implode(', ', $invalidFields) . '. Allowed fields: ' . implode(', ', $allowedFields),
                'INVALID_FIELDS',
                400
            );
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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                AllocationsEvent::onAllocationCreated(),
                [
                    'allocations' => $createdAllocations,
                    'created_count' => count($createdAllocations),
                    'created_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([
            'allocations' => $createdAllocations,
            'created_count' => $createdCount,
            'total_requested' => $totalRequested,
            'skipped_count' => $skippedCount,
            'existing_ports' => $existingPorts,
        ], $message, 201);
    }

    #[OA\Patch(
        path: '/api/admin/allocations/{id}',
        summary: 'Update allocation',
        description: 'Update an existing allocation. Only provided fields will be updated. IP and port combinations must be unique per node.',
        tags: ['Admin - Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Allocation ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID', minimum: 1),
                    new OA\Property(property: 'ip', type: 'string', description: 'IP address', example: '192.168.1.100'),
                    new OA\Property(property: 'port', type: 'integer', description: 'Port number', minimum: 1, maximum: 65535),
                    new OA\Property(property: 'ip_alias', type: 'string', nullable: true, description: 'IP alias'),
                    new OA\Property(property: 'server_id', type: 'integer', nullable: true, description: 'Server ID to assign allocation to', minimum: 1),
                    new OA\Property(property: 'notes', type: 'string', nullable: true, description: 'Allocation notes'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Allocation updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'allocation', ref: '#/components/schemas/Allocation'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid data or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Allocation not found'),
        ]
    )]
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

        // If no data is provided, return the current allocation without updating
        if (empty($data)) {
            return ApiResponse::success(['allocation' => $existingAllocation], 'No changes to update', 200);
        }

        // Check for invalid fields
        $allowedFields = ['node_id', 'ip', 'ip_alias', 'port', 'server_id', 'notes'];
        $invalidFields = array_diff(array_keys($data), $allowedFields);
        if (!empty($invalidFields)) {
            return ApiResponse::error(
                'Invalid fields provided: ' . implode(', ', $invalidFields) . '. Allowed fields: ' . implode(', ', $allowedFields),
                'INVALID_FIELDS',
                400
            );
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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                AllocationsEvent::onAllocationUpdated(),
                [
                    'allocation' => $allocation,
                    'updated_data' => $data,
                    'updated_by' => $admin,
                ]
            );
        }

        return ApiResponse::success(['allocation' => $allocation], 'Allocation updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/allocations/{id}',
        summary: 'Delete allocation',
        description: 'Permanently delete an allocation. This action cannot be undone.',
        tags: ['Admin - Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Allocation ID',
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
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Failed to delete allocation'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Allocation not found'),
        ]
    )]
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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                AllocationsEvent::onAllocationDeleted(),
                [
                    'allocation' => $allocation,
                    'deleted_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([], 'Allocation deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/allocations/{id}/assign',
        summary: 'Assign allocation to server',
        description: 'Assign an unassigned allocation to a specific server.',
        tags: ['Admin - Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Allocation ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['server_id'],
                properties: [
                    new OA\Property(property: 'server_id', type: 'integer', description: 'Server ID to assign allocation to', minimum: 1),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Allocation assigned to server successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'allocation', ref: '#/components/schemas/Allocation'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid server ID or assignment failed'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Allocation not found'),
        ]
    )]
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

    #[OA\Post(
        path: '/api/admin/allocations/{id}/unassign',
        summary: 'Unassign allocation from server',
        description: 'Remove the server assignment from an allocation, making it available for reassignment.',
        tags: ['Admin - Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Allocation ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Allocation unassigned from server successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'allocation', ref: '#/components/schemas/Allocation'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Allocation not assigned or unassignment failed'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Allocation not found'),
        ]
    )]
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

    #[OA\Get(
        path: '/api/admin/allocations/available',
        summary: 'Get available allocations',
        description: 'Retrieve a paginated list of allocations that are not assigned to any server.',
        tags: ['Admin - Allocations'],
        parameters: [
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of records per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 10)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Available allocations retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'allocations', type: 'array', items: new OA\Items(ref: '#/components/schemas/Allocation')),
                        new OA\Property(property: 'pagination', type: 'object', properties: [
                            new OA\Property(property: 'page', type: 'integer'),
                            new OA\Property(property: 'limit', type: 'integer'),
                            new OA\Property(property: 'total', type: 'integer'),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
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
