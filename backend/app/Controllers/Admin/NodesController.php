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
use App\Chat\Activity;
use App\Chat\Location;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\NodesEvent;
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
        new OA\Property(
            property: 'public_ip_v4',
            type: 'string',
            nullable: true,
            description: 'Public IPv4 address reachable by clients. Required when using the subdomain manager.'
        ),
        new OA\Property(
            property: 'public_ip_v6',
            type: 'string',
            nullable: true,
            description: 'Public IPv6 address reachable by clients.'
        ),
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
        new OA\Property(
            property: 'public_ip_v4',
            type: 'string',
            nullable: true,
            description: 'Public IPv4 address reachable by clients. Set this if you plan to use the subdomain manager.',
            example: '203.0.113.42'
        ),
        new OA\Property(
            property: 'public_ip_v6',
            type: 'string',
            nullable: true,
            description: 'Public IPv6 address reachable by clients.',
            example: '2001:db8::10'
        ),
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
        new OA\Property(
            property: 'public_ip_v4',
            type: 'string',
            nullable: true,
            description: 'Public IPv4 address reachable by clients. Set this if you plan to use the subdomain manager.'
        ),
        new OA\Property(
            property: 'public_ip_v6',
            type: 'string',
            nullable: true,
            description: 'Public IPv6 address reachable by clients.'
        ),
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
            new OA\Parameter(
                name: 'location_id',
                in: 'query',
                description: 'Location ID to filter nodes by',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'exclude_node_id',
                in: 'query',
                description: 'Node ID to exclude from results (useful for transfer destinations)',
                required: false,
                schema: new OA\Schema(type: 'integer')
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
        $locationId = $request->query->get('location_id', null);
        $locationId = $locationId ? (int) $locationId : null;
        $excludeNodeId = $request->query->get('exclude_node_id', null);
        $excludeNodeId = $excludeNodeId ? (int) $excludeNodeId : null;

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
        $nodes = Node::searchNodes(page: $page, limit: $limit, search: $search, locationId: $locationId, excludeNodeId: $excludeNodeId);
        $total = Node::getNodesCount(search: $search, locationId: $locationId, excludeNodeId: $excludeNodeId);

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

        $data['public_ip_v4'] = isset($data['public_ip_v4']) ? trim((string) $data['public_ip_v4']) : null;
        $data['public_ip_v6'] = isset($data['public_ip_v6']) ? trim((string) $data['public_ip_v6']) : null;

        if ($data['public_ip_v4'] === '') {
            $data['public_ip_v4'] = null;
        }
        if ($data['public_ip_v6'] === '') {
            $data['public_ip_v6'] = null;
        }

        if ($data['public_ip_v4'] !== null && !filter_var($data['public_ip_v4'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return ApiResponse::error('public_ip_v4 must be a valid IPv4 address', 'NODE_VALIDATION_FAILED', 400);
        }
        if ($data['public_ip_v6'] !== null && !filter_var($data['public_ip_v6'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            return ApiResponse::error('public_ip_v6 must be a valid IPv6 address', 'NODE_VALIDATION_FAILED', 400);
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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                NodesEvent::onNodeCreated(),
                [
                    'node' => $node,
                    'created_by' => $admin,
                ]
            );
        }

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

        if (array_key_exists('public_ip_v4', $data)) {
            $data['public_ip_v4'] = $data['public_ip_v4'] === null ? null : trim((string) $data['public_ip_v4']);
            if ($data['public_ip_v4'] === '') {
                $data['public_ip_v4'] = null;
            }
            if ($data['public_ip_v4'] !== null && !filter_var($data['public_ip_v4'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                return ApiResponse::error('public_ip_v4 must be a valid IPv4 address', 'NODE_VALIDATION_FAILED', 400);
            }
        }

        if (array_key_exists('public_ip_v6', $data)) {
            $data['public_ip_v6'] = $data['public_ip_v6'] === null ? null : trim((string) $data['public_ip_v6']);
            if ($data['public_ip_v6'] === '') {
                $data['public_ip_v6'] = null;
            }
            if ($data['public_ip_v6'] !== null && !filter_var($data['public_ip_v6'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                return ApiResponse::error('public_ip_v6 must be a valid IPv6 address', 'NODE_VALIDATION_FAILED', 400);
            }
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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                NodesEvent::onNodeUpdated(),
                [
                    'node' => $node,
                    'updated_data' => $data,
                    'updated_by' => $admin,
                ]
            );
        }

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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                NodesEvent::onNodeDeleted(),
                [
                    'node' => $node,
                    'deleted_by' => $admin,
                ]
            );
        }

        return ApiResponse::success([], 'Node deleted successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/nodes/{id}/diagnostics',
        summary: 'Generate node diagnostics bundle',
        description: 'Fetches diagnostics output from the Wings daemon. Returns plain-text content by default or an uploaded report URL when format=url.',
        tags: ['Admin - Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'include_endpoints',
                in: 'query',
                description: 'Include HTTP endpoint metadata',
                required: false,
                schema: new OA\Schema(type: 'boolean')
            ),
            new OA\Parameter(
                name: 'include_logs',
                in: 'query',
                description: 'Include daemon logs in the report',
                required: false,
                schema: new OA\Schema(type: 'boolean')
            ),
            new OA\Parameter(
                name: 'log_lines',
                in: 'query',
                description: 'Number of log lines to include (1-500)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 500)
            ),
            new OA\Parameter(
                name: 'format',
                in: 'query',
                description: 'Response format: raw text or uploaded URL',
                required: false,
                schema: new OA\Schema(type: 'string', enum: ['text', 'url'])
            ),
            new OA\Parameter(
                name: 'upload_api_url',
                in: 'query',
                description: 'Override upload endpoint when requesting format=url',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Diagnostics generated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'diagnostics',
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'format', type: 'string', enum: ['text', 'url']),
                                new OA\Property(property: 'content', type: 'string', nullable: true, description: 'Plain-text diagnostics content when format=text'),
                                new OA\Property(property: 'url', type: 'string', nullable: true, description: 'Diagnostics report URL when format=url'),
                                new OA\Property(property: 'include_endpoints', type: 'boolean'),
                                new OA\Property(property: 'include_logs', type: 'boolean'),
                                new OA\Property(property: 'log_lines', type: 'integer', nullable: true),
                            ]
                        ),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid query parameters'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to generate diagnostics'),
        ]
    )]
    public function diagnostics(Request $request, int $id): Response
    {
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $includeEndpoints = $request->query->has('include_endpoints')
            ? $request->query->getBoolean('include_endpoints')
            : null;
        $includeLogs = $request->query->has('include_logs')
            ? $request->query->getBoolean('include_logs')
            : null;

        $logLines = null;
        if ($request->query->has('log_lines')) {
            $logLines = (int) $request->query->get('log_lines');
            if ($logLines < 1 || $logLines > 500) {
                return ApiResponse::error('log_lines must be between 1 and 500', 'INVALID_LOG_LINES', 400);
            }
        }

        $format = $request->query->get('format');
        if ($format !== null && !in_array(strtolower((string) $format), ['text', 'url'], true)) {
            return ApiResponse::error('Invalid format provided', 'INVALID_FORMAT', 400);
        }
        $normalizedFormat = $format ? strtolower((string) $format) : 'text';

        $uploadApiUrl = $request->query->get('upload_api_url');
        if ($uploadApiUrl && $normalizedFormat !== 'url') {
            return ApiResponse::error('upload_api_url can only be used when format=url', 'INVALID_UPLOAD_API_URL', 400);
        }

        try {
            $wings = new Wings(
                $node['fqdn'],
                (int) $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $diagnostics = $wings->getSystem()->getDiagnostics(
                $includeEndpoints,
                $includeLogs,
                $logLines,
                $normalizedFormat,
                $uploadApiUrl ?: null
            );

            $payload = [
                'format' => $normalizedFormat,
                'content' => is_string($diagnostics) ? $diagnostics : null,
                'url' => is_array($diagnostics) ? ($diagnostics['url'] ?? null) : null,
                'include_endpoints' => $includeEndpoints ?? false,
                'include_logs' => $includeLogs ?? false,
                'log_lines' => $logLines,
            ];

            if ($normalizedFormat === 'url' && $payload['url'] === null) {
                return ApiResponse::error('Failed to upload diagnostics report', 'DIAGNOSTICS_UPLOAD_FAILED', 500);
            }

            return ApiResponse::success([
                'diagnostics' => $payload,
            ], 'Diagnostics generated successfully', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to generate diagnostics for node ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to generate diagnostics', 'NODE_DIAGNOSTICS_FAILED', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/nodes/{id}/self-update',
        summary: 'Trigger Wings self-update',
        description: 'Initiate a self-update on the Wings daemon either via GitHub release channel or a custom download URL.',
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
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'source', type: 'string', description: 'Update source (e.g. github, url)'),
                    new OA\Property(property: 'version', type: 'string', description: 'Specific Wings version to install'),
                    new OA\Property(property: 'url', type: 'string', description: 'Direct download URL for installing Wings'),
                    new OA\Property(property: 'repo_owner', type: 'string', description: 'GitHub repository owner (when source=github)'),
                    new OA\Property(property: 'repo_name', type: 'string', description: 'GitHub repository name (when source=github)'),
                    new OA\Property(property: 'sha256', type: 'string', description: 'SHA256 checksum for validating download'),
                    new OA\Property(property: 'force', type: 'boolean', description: 'Force reinstall even if Wings is up-to-date'),
                    new OA\Property(property: 'disable_checksum', type: 'boolean', description: 'Skip checksum validation of the downloaded artifact'),
                ],
                additionalProperties: false
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Self-update already applied or not required',
                content: new OA\JsonContent(type: 'object')
            ),
            new OA\Response(
                response: 202,
                description: 'Self-update accepted and queued',
                content: new OA\JsonContent(type: 'object')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid payload or updates disabled'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions or API updates disabled'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Failed to trigger self-update'),
        ]
    )]
    public function triggerSelfUpdate(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (!is_array($payload)) {
            return ApiResponse::error('Request payload must be an object', 'INVALID_PAYLOAD', 400);
        }

        $allowedKeys = [
            'source',
            'version',
            'url',
            'repo_owner',
            'repo_name',
            'sha256',
            'force',
            'disable_checksum',
        ];
        $booleanKeys = ['force', 'disable_checksum'];
        $cleanPayload = [];
        foreach ($allowedKeys as $key) {
            if (!array_key_exists($key, $payload)) {
                continue;
            }

            $value = $payload[$key];
            if (in_array($key, $booleanKeys, true)) {
                $cleanPayload[$key] = (bool) $value;
                continue;
            }

            if (is_string($value)) {
                $trimmed = trim($value);
                if ($trimmed === '') {
                    continue;
                }
                $cleanPayload[$key] = $trimmed;
                continue;
            }

            $cleanPayload[$key] = $value;
        }

        if (!isset($cleanPayload['source']) || !is_string($cleanPayload['source'])) {
            $cleanPayload['source'] = 'github';
        }

        try {
            $wings = new Wings(
                $node['fqdn'],
                (int) $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30
            );

            $response = $wings->getSystem()->triggerSelfUpdate($cleanPayload, true);

            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'trigger_node_self_update',
                'context' => 'Triggered Wings self-update for node: ' . $node['name'],
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success([
                'result' => $response,
            ], 'Self-update requested successfully', 202);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to trigger self-update for node ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to trigger self-update', 'NODE_SELF_UPDATE_FAILED', 500);
        }
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

    #[OA\Post(
        path: '/api/admin/nodes/{id}/terminal/exec',
        summary: 'Execute command on node host',
        description: 'Execute a command on the node host system via Wings terminal API. Requires system.host_terminal.enabled=true in Wings config.',
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
            content: new OA\JsonContent(
                type: 'object',
                required: ['command'],
                properties: [
                    new OA\Property(property: 'command', type: 'string', description: 'Command to execute on the host'),
                    new OA\Property(property: 'timeout_seconds', type: 'integer', description: 'Timeout in seconds (default: 60)', minimum: 1, maximum: 300),
                    new OA\Property(property: 'working_directory', type: 'string', description: 'Working directory for command execution'),
                    new OA\Property(
                        property: 'environment',
                        type: 'object',
                        description: 'Environment variables for the command',
                        additionalProperties: true
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Command executed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'exit_code', type: 'integer', description: 'Command exit code'),
                        new OA\Property(property: 'stdout', type: 'string', description: 'Standard output'),
                        new OA\Property(property: 'stderr', type: 'string', description: 'Standard error'),
                        new OA\Property(property: 'timed_out', type: 'boolean', description: 'Whether command timed out'),
                        new OA\Property(property: 'duration_ms', type: 'integer', description: 'Execution duration in milliseconds'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid payload or missing command'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions or host terminal disabled'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 504, description: 'Gateway Timeout - Command execution timed out'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to execute command'),
        ]
    )]
    public function executeTerminalCommand(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (!is_array($payload) || empty($payload['command']) || !is_string($payload['command'])) {
            return ApiResponse::error('Command is required and must be a string', 'MISSING_COMMAND', 400);
        }

        $command = trim($payload['command']);
        if ($command === '') {
            return ApiResponse::error('Command cannot be empty', 'EMPTY_COMMAND', 400);
        }

        $timeoutSeconds = isset($payload['timeout_seconds']) ? (int) $payload['timeout_seconds'] : null;
        if ($timeoutSeconds !== null && ($timeoutSeconds < 1 || $timeoutSeconds > 300)) {
            return ApiResponse::error('Timeout must be between 1 and 300 seconds', 'INVALID_TIMEOUT', 400);
        }

        $workingDirectory = isset($payload['working_directory']) && is_string($payload['working_directory'])
            ? trim($payload['working_directory'])
            : null;

        $environment = isset($payload['environment']) && is_array($payload['environment'])
            ? $payload['environment']
            : null;

        try {
            $wings = new Wings(
                $node['fqdn'],
                (int) $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                ($timeoutSeconds ?? 60) + 10 // Add 10s buffer for HTTP timeout
            );

            $result = $wings->getSystem()->executeCommand(
                $command,
                $timeoutSeconds,
                $workingDirectory,
                $environment
            );

            // Log the command execution
            App::getInstance(true)->getLogger()->debug(
                'Host command executed on node ' . $node['name'] . ' by ' . ($admin['username'] ?? 'unknown') .
                ': ' . substr($command, 0, 100) . (strlen($command) > 100 ? '...' : '')
            );

            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'execute_node_terminal_command',
                'context' => 'Executed command on node ' . $node['name'] . ': ' . substr($command, 0, 50),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success($result, 'Command executed successfully', 200);
        } catch (\Throwable $e) {
            $errorMessage = $e->getMessage();
            App::getInstance(true)->getLogger()->error(
                'Failed to execute terminal command on node ' . $id . ': ' . $errorMessage
            );

            // Check if it's a timeout
            if (str_contains($errorMessage, 'timeout') || str_contains($errorMessage, '504')) {
                return ApiResponse::error('Command execution timed out', 'COMMAND_TIMEOUT', 504);
            }

            // Check if host terminal is disabled
            if (str_contains($errorMessage, 'forbidden') || str_contains($errorMessage, '403')) {
                return ApiResponse::error(
                    'Host terminal is disabled on this node. Enable system.host_terminal.enabled in Wings config.',
                    'HOST_TERMINAL_DISABLED',
                    403
                );
            }

            return ApiResponse::error('Failed to execute command', 'COMMAND_EXECUTION_FAILED', 500);
        }
    }
}
