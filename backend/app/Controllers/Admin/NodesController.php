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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Node;
use App\Cache\Cache;
use App\Chat\Server;
use App\Chat\Activity;
use App\Chat\Location;
use GuzzleHttp\Client;
use App\Chat\Allocation;
use App\Chat\ServerTransfer;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Helpers\WingsUrlHelper;
use App\Helpers\DaemonCapabilities;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\NodesEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\Servers\ServerTransferInitiator;

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
            property: 'daemon_type',
            type: 'string',
            enum: ['featherwings', 'wings_rs'],
            description: 'Node daemon implementation (FeatherWings or Calagopus wings-rs)'
        ),
        new OA\Property(
            property: 'capabilities',
            type: 'object',
            description: 'Feature capability flags for this daemon type',
            additionalProperties: new OA\AdditionalProperties(type: 'boolean')
        ),
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
        new OA\Property(
            property: 'sftp_subdomain',
            type: 'string',
            nullable: true,
            description: 'Custom subdomain for SFTP access (e.g., sftp.node.domain.de). DNS must be configured externally.',
            example: 'sftp.node.domain.de'
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
            property: 'daemon_type',
            type: 'string',
            enum: ['featherwings', 'wings_rs'],
            description: 'Daemon implementation for this node',
            default: 'featherwings'
        ),
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
        new OA\Property(
            property: 'sftp_subdomain',
            type: 'string',
            nullable: true,
            description: 'Optional custom hostname for SFTP connections shown to users.',
            example: 'sftp.node.domain.de'
        ),
        new OA\Property(property: 'id', type: 'integer', nullable: true, description: 'Optional node ID (useful for migrations from other platforms)'),
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
            property: 'daemon_type',
            type: 'string',
            enum: ['featherwings', 'wings_rs'],
            description: 'Daemon implementation for this node'
        ),
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
        new OA\Property(
            property: 'sftp_subdomain',
            type: 'string',
            nullable: true,
            description: 'Optional custom hostname for SFTP connections shown to users.'
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

        // See enrichNode() for why the daemon token must not appear in list
        // responses (it grants full API access to the node).
        foreach ($nodes as &$node) {
            unset($node['daemon_token'], $node['daemon_token_id']);
        }
        unset($node);

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

        return ApiResponse::success(['node' => $this->enrichNode($node)], 'Node fetched successfully', 200);
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
        $admin = $request->attributes->get('user');
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

        // Handle sftp_subdomain field
        if (array_key_exists('sftp_subdomain', $data)) {
            $data['sftp_subdomain'] = $data['sftp_subdomain'] === null ? null : trim((string) $data['sftp_subdomain']);
            if ($data['sftp_subdomain'] === '') {
                $data['sftp_subdomain'] = null;
            }
            if (!Node::isValidSubdomain($data['sftp_subdomain'])) {
                return ApiResponse::error(
                    'sftp_subdomain must be a valid DNS hostname',
                    'NODE_VALIDATION_FAILED',
                    400
                );
            }
        }

        // Generate UUID and tokens for the node
        $data['uuid'] = Node::generateUuid();
        $data['daemon_token_id'] = Node::generateDaemonTokenId();
        $data['daemon_token'] = Node::generateDaemonToken();

        $data['daemon_type'] = DaemonCapabilities::normalizeType(
            (string) ($data['daemon_type'] ?? DaemonCapabilities::TYPE_FEATHERWINGS)
        );
        $caps = DaemonCapabilities::forType($data['daemon_type']);
        if (!isset($data['daemonBase']) || trim((string) $data['daemonBase']) === '') {
            $data['daemonBase'] = $caps->defaults()['daemon_base'];
        }

        $locationId = $data['location_id'] ?? null;
        if (!$locationId || !is_numeric($locationId)) {
            return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
        }
        $locationRow = Location::getById((int) $locationId);
        if (!$locationRow) {
            return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
        }
        if (($locationRow['type'] ?? 'game') !== 'game') {
            return ApiResponse::error('Location must be a game server location', 'INVALID_LOCATION_TYPE', 400);
        }
        $data['location_id'] = (int) $locationId;

        // Check for duplicate UUID
        if (Node::getNodeByUuid($data['uuid'])) {
            return ApiResponse::error('Node with this UUID already exists', 'UUID_ALREADY_EXISTS', 400);
        }

        // Handle optional ID for migrations
        if (isset($data['id'])) {
            if (!is_int($data['id']) && !ctype_digit((string) $data['id'])) {
                return ApiResponse::error('ID must be an integer', 'INVALID_DATA_TYPE');
            }
            $data['id'] = (int) $data['id'];
            if ($data['id'] < 1) {
                return ApiResponse::error('ID must be a positive integer', 'INVALID_DATA_LENGTH');
            }
            // Check if node with this ID already exists
            if (Node::getNodeById($data['id'])) {
                return ApiResponse::error('Node with this ID already exists', 'DUPLICATE_ID', 400);
            }
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

        return ApiResponse::success(['node' => $this->enrichNode($node)], 'Node created successfully', 201);
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
        $admin = $request->attributes->get('user');
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
        if (array_key_exists('location_id', $data)) {
            $locationId = $data['location_id'];
            if ($locationId === null || $locationId === '' || !is_numeric($locationId)) {
                return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
            }
            $locationRow = Location::getById((int) $locationId);
            if (!$locationRow) {
                return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
            }
            if (($locationRow['type'] ?? 'game') !== 'game') {
                return ApiResponse::error('Location must be a game server location', 'INVALID_LOCATION_TYPE', 400);
            }
            $data['location_id'] = (int) $locationId;
        }

        $errors = Node::validateNodeData($data);
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

        // Handle sftp_subdomain field
        if (array_key_exists('sftp_subdomain', $data)) {
            $data['sftp_subdomain'] = $data['sftp_subdomain'] === null ? null : trim((string) $data['sftp_subdomain']);
            if ($data['sftp_subdomain'] === '') {
                $data['sftp_subdomain'] = null;
            }
            if (!Node::isValidSubdomain($data['sftp_subdomain'])) {
                return ApiResponse::error(
                    'sftp_subdomain must be a valid DNS hostname',
                    'NODE_VALIDATION_FAILED',
                    400
                );
            }
        }

        if (isset($data['uuid']) && !Node::isValidUuid($data['uuid'])) {
            return ApiResponse::error('Invalid UUID format', 'INVALID_UUID', 400);
        }

        if (array_key_exists('daemon_type', $data)) {
            $currentType = DaemonCapabilities::normalizeType(
                (string) ($node['daemon_type'] ?? DaemonCapabilities::TYPE_FEATHERWINGS)
            );
            $requestedType = DaemonCapabilities::normalizeType((string) $data['daemon_type']);
            if ($requestedType !== $currentType) {
                return ApiResponse::error(
                    'Daemon type cannot be changed after the node is created',
                    'DAEMON_TYPE_IMMUTABLE',
                    400
                );
            }
            unset($data['daemon_type']);
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

        return ApiResponse::success(['node' => $this->enrichNode($node)], 'Node updated successfully', 200);
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
        $admin = $request->attributes->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        // Check if the node has any servers assigned before allowing deletion
        $serversCount = Server::count(['node_id' => $id]);
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

        $unsupported = $this->requireFeature($node, DaemonCapabilities::FEATURE_DIAGNOSTICS);
        if ($unsupported !== null) {
            return $unsupported;
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
                30,
                WingsUrlHelper::isBehindProxy($node)
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

    #[OA\Get(
        path: '/api/admin/nodes/{id}/system-logs',
        summary: 'List node system log files',
        description: 'Lists daemon log files via Calagopus GET /api/system/logs.',
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
            new OA\Response(response: 200, description: 'System logs listed successfully'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 501, description: 'Daemon feature unsupported'),
            new OA\Response(response: 500, description: 'Failed to list system logs'),
        ]
    )]
    public function listSystemLogs(Request $request, int $id): Response
    {
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $unsupported = $this->requireFeature($node, DaemonCapabilities::FEATURE_SYSTEM_LOGS);
        if ($unsupported !== null) {
            return $unsupported;
        }

        try {
            $wings = Wings::fromNode($node, 30);
            $logs = $wings->getSystem()->listSystemLogs();

            return ApiResponse::success([
                'logs' => $logs['log_files'] ?? $logs['logs'] ?? $logs,
            ], 'System logs listed successfully', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to list system logs for node ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to list system logs', 'NODE_SYSTEM_LOGS_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/nodes/{id}/system-logs/{file}',
        summary: 'Read a node system log file',
        description: 'Reads a daemon log file via Calagopus GET /api/system/logs/{file}.',
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
                name: 'file',
                in: 'path',
                description: 'Log file name',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'System log file retrieved successfully'),
            new OA\Response(response: 400, description: 'Invalid log file name'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 501, description: 'Daemon feature unsupported'),
            new OA\Response(response: 500, description: 'Failed to read system log'),
        ]
    )]
    public function getSystemLogFile(Request $request, int $id, string $file): Response
    {
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $unsupported = $this->requireFeature($node, DaemonCapabilities::FEATURE_SYSTEM_LOGS);
        if ($unsupported !== null) {
            return $unsupported;
        }

        $file = basename(trim($file));
        if ($file === '' || $file === '.' || $file === '..') {
            return ApiResponse::error('Invalid log file name', 'INVALID_LOG_FILE', 400);
        }

        try {
            $wings = Wings::fromNode($node, 30);
            $content = $wings->getSystem()->getSystemLogFile($file);

            return ApiResponse::success([
                'file' => $file,
                'content' => $content,
            ], 'System log file retrieved successfully', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to read system log for node ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to read system log', 'NODE_SYSTEM_LOG_FAILED', 500);
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
        $admin = $request->attributes->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $unsupported = $this->requireFeature($node, DaemonCapabilities::FEATURE_SELF_UPDATE);
        if ($unsupported !== null) {
            return $unsupported;
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
                30,
                WingsUrlHelper::isBehindProxy($node)
            );

            $caps = DaemonCapabilities::fromNode($node);
            $useCalagopusUpgrade = $caps->isWingsRs();
            $updatePayload = $cleanPayload;

            if ($useCalagopusUpgrade) {
                $mapped = $this->buildCalagopusUpgradePayload($wings, $caps, $cleanPayload);
                if (isset($mapped['error'])) {
                    return ApiResponse::error(
                        (string) $mapped['error'],
                        (string) ($mapped['code'] ?? 'NODE_SELF_UPDATE_FAILED'),
                        (int) ($mapped['status'] ?? 400)
                    );
                }
                $updatePayload = $mapped['payload'];
            }

            $response = $wings->getSystem()->triggerSelfUpdate($updatePayload, true, $useCalagopusUpgrade);

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
        $admin = $request->attributes->get('user');
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

    #[OA\Get(
        path: '/api/admin/nodes/{id}/setup-command',
        summary: 'Get node setup command',
        description: 'Returns install command (step 1) and setup command (step 2) to configure the node. Step 1 installs FeatherWings; step 2 fetches config from the panel and restarts the daemon.',
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
                description: 'Setup commands (install + config)',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'panel_url', type: 'string', description: 'Panel base URL'),
                        new OA\Property(property: 'config_url', type: 'string', description: 'Full URL to fetch config (GET with Wings Bearer token)'),
                        new OA\Property(property: 'install_command', type: 'string', description: 'Step 1: Install FeatherWings on the node (curl get.featherpanel.com/installer.sh)'),
                        new OA\Property(property: 'setup_command', type: 'string', description: 'Step 2: Fetch config and restart FeatherWings'),
                        new OA\Property(property: 'config_path_hint', type: 'string', description: 'Suggested config path on the node (e.g. /etc/featherpanel/config.yml)'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Node not found'),
        ]
    )]
    public function getSetupCommand(Request $request, int $id): Response
    {
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Use Wings remote URL so node setup/config fetch works when APP_URL is behind Cloudflare challenges.
        $panelUrl = \App\Helpers\AppUrlHelper::wingsRemoteUrl();
        $configUrl = $panelUrl . '/api/remote/config';
        $tokenId = $node['daemon_token_id'] ?? '';
        $tokenSecret = $node['daemon_token'] ?? '';
        $bearer = $tokenId . '.' . $tokenSecret;

        $caps = DaemonCapabilities::fromNode($node);
        $configYaml = Node::generateWingsConfigYaml($node, $panelUrl);
        $commands = $caps->buildSetupCommands($configUrl, $bearer, $configYaml);
        $defaults = $caps->defaults();

        $payload = [
            'panel_url' => $panelUrl,
            'config_url' => $configUrl,
            'install_command' => $commands['install_command'],
            'setup_command' => $commands['setup_command'],
            'config_path_hint' => $commands['config_path_hint'],
            'daemon_type' => $caps->getType(),
            'daemon_display_name' => $defaults['display_name'],
            'systemd_unit' => $defaults['systemd_unit'],
            'capabilities' => $caps->toArray(),
        ];
        if (!empty($commands['join_data'])) {
            $payload['join_data'] = $commands['join_data'];
        }

        return ApiResponse::success($payload, 'Setup command retrieved successfully', 200);
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
        $admin = $request->attributes->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $unsupported = $this->requireFeature($node, DaemonCapabilities::FEATURE_HOST_TERMINAL);
        if ($unsupported !== null) {
            return $unsupported;
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
                ($timeoutSeconds ?? 60) + 10, // Add 10s buffer for HTTP timeout
                WingsUrlHelper::isBehindProxy($node)
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

    #[OA\Get(
        path: '/api/admin/nodes/{id}/config',
        summary: 'Get Wings configuration',
        description: 'Retrieve the complete Wings configuration file as raw YAML with all comments preserved.',
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
                description: 'Wings configuration retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'config', type: 'string', description: 'Raw YAML configuration content'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve configuration'),
        ]
    )]
    public function getConfig(Request $request, int $id): Response
    {
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $unsupported = $this->requireFeature($node, DaemonCapabilities::FEATURE_LIVE_CONFIG);
        if ($unsupported !== null) {
            return $unsupported;
        }

        try {
            $wings = new Wings(
                $node['fqdn'],
                (int) $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30,
                WingsUrlHelper::isBehindProxy($node)
            );

            $config = $wings->getConfig()->getConfig();

            return ApiResponse::success([
                'config' => $config,
            ], 'Configuration retrieved successfully', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to retrieve Wings configuration for node ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to retrieve configuration', 'NODE_CONFIG_GET_FAILED', 500);
        }
    }

    #[OA\Put(
        path: '/api/admin/nodes/{id}/config',
        summary: 'Replace Wings configuration',
        description: 'Replace the entire Wings configuration file with new YAML content. All comments and formatting are preserved. Optionally restart Wings after update.',
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
                required: ['config'],
                properties: [
                    new OA\Property(property: 'config', type: 'string', description: 'Complete YAML configuration content'),
                    new OA\Property(property: 'restart', type: 'boolean', description: 'Whether to restart Wings after update', default: false),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Configuration updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'config', type: 'string', description: 'Updated YAML configuration content'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON or missing config'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update configuration'),
        ]
    )]
    public function putConfig(Request $request, int $id): Response
    {
        $admin = $request->attributes->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $unsupported = $this->requireFeature($node, DaemonCapabilities::FEATURE_LIVE_CONFIG);
        if ($unsupported !== null) {
            return $unsupported;
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (!isset($data['config']) || !is_string($data['config'])) {
            return ApiResponse::error('Config is required and must be a string', 'MISSING_CONFIG', 400);
        }

        $restart = isset($data['restart']) ? (bool) $data['restart'] : false;

        try {
            $wings = new Wings(
                $node['fqdn'],
                (int) $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30,
                WingsUrlHelper::isBehindProxy($node)
            );

            // Wings API expects 'content' field, not 'config'
            $result = $wings->getConfig()->putConfig($data['config'], $restart);

            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'update_node_config',
                'context' => 'Updated Wings configuration for node: ' . $node['name'],
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success([
                'config' => $data['config'],
                'result' => $result,
            ], 'Configuration updated successfully', 200);
        } catch (\Throwable $e) {
            $logger = App::getInstance(true)->getLogger();
            $errorMessage = $e->getMessage();

            // Log the full error for debugging
            $logger->error('Failed to update Wings configuration for node ' . $id . ': ' . $errorMessage);
            $logger->debug('Wings config update error details: ' . $errorMessage);

            // Try to extract a user-friendly error message
            $userMessage = 'Failed to update configuration';

            // Check if it's a validation error from Wings
            if (strpos($errorMessage, 'HTTP 400') !== false || strpos($errorMessage, 'Bad Request') !== false) {
                // Extract the actual error from Wings response
                if (preg_match('/\(Response: (.*?)\)/', $errorMessage, $matches)) {
                    $userMessage = 'Invalid configuration: ' . $matches[1];
                } else {
                    $userMessage = 'Invalid configuration. Please check the YAML syntax and try again.';
                }

                return ApiResponse::error($userMessage, 'NODE_CONFIG_UPDATE_FAILED', 400);
            }

            return ApiResponse::error($userMessage . ': ' . $errorMessage, 'NODE_CONFIG_UPDATE_FAILED', 500);
        }
    }

    #[OA\Patch(
        path: '/api/admin/nodes/{id}/config/patch',
        summary: 'Patch Wings configuration values',
        description: 'Update specific configuration values using dot notation (e.g., "api.port", "system.root_directory"). Preserves comments and other values.',
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
                required: ['values'],
                properties: [
                    new OA\Property(
                        property: 'values',
                        type: 'object',
                        description: 'Configuration values to update using dot notation (e.g., {"api.port": 8443, "system.root_directory": "/var/lib/featherpanel"})',
                        additionalProperties: true
                    ),
                    new OA\Property(property: 'restart', type: 'boolean', description: 'Whether to restart Wings after update', default: false),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Configuration patched successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'result', type: 'object', description: 'Patch operation result'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON or missing values'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to patch configuration'),
        ]
    )]
    public function patchConfig(Request $request, int $id): Response
    {
        $admin = $request->attributes->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $unsupported = $this->requireFeature($node, DaemonCapabilities::FEATURE_LIVE_CONFIG);
        if ($unsupported !== null) {
            return $unsupported;
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (!isset($data['values']) || !is_array($data['values'])) {
            return ApiResponse::error('Values is required and must be an object', 'MISSING_VALUES', 400);
        }

        if (empty($data['values'])) {
            return ApiResponse::error('Values object cannot be empty', 'EMPTY_VALUES', 400);
        }

        $restart = isset($data['restart']) ? (bool) $data['restart'] : false;

        try {
            $wings = new Wings(
                $node['fqdn'],
                (int) $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30,
                WingsUrlHelper::isBehindProxy($node)
            );

            // Wings API expects 'updates' field in patchConfig, but we accept 'values' from frontend
            $result = $wings->getConfig()->patchConfig($data['values'], $restart);

            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'patch_node_config',
                'context' => 'Patched Wings configuration for node: ' . $node['name'],
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success([
                'result' => $result,
            ], 'Configuration patched successfully', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to patch Wings configuration for node ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to patch configuration', 'NODE_CONFIG_PATCH_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/nodes/{id}/config/schema',
        summary: 'Get Wings configuration schema',
        description: 'Retrieve a schema describing all configurable fields in the Wings configuration, useful for building GUIs.',
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
                description: 'Configuration schema retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'schema', type: 'object', description: 'Configuration schema'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve schema'),
        ]
    )]
    public function getConfigSchema(Request $request, int $id): Response
    {
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $unsupported = $this->requireFeature($node, DaemonCapabilities::FEATURE_LIVE_CONFIG);
        if ($unsupported !== null) {
            return $unsupported;
        }

        try {
            $wings = new Wings(
                $node['fqdn'],
                (int) $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                30,
                WingsUrlHelper::isBehindProxy($node)
            );

            $schema = $wings->getConfig()->getConfigSchema();

            return ApiResponse::success([
                'schema' => $schema,
            ], 'Schema retrieved successfully', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to retrieve Wings configuration schema for node ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to retrieve schema', 'NODE_CONFIG_SCHEMA_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/nodes/{id}/version-status',
        summary: 'Check FeatherWings version status',
        description: 'Check if the node\'s FeatherWings version matches the latest version available on GitHub. Compares the installed version with the latest release from mythicalltd/featherwings repository.',
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
                description: 'Version status retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'current_version', type: 'string', description: 'Currently installed FeatherWings version'),
                        new OA\Property(property: 'latest_version', type: 'string', nullable: true, description: 'Latest available version from GitHub'),
                        new OA\Property(property: 'is_up_to_date', type: 'boolean', description: 'Whether the installed version matches the latest'),
                        new OA\Property(property: 'update_available', type: 'boolean', description: 'Whether an update is available'),
                        new OA\Property(property: 'github_error', type: 'string', nullable: true, description: 'Error message if GitHub check failed'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to check version status'),
        ]
    )]
    public function getVersionStatus(Request $request, int $id): Response
    {
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        try {
            $wings = new Wings(
                $node['fqdn'],
                (int) $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token'],
                10, // Short timeout for version check
                WingsUrlHelper::isBehindProxy($node)
            );

            // Get current Wings version
            $systemInfo = $wings->getSystem()->getSystemInfo();
            $currentVersion = $systemInfo['version'] ?? '';

            if (empty($currentVersion)) {
                return ApiResponse::error('Failed to retrieve Wings version', 'VERSION_RETRIEVAL_FAILED', 500);
            }

            // Remove 'v' prefix if present for comparison
            $currentVersionClean = ltrim($currentVersion, 'v');

            $caps = DaemonCapabilities::fromNode($node);
            $defaults = $caps->defaults();
            $githubOwner = $defaults['github_owner'];
            $githubRepo = $defaults['github_repo'];

            // Fetch latest version from GitHub (with caching)
            $latestVersion = null;
            $githubError = null;
            $cacheKey = $githubOwner . ':' . $githubRepo . ':latest_version';

            // Try to get from cache first (cache for 1 hour)
            $cachedVersion = Cache::get($cacheKey);
            if ($cachedVersion !== null && is_string($cachedVersion) && !empty($cachedVersion)) {
                $latestVersion = $cachedVersion;
            } else {
                // Cache miss or invalid cache - fetch from GitHub
                try {
                    $client = new Client([
                        'timeout' => 5,
                        'verify' => true,
                        'headers' => [
                            'User-Agent' => 'FeatherPanel',
                            'Accept' => 'application/vnd.github.v3+json',
                        ],
                    ]);

                    $response = $client->get('https://api.github.com/repos/' . $githubOwner . '/' . $githubRepo . '/releases/latest');
                    $releaseData = json_decode($response->getBody()->getContents(), true);

                    if (isset($releaseData['tag_name']) && is_string($releaseData['tag_name'])) {
                        $latestVersion = ltrim($releaseData['tag_name'], 'v');
                        // Only cache if we got a valid version
                        if (!empty($latestVersion)) {
                            // Cache for 1 hour (60 minutes)
                            Cache::put($cacheKey, $latestVersion, 60);
                        }
                    }
                } catch (\Exception $e) {
                    $githubError = 'Failed to fetch latest version from GitHub: ' . $e->getMessage();
                    App::getInstance(true)->getLogger()->warning('GitHub version check failed for node ' . $id . ': ' . $e->getMessage());
                }
            }

            // Compare versions
            $isUpToDate = false;
            $updateAvailable = false;

            if ($latestVersion !== null) {
                // Simple version comparison (semantic versioning)
                $isUpToDate = version_compare($currentVersionClean, $latestVersion, '>=');
                $updateAvailable = !$isUpToDate;
            }

            return ApiResponse::success([
                'current_version' => $currentVersion,
                'latest_version' => $latestVersion,
                'is_up_to_date' => $isUpToDate,
                'update_available' => $updateAvailable,
                'github_error' => $githubError,
                'daemon_type' => $caps->getType(),
                'self_update_supported' => $caps->supports(DaemonCapabilities::FEATURE_SELF_UPDATE),
                'github_owner' => $githubOwner,
                'github_repo' => $githubRepo,
            ], 'Version status retrieved successfully', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to check version status for node ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to check version status', 'VERSION_CHECK_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/nodes/{id}/mass-transfer/preview',
        summary: 'Preview mass server transfer from a node',
        description: 'Lists transferable servers on the source node and free allocation capacity on a destination node.',
        tags: ['Admin - Nodes'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', description: 'Source node ID', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'destination_node_id', in: 'query', description: 'Destination node ID', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Preview retrieved successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 404, description: 'Node not found'),
        ]
    )]
    public function previewMassTransfer(Request $request, int $id): Response
    {
        $sourceNode = Node::getNodeById($id);
        if (!$sourceNode) {
            return ApiResponse::error('Source node not found', 'NODE_NOT_FOUND', 404);
        }

        $destinationNodeId = (int) $request->query->get('destination_node_id', 0);
        if ($destinationNodeId <= 0) {
            return ApiResponse::error('Invalid or missing destination_node_id', 'INVALID_DESTINATION_NODE', 400);
        }

        if ($id === $destinationNodeId) {
            return ApiResponse::error('Cannot transfer to the same node', 'SAME_SOURCE_DESTINATION', 400);
        }

        $destinationNode = Node::getNodeById($destinationNodeId);
        if (!$destinationNode) {
            return ApiResponse::error('Destination node not found', 'DESTINATION_NODE_NOT_FOUND', 404);
        }

        $servers = Server::getServersByNodeId($id);
        $transferable = [];
        $skipped = [];
        $allocationsRequired = 0;

        foreach ($servers as $server) {
            $serverId = (int) $server['id'];
            if ($server['status'] === 'transferring' || ServerTransfer::hasActiveTransfer($serverId)) {
                $skipped[] = [
                    'id' => $serverId,
                    'name' => $server['name'],
                    'reason' => 'already_transferring',
                ];
                continue;
            }
            if ($server['status'] === 'installing' || $server['status'] === 'restoring') {
                $skipped[] = [
                    'id' => $serverId,
                    'name' => $server['name'],
                    'reason' => 'not_transferable',
                ];
                continue;
            }

            $allocationCount = count(Allocation::getByServerId($serverId));
            $needed = max(1, $allocationCount);
            $allocationsRequired += $needed;

            $transferable[] = [
                'id' => $serverId,
                'name' => $server['name'],
                'uuid' => $server['uuid'],
                'status' => $server['status'],
                'allocations_needed' => $needed,
            ];
        }

        $freeOnDestination = Allocation::getFreeCountByNodeId($destinationNodeId);

        return ApiResponse::success([
            'source_node' => ['id' => $id, 'name' => $sourceNode['name']],
            'destination_node' => ['id' => $destinationNodeId, 'name' => $destinationNode['name']],
            'transferable_servers' => $transferable,
            'skipped_servers' => $skipped,
            'allocations_required' => $allocationsRequired,
            'free_allocations_on_destination' => $freeOnDestination,
            'has_enough_allocations' => $freeOnDestination >= $allocationsRequired,
            'max_per_request' => 100,
        ], 'Mass transfer preview', 200);
    }

    #[OA\Post(
        path: '/api/admin/nodes/{id}/mass-transfer',
        summary: 'Mass transfer servers from a node',
        description: 'Transfer selected servers (or all transferable servers) from this node to another. Free allocations on the destination node are assigned automatically.',
        tags: ['Admin - Nodes'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', description: 'Source node ID', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['destination_node_id'],
                properties: [
                    new OA\Property(property: 'destination_node_id', type: 'integer', minimum: 1),
                    new OA\Property(property: 'server_ids', type: 'array', items: new OA\Items(type: 'integer'), description: 'Server IDs to move (ignored when move_all is true)'),
                    new OA\Property(property: 'move_all', type: 'boolean', description: 'Move every transferable server on this node'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Mass transfer processed'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 404, description: 'Node not found'),
        ]
    )]
    public function massTransfer(Request $request, int $id): Response
    {
        $sourceNode = Node::getNodeById($id);
        if (!$sourceNode) {
            return ApiResponse::error('Source node not found', 'NODE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (!isset($data['destination_node_id']) || !is_numeric($data['destination_node_id'])) {
            return ApiResponse::error('Invalid or missing destination_node_id', 'INVALID_DESTINATION_NODE', 400);
        }

        $destinationNodeId = (int) $data['destination_node_id'];
        $moveAll = !empty($data['move_all']);
        $serverIds = isset($data['server_ids']) && is_array($data['server_ids'])
            ? array_map('intval', $data['server_ids'])
            : [];

        if (!$moveAll && empty($serverIds)) {
            return ApiResponse::error('Provide server_ids or set move_all to true', 'NO_SERVERS_SELECTED', 400);
        }

        if ($id === $destinationNodeId) {
            return ApiResponse::error('Cannot transfer to the same node', 'SAME_SOURCE_DESTINATION', 400);
        }

        if (!Node::getNodeById($destinationNodeId)) {
            return ApiResponse::error('Destination node not found', 'DESTINATION_NODE_NOT_FOUND', 404);
        }

        $initiator = new ServerTransferInitiator();
        $results = $initiator->massTransfer(
            $id,
            $destinationNodeId,
            $serverIds,
            $moveAll,
            $request->attributes->get('user')
        );

        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'],
            'name' => 'mass_transfer_servers',
            'context' => 'Mass transfer from node ' . $sourceNode['name'] . ': '
                . count($results['initiated']) . ' initiated, '
                . count($results['failed']) . ' failed, '
                . count($results['skipped']) . ' skipped',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'initiated' => $results['initiated'],
            'failed' => $results['failed'],
            'skipped' => $results['skipped'],
            'initiated_count' => count($results['initiated']),
            'failed_count' => count($results['failed']),
            'skipped_count' => count($results['skipped']),
        ], 'Mass transfer processed', 200);
    }

    /**
     * Map FeatherPanel self-update options to Calagopus POST /api/system/upgrade payload.
     *
     * @param array<string, mixed> $options
     *
     * @return array{payload?: array<string, mixed>, error?: string, code?: string, status?: int}
     */
    private function buildCalagopusUpgradePayload(Wings $wings, DaemonCapabilities $caps, array $options): array
    {
        $defaults = $caps->defaults();
        $unit = (string) ($defaults['systemd_unit'] ?? 'wings');
        $url = isset($options['url']) && is_string($options['url']) ? trim($options['url']) : '';
        $sha256 = isset($options['sha256']) && is_string($options['sha256']) ? strtolower(trim($options['sha256'])) : '';
        $source = isset($options['source']) && is_string($options['source']) ? $options['source'] : 'github';

        if ($source === 'url') {
            if ($url === '' || $sha256 === '') {
                return [
                    'error' => 'Calagopus upgrades require both download URL and sha256 checksum',
                    'code' => 'NODE_SELF_UPDATE_INVALID',
                    'status' => 400,
                ];
            }
        } else {
            $resolved = $this->resolveCalagopusGithubAsset($wings, $caps, $options);
            if (isset($resolved['error'])) {
                return $resolved;
            }
            $url = (string) $resolved['url'];
            $sha256 = (string) $resolved['sha256'];
        }

        $sha256 = preg_replace('/^sha256:/i', '', $sha256) ?? $sha256;

        return [
            'payload' => [
                'url' => $url,
                'headers' => new \stdClass(),
                'sha256' => $sha256,
                'restart_command' => 'systemctl',
                'restart_command_args' => ['restart', $unit],
            ],
        ];
    }

    /**
     * @param array<string, mixed> $options
     *
     * @return array{url?: string, sha256?: string, error?: string, code?: string, status?: int}
     */
    private function resolveCalagopusGithubAsset(Wings $wings, DaemonCapabilities $caps, array $options): array
    {
        $defaults = $caps->defaults();
        $owner = isset($options['repo_owner']) && is_string($options['repo_owner']) && $options['repo_owner'] !== ''
            ? $options['repo_owner']
            : (string) $defaults['github_owner'];
        $repo = isset($options['repo_name']) && is_string($options['repo_name']) && $options['repo_name'] !== ''
            ? $options['repo_name']
            : (string) $defaults['github_repo'];

        // Self-update pulls and executes a binary asset from the resolved repo, so overrides of the
        // daemon's default GitHub coordinates must be restricted to a known-safe allowlist to prevent
        // pointing the upgrade mechanism at an attacker-controlled repository.
        $allowedRepos = [
            'calagopus/wings',
            'mythicalltd/featherwings',
        ];
        if (!in_array($owner . '/' . $repo, $allowedRepos, true)) {
            return [
                'error' => 'Repository ' . $owner . '/' . $repo . ' is not an approved source for Calagopus self-update',
                'code' => 'NODE_SELF_UPDATE_REPO_NOT_ALLOWED',
                'status' => 400,
            ];
        }

        $arch = null;
        try {
            $systemInfo = $wings->getSystem()->getSystemInfo();
            $rawArch = strtolower((string) ($systemInfo['architecture'] ?? $systemInfo['arch'] ?? ''));
            if (str_contains($rawArch, 'aarch64') || str_contains($rawArch, 'arm64')) {
                $arch = 'aarch64';
            } elseif (str_contains($rawArch, 'ppc64')) {
                $arch = 'ppc64le';
            } elseif (str_contains($rawArch, 'riscv64')) {
                $arch = 'riscv64';
            } elseif (str_contains($rawArch, 'x86_64') || str_contains($rawArch, 'amd64')) {
                $arch = 'x86_64';
            }
        } catch (\Throwable $e) {
            return [
                'error' => 'Failed to determine node architecture for Calagopus upgrade: ' . $e->getMessage(),
                'code' => 'NODE_SELF_UPDATE_ARCH',
                'status' => 502,
            ];
        }

        if ($arch === null) {
            return [
                'error' => 'Unable to determine a supported architecture for Calagopus upgrade on this node',
                'code' => 'NODE_SELF_UPDATE_ARCH',
                'status' => 502,
            ];
        }

        $assetNeedle = 'wings-rs-' . $arch . '-linux';

        try {
            $client = new Client([
                'timeout' => 10,
                'verify' => true,
                'headers' => [
                    'User-Agent' => 'FeatherPanel',
                    'Accept' => 'application/vnd.github.v3+json',
                ],
            ]);
            $response = $client->get('https://api.github.com/repos/' . $owner . '/' . $repo . '/releases/latest');
            $releaseData = json_decode($response->getBody()->getContents(), true);
            if (!is_array($releaseData) || !isset($releaseData['assets']) || !is_array($releaseData['assets'])) {
                return [
                    'error' => 'Failed to resolve GitHub release assets for Calagopus upgrade',
                    'code' => 'NODE_SELF_UPDATE_GITHUB',
                    'status' => 502,
                ];
            }

            $matched = null;
            foreach ($releaseData['assets'] as $asset) {
                if (!is_array($asset)) {
                    continue;
                }
                $name = (string) ($asset['name'] ?? '');
                if ($name === $assetNeedle || str_starts_with($name, $assetNeedle)) {
                    $matched = $asset;
                    break;
                }
            }

            if ($matched === null) {
                return [
                    'error' => 'No Calagopus release asset found for architecture ' . $arch,
                    'code' => 'NODE_SELF_UPDATE_ASSET',
                    'status' => 404,
                ];
            }

            $url = (string) ($matched['browser_download_url'] ?? '');
            $digest = (string) ($matched['digest'] ?? '');
            $sha256 = preg_replace('/^sha256:/i', '', $digest) ?? '';
            if ($url === '' || $sha256 === '') {
                return [
                    'error' => 'Calagopus release asset is missing download URL or sha256 digest',
                    'code' => 'NODE_SELF_UPDATE_ASSET',
                    'status' => 502,
                ];
            }

            return [
                'url' => $url,
                'sha256' => strtolower($sha256),
            ];
        } catch (\Throwable $e) {
            return [
                'error' => 'Failed to fetch Calagopus release from GitHub: ' . $e->getMessage(),
                'code' => 'NODE_SELF_UPDATE_GITHUB',
                'status' => 502,
            ];
        }
    }

    /**
     * @param array<string, mixed> $node
     *
     * @return array<string, mixed>
     */
    private function enrichNode(array $node): array
    {
        $caps = DaemonCapabilities::fromNode($node);
        $node['daemon_type'] = $caps->getType();
        $node['capabilities'] = $caps->toArray();

        // The daemon token grants full API access to the node. It must not
        // be returned from general list/detail responses - only the
        // dedicated /setup-command endpoint (which requires the same admin
        // permission but is an explicit, auditable "reveal" action) should
        // expose it. Leaving it in every index()/show() response meant it
        // could end up in browser history, proxy/access logs, or dev tools
        // for any admin who merely views the nodes list.
        unset($node['daemon_token'], $node['daemon_token_id']);

        return $node;
    }

    /**
     * @param array<string, mixed> $node
     */
    private function requireFeature(array $node, string $feature): ?Response
    {
        $caps = DaemonCapabilities::fromNode($node);
        if ($caps->supports($feature)) {
            return null;
        }

        return DaemonCapabilities::unsupportedResponse($node, $feature);
    }
}
