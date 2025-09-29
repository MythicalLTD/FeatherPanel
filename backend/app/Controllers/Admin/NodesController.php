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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Node;
use App\Chat\Activity;
use App\Chat\Location;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'Node',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Node ID'),
        new OA\Property(property: 'uuid', type: 'string', description: 'Node UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'Node name'),
        new OA\Property(property: 'fqdn', type: 'string', description: 'Fully qualified domain name'),
        new OA\Property(property: 'location_id', type: 'integer', description: 'Location ID'),
        new OA\Property(property: 'daemon_token_id', type: 'string', description: 'Daemon token ID'),
        new OA\Property(property: 'daemon_token', type: 'string', description: 'Daemon authentication token'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'NodePagination',
    type: 'object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
        new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
        new OA\Property(property: 'total_records', type: 'integer', description: 'Total number of records'),
        new OA\Property(property: 'total_pages', type: 'integer', description: 'Total number of pages'),
        new OA\Property(property: 'has_next', type: 'boolean', description: 'Whether there is a next page'),
        new OA\Property(property: 'has_prev', type: 'boolean', description: 'Whether there is a previous page'),
        new OA\Property(property: 'from', type: 'integer', description: 'Starting record number'),
        new OA\Property(property: 'to', type: 'integer', description: 'Ending record number'),
    ]
)]
#[OA\Schema(
    schema: 'NodeCreate',
    type: 'object',
    required: ['name', 'fqdn', 'location_id'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Node name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'fqdn', type: 'string', description: 'Fully qualified domain name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'location_id', type: 'integer', description: 'Location ID', minimum: 1),
    ]
)]
#[OA\Schema(
    schema: 'NodeUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Node name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'fqdn', type: 'string', description: 'Fully qualified domain name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'location_id', type: 'integer', description: 'Location ID', minimum: 1),
        new OA\Property(property: 'uuid', type: 'string', description: 'Node UUID (must be valid UUID format)'),
    ]
)]
class NodesController
{
    #[OA\Get(
        path: '/api/admin/nodes',
        summary: 'Get all nodes',
        description: 'Retrieve a paginated list of all nodes with optional search functionality.',
        tags: ['Admin - Nodes'],
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
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Search term to filter nodes by name or FQDN',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Nodes retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'nodes', type: 'array', items: new OA\Items(ref: '#/components/schemas/Node')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/NodePagination'),
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
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');

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
        $nodes = Node::searchNodes($page, $limit, $search);
        $total = Node::getNodesCount($search);

        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'nodes' => $nodes,
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
                'has_results' => count($nodes) > 0,
            ],
        ], 'Nodes fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/nodes/{id}',
        summary: 'Get node by ID',
        description: 'Retrieve a specific node by its ID.',
        tags: ['Admin - Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Node retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'node', ref: '#/components/schemas/Node'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid node ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        return ApiResponse::success(['node' => $node], 'Node fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/nodes',
        summary: 'Create new node',
        description: 'Create a new node with name, FQDN, and location. Automatically generates UUID and daemon tokens. Validates location existence and ensures UUID uniqueness.',
        tags: ['Admin - Nodes'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/NodeCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Node created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'node', ref: '#/components/schemas/Node'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, validation errors, location not found, or UUID already exists'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create node'),
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
        $requiredFields = ['name', 'fqdn', 'location_id'];
        $errors = Node::validateNodeData($data, $requiredFields);
        if (!empty($errors)) {
            return ApiResponse::error(implode('; ', $errors), 'NODE_VALIDATION_FAILED', 400);
        }
        // Generate UUID and tokens for the node
        $data['uuid'] = Node::generateUuid();
        $data['daemon_token_id'] = Node::generateDaemonTokenId();
        $data['daemon_token'] = Node::generateDaemonToken();

        $locationId = $data['location_id'] ?? null;
        if (!$locationId || !is_numeric($locationId) || !Location::getById((int) $locationId)) {
            return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
        }
        $data['location_id'] = (int) $locationId;

        // Check for duplicate UUID
        if (Node::getNodeByUuid($data['uuid'])) {
            return ApiResponse::error('Node with this UUID already exists', 'UUID_ALREADY_EXISTS', 400);
        }

        $nodeId = Node::createNode($data);
        if (!$nodeId) {
            return ApiResponse::error('Failed to create node', 'NODE_CREATE_FAILED', 400);
        }

        $node = Node::getNodeById($nodeId);
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_node',
            'context' => 'Created node: ' . $node['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['node' => $node], 'Node created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/nodes/{id}',
        summary: 'Update node',
        description: 'Update an existing node. Only provided fields will be updated. Validates location existence and UUID format.',
        tags: ['Admin - Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/NodeUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Node updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'node', ref: '#/components/schemas/Node'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, no data provided, validation errors, location not found, or invalid UUID format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update node'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }
        if (isset($data['id'])) {
            unset($data['id']);
        }
        $locationId = $data['location_id'] ?? null;
        if (!$locationId || !is_numeric($locationId) || !Location::getById((int) $locationId)) {
            return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
        }
        $data['location_id'] = (int) $locationId;

        $requiredFields = ['name', 'fqdn', 'location_id'];
        $errors = Node::validateNodeData($data, $requiredFields);
        if (!empty($errors)) {
            return ApiResponse::error(implode('; ', $errors), 'NODE_VALIDATION_FAILED', 400);
        }
        if (isset($data['uuid']) && !Node::isValidUuid($data['uuid'])) {
            return ApiResponse::error('Invalid UUID format', 'INVALID_UUID', 400);
        }
        $success = Node::updateNodeById($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update node', 'NODE_UPDATE_FAILED', 400);
        }
        $node = Node::getNodeById($id);
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_node',
            'context' => 'Updated node: ' . $node['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['node' => $node], 'Node updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/nodes/{id}',
        summary: 'Delete node',
        description: 'Permanently delete a node from the database. This action cannot be undone.',
        tags: ['Admin - Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Node deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid node ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete node'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        // Check if the node has any servers assigned before allowing deletion
        $serversCount = \App\Chat\Server::count(['node_id' => $id]);
        if ($serversCount > 0) {
            return ApiResponse::error('Cannot delete node: there are servers assigned to this node. Please remove or reassign all servers before deleting the node.', 'NODE_HAS_SERVERS', 400);
        }
        $success = Node::hardDeleteNode($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete node', 'NODE_DELETE_FAILED', 400);
        }
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_node',
            'context' => 'Deleted node: ' . $node['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Node deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/nodes/{id}/reset-key',
        summary: 'Reset node daemon tokens',
        description: 'Generate new daemon token ID and daemon token for a node. This invalidates the current tokens and requires the node to be reconfigured with the new tokens.',
        tags: ['Admin - Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Node daemon tokens reset successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'node', ref: '#/components/schemas/Node'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid node ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to reset node tokens'),
        ]
    )]
    public function resetKey(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Generate new daemon tokens
        $data = [
            'daemon_token_id' => Node::generateDaemonTokenId(),
            'daemon_token' => Node::generateDaemonToken(),
        ];

        $success = Node::updateNodeById($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update node tokens', 'NODE_UPDATE_FAILED', 400);
        }

        // Get updated node data
        $updatedNode = Node::getNodeById($id);

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'reset_node_key',
            'context' => 'Reset daemon tokens for node: ' . $node['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['node' => $updatedNode], 'Master daemon reset key generated successfully', 200);
    }
}
