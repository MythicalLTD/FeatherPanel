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
use App\Chat\VmIp;
use App\Chat\VmNode;
use App\Chat\Activity;
use App\Chat\Location;
use App\Chat\VmTemplate;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Services\Proxmox\Proxmox;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'VmNode',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'VM Node ID'),
        new OA\Property(property: 'name', type: 'string', description: 'VM Node name'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'VM Node description'),
        new OA\Property(property: 'location_id', type: 'integer', description: 'Location ID (must be type=vps)'),
        new OA\Property(property: 'fqdn', type: 'string', description: 'Proxmox host FQDN or IP'),
        new OA\Property(property: 'scheme', type: 'string', enum: ['http', 'https'], description: 'Connection scheme'),
        new OA\Property(property: 'port', type: 'integer', description: 'Proxmox API port'),
        new OA\Property(property: 'user', type: 'string', description: 'Proxmox API user (e.g. root@pam)'),
        new OA\Property(property: 'token_id', type: 'string', description: 'Proxmox API token ID'),
        new OA\Property(property: 'secret', type: 'string', description: 'Proxmox API token secret'),
        new OA\Property(property: 'tls_no_verify', type: 'string', enum: ['true', 'false'], description: 'Skip TLS verification'),
        new OA\Property(property: 'timeout', type: 'integer', description: 'Timeout in seconds'),
        new OA\Property(property: 'addional_headers', type: 'string', nullable: true, description: 'Additional HTTP headers (JSON encoded, optional)'),
        new OA\Property(property: 'additional_params', type: 'string', nullable: true, description: 'Additional query parameters (JSON encoded, optional)'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'VmNodePagination',
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
    schema: 'VmNodeCreate',
    type: 'object',
    required: ['name', 'fqdn', 'location_id', 'user', 'token_id', 'secret'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'VM Node name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'VM Node description'),
        new OA\Property(property: 'location_id', type: 'integer', description: 'Location ID (must be type=vps)'),
        new OA\Property(property: 'fqdn', type: 'string', description: 'Proxmox host FQDN or IP'),
        new OA\Property(property: 'scheme', type: 'string', enum: ['http', 'https'], description: 'Connection scheme', default: 'https'),
        new OA\Property(property: 'port', type: 'integer', description: 'Proxmox API port', default: 8006),
        new OA\Property(property: 'user', type: 'string', description: 'Proxmox API user (e.g. root@pam)'),
        new OA\Property(property: 'token_id', type: 'string', description: 'Proxmox API token ID'),
        new OA\Property(property: 'secret', type: 'string', description: 'Proxmox API token secret'),
        new OA\Property(property: 'tls_no_verify', type: 'string', enum: ['true', 'false'], description: 'Skip TLS verification', default: 'false'),
        new OA\Property(property: 'timeout', type: 'integer', description: 'Timeout in seconds', default: 60),
        new OA\Property(property: 'addional_headers', type: 'string', nullable: true, description: 'Additional HTTP headers (JSON encoded, optional)'),
        new OA\Property(property: 'additional_params', type: 'string', nullable: true, description: 'Additional query parameters (JSON encoded, optional)'),
        new OA\Property(property: 'id', type: 'integer', nullable: true, description: 'Optional VM node ID (useful for migrations)'),
    ]
)]
#[OA\Schema(
    schema: 'VmNodeUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'VM Node name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'VM Node description'),
        new OA\Property(property: 'location_id', type: 'integer', description: 'Location ID (must be type=vps)'),
        new OA\Property(property: 'fqdn', type: 'string', description: 'Proxmox host FQDN or IP'),
        new OA\Property(property: 'scheme', type: 'string', enum: ['http', 'https'], description: 'Connection scheme'),
        new OA\Property(property: 'port', type: 'integer', description: 'Proxmox API port'),
        new OA\Property(property: 'user', type: 'string', description: 'Proxmox API user (e.g. root@pam)'),
        new OA\Property(property: 'token_id', type: 'string', description: 'Proxmox API token ID'),
        new OA\Property(property: 'secret', type: 'string', description: 'Proxmox API token secret'),
        new OA\Property(property: 'tls_no_verify', type: 'string', enum: ['true', 'false'], description: 'Skip TLS verification'),
        new OA\Property(property: 'timeout', type: 'integer', description: 'Timeout in seconds'),
        new OA\Property(property: 'addional_headers', type: 'string', nullable: true, description: 'Additional HTTP headers (JSON encoded, optional)'),
        new OA\Property(property: 'additional_params', type: 'string', nullable: true, description: 'Additional query parameters (JSON encoded, optional)'),
    ]
)]
class VmNodesController
{
    #[OA\Get(
        path: '/api/admin/vm-nodes',
        summary: 'Get all Proxmox VM nodes',
        description: 'Retrieve a paginated list of all VM nodes (Proxmox hypervisors) with optional search and VPS-location filtering.',
        tags: ['Admin - VM Nodes'],
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
                description: 'Search term to filter VM nodes by name or FQDN',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'location_id',
                in: 'query',
                description: 'Location ID to filter VM nodes by (must be type=vps)',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM nodes retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'vm_nodes', type: 'array', items: new OA\Items(ref: '#/components/schemas/VmNode')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/VmNodePagination'),
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

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        if ($locationId !== null) {
            $location = Location::getById($locationId);
            if (!$location || ($location['type'] ?? 'game') !== 'vps') {
                return ApiResponse::error('Location must be a VPS/VDS location', 'INVALID_LOCATION_TYPE', 400);
            }
        }

        $vmNodes = VmNode::searchVmNodes(page: $page, limit: $limit, search: (string) $search, locationId: $locationId);
        $total = VmNode::getVmNodesCount(search: (string) $search, locationId: $locationId);

        $totalPages = (int) ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = (int) min($from + $limit - 1, $total);

        return ApiResponse::success([
            'vm_nodes' => $vmNodes,
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
                'has_results' => count($vmNodes) > 0,
            ],
        ], 'VM nodes fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/vm-nodes/{id}',
        summary: 'Get VM node by ID',
        description: 'Retrieve a specific VM node by its ID.',
        tags: ['Admin - VM Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'VM Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM node retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'vm_node', ref: '#/components/schemas/VmNode'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid VM node ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'VM node not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        return ApiResponse::success(['vm_node' => $vmNode], 'VM node fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/vm-nodes',
        summary: 'Create new VM node',
        description: 'Create a new VM node (Proxmox hypervisor) associated with a VPS/VDS location.',
        tags: ['Admin - VM Nodes'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/VmNodeCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'VM node created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'vm_node', ref: '#/components/schemas/VmNode'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, validation errors, location not found or not VPS'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function create(Request $request): Response
    {
        $admin = $request->get('user');
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        $requiredFields = ['name', 'fqdn', 'location_id', 'user', 'token_id', 'secret'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        if (!is_string($data['name'])) {
            return ApiResponse::error('Name must be a string', 'INVALID_DATA_TYPE', 400);
        }

        if (strlen($data['name']) > 255) {
            return ApiResponse::error('Name must be at most 255 characters', 'INVALID_DATA_LENGTH', 400);
        }

        $locationId = $data['location_id'] ?? null;
        if (!$locationId || !is_numeric($locationId)) {
            return ApiResponse::error('Location ID must be a positive integer', 'INVALID_LOCATION_ID', 400);
        }

        $location = Location::getById((int) $locationId);
        if (!$location) {
            return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
        }

        if (($location['type'] ?? 'game') !== 'vps') {
            return ApiResponse::error('Location must be a VPS/VDS location', 'INVALID_LOCATION_TYPE', 400);
        }

        $data['location_id'] = (int) $locationId;

        if (!isset($data['scheme']) || !in_array($data['scheme'], ['http', 'https'], true)) {
            $data['scheme'] = 'https';
        }

        if (!isset($data['port']) || !is_numeric($data['port'])) {
            $data['port'] = 8006;
        }

        if (!isset($data['timeout']) || !is_numeric($data['timeout']) || (int) $data['timeout'] <= 0) {
            $data['timeout'] = 60;
        }

        if (!isset($data['tls_no_verify']) || !in_array($data['tls_no_verify'], ['true', 'false'], true)) {
            $data['tls_no_verify'] = 'false';
        }

        if (isset($data['id'])) {
            if (!is_int($data['id']) && !ctype_digit((string) $data['id'])) {
                return ApiResponse::error('ID must be an integer', 'INVALID_DATA_TYPE', 400);
            }
            $data['id'] = (int) $data['id'];
            if ($data['id'] < 1) {
                return ApiResponse::error('ID must be a positive integer', 'INVALID_DATA_LENGTH', 400);
            }
            if (VmNode::getVmNodeById($data['id'])) {
                return ApiResponse::error('VM node with this ID already exists', 'DUPLICATE_ID', 400);
            }
        }

        $vmNodeId = VmNode::createVmNode($data);
        if (!$vmNodeId) {
            return ApiResponse::error('Failed to create VM node', 'VM_NODE_CREATE_FAILED', 400);
        }

        $vmNode = VmNode::getVmNodeById($vmNodeId);

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_vm_node',
            'context' => 'Created VM node: ' . ($vmNode['name'] ?? $data['name']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['vm_node' => $vmNode], 'VM node created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/vm-nodes/{id}',
        summary: 'Update VM node',
        description: 'Update an existing VM node. Only provided fields will be updated. Validates location existence and type.',
        tags: ['Admin - VM Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'VM Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/VmNodeUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM node updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'vm_node', ref: '#/components/schemas/VmNode'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, no data provided, validation errors, location not found, or invalid location type'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'VM node not found'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
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

        if (isset($data['location_id'])) {
            $locationId = $data['location_id'];
            if (!$locationId || !is_numeric($locationId)) {
                return ApiResponse::error('Location ID must be a positive integer', 'INVALID_LOCATION_ID', 400);
            }

            $location = Location::getById((int) $locationId);
            if (!$location) {
                return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
            }

            if (($location['type'] ?? 'game') !== 'vps') {
                return ApiResponse::error('Location must be a VPS/VDS location', 'INVALID_LOCATION_TYPE', 400);
            }

            $data['location_id'] = (int) $locationId;
        }

        if (isset($data['name'])) {
            if (!is_string($data['name'])) {
                return ApiResponse::error('Name must be a string', 'INVALID_DATA_TYPE', 400);
            }
            if (strlen($data['name']) > 255) {
                return ApiResponse::error('Name must be at most 255 characters', 'INVALID_DATA_LENGTH', 400);
            }
        }

        if (isset($data['scheme']) && !in_array($data['scheme'], ['http', 'https'], true)) {
            return ApiResponse::error('Scheme must be either http or https', 'INVALID_DATA_TYPE', 400);
        }

        if (isset($data['port']) && (!is_numeric($data['port']) || (int) $data['port'] < 1 || (int) $data['port'] > 65535)) {
            return ApiResponse::error('Port must be a valid TCP port (1-65535)', 'INVALID_DATA_TYPE', 400);
        }

        if (isset($data['timeout']) && (!is_numeric($data['timeout']) || (int) $data['timeout'] <= 0)) {
            return ApiResponse::error('Timeout must be a positive integer', 'INVALID_DATA_TYPE', 400);
        }

        if (isset($data['tls_no_verify']) && !in_array($data['tls_no_verify'], ['true', 'false'], true)) {
            return ApiResponse::error('tls_no_verify must be either "true" or "false"', 'INVALID_DATA_TYPE', 400);
        }

        $success = VmNode::updateVmNodeById($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update VM node', 'VM_NODE_UPDATE_FAILED', 400);
        }

        $vmNode = VmNode::getVmNodeById($id);

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_vm_node',
            'context' => 'Updated VM node: ' . ($vmNode['name'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['vm_node' => $vmNode], 'VM node updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/vm-nodes/{id}',
        summary: 'Delete VM node',
        description: 'Permanently delete a VM node from the database. This does not touch the Proxmox host itself.',
        tags: ['Admin - VM Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'VM Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM node deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid VM node ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'VM node not found'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $success = VmNode::hardDeleteVmNode($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete VM node', 'VM_NODE_DELETE_FAILED', 400);
        }

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_vm_node',
            'context' => 'Deleted VM node: ' . $vmNode['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'VM node deleted successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/vm-nodes/{id}/test-connection',
        summary: 'Test connection to Proxmox VM node',
        description: 'Performs a lightweight connectivity check to Proxmox using the stored API token and returns basic status and discovered cluster nodes.',
        tags: ['Admin - VM Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'VM Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Connection successful',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ok', type: 'boolean'),
                        new OA\Property(property: 'status_code', type: 'integer', nullable: true),
                        new OA\Property(property: 'latency_ms', type: 'integer', nullable: true),
                        new OA\Property(property: 'nodes', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(
                response: 400,
                description: 'Bad request - Invalid VM node ID'
            ),
            new OA\Response(
                response: 401,
                description: 'Unauthorized'
            ),
            new OA\Response(
                response: 403,
                description: 'Forbidden - Insufficient permissions'
            ),
            new OA\Response(
                response: 404,
                description: 'VM node not found'
            ),
            new OA\Response(
                response: 500,
                description: 'Connection failed'
            ),
        ]
    )]
    public function testConnection(Request $request, int $id): Response
    {
        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';

            $extraHeaders = [];
            $extraParams = [];

            if (!empty($vmNode['addional_headers']) && is_string($vmNode['addional_headers'])) {
                $decoded = json_decode($vmNode['addional_headers'], true);
                if (is_array($decoded)) {
                    foreach ($decoded as $key => $value) {
                        if (is_string($key) && (is_string($value) || is_numeric($value))) {
                            $extraHeaders[$key] = (string) $value;
                        }
                    }
                } else {
                    App::getInstance(true)->getLogger()->warning(
                        'VM node additional headers JSON is invalid for ID ' . $id
                    );
                }
            }

            if (!empty($vmNode['additional_params']) && is_string($vmNode['additional_params'])) {
                $decoded = json_decode($vmNode['additional_params'], true);
                if (is_array($decoded)) {
                    foreach ($decoded as $key => $value) {
                        if (is_string($key) && (is_string($value) || is_numeric($value))) {
                            $extraParams[$key] = $value;
                        }
                    }
                } else {
                    App::getInstance(true)->getLogger()->warning(
                        'VM node additional params JSON is invalid for ID ' . $id
                    );
                }
            }

            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 10),
            );

            $result = $client->testConnection($extraHeaders, $extraParams);

            if ($result['ok']) {
                return ApiResponse::success($result, 'Connection to Proxmox VM node successful', 200);
            }

            return ApiResponse::error(
                'Failed to connect to Proxmox VM node: ' . ($result['error'] ?? 'unknown error'),
                'PROXMOX_CONNECTION_FAILED',
                500,
                $result
            );
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox VM node connection test failed for ID ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox VM node', 'PROXMOX_CONNECTION_FAILED', 500, [
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function getInfo(Request $request, int $id): Response
    {
        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';

            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 10),
            );

            $versionResult = $client->getVersion();
            $nodesResult = $client->getNodes();

            return ApiResponse::success([
                'version' => $versionResult['data'],
                'version_ok' => $versionResult['ok'],
                'version_error' => $versionResult['error'],
                'nodes' => $nodesResult['nodes'],
                'nodes_ok' => $nodesResult['ok'],
                'nodes_error' => $nodesResult['error'],
            ], 'Proxmox info fetched', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox getInfo failed for ID ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch Proxmox info', 'PROXMOX_INFO_FAILED', 500, [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * GET /api/admin/vm-nodes/{id}/proxmox-vms — List all VMs (and templates) from Proxmox for template picker.
     */
    public function proxmoxVms(Request $request, int $id): Response
    {
        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 10),
            );
            $result = $client->listVms();
            if (!$result['ok']) {
                return ApiResponse::error($result['error'] ?? 'Failed to list VMs', 'PROXMOX_LIST_FAILED', 502, $result);
            }

            return ApiResponse::success(['vms' => $result['vms']], 'Proxmox VMs fetched', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox listVms failed for node ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to list Proxmox VMs: ' . $e->getMessage(), 'PROXMOX_LIST_FAILED', 500);
        }
    }

    /**
     * GET /api/admin/vm-nodes/{id}/bridges — List Proxmox bridge interfaces for VM network selection.
     */
    public function bridges(Request $request, int $id): Response
    {
        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 10),
            );
            $nodesResult = $client->getNodes();
            if (!$nodesResult['ok'] || empty($nodesResult['nodes'])) {
                return ApiResponse::error(
                    'Could not get Proxmox nodes: ' . ($nodesResult['error'] ?? 'unknown'),
                    'PROXMOX_ERROR',
                    502,
                );
            }
            $pveNode = (string) $nodesResult['nodes'][0]['node'];
            $result = $client->getBridges($pveNode);
            if (!$result['ok']) {
                return ApiResponse::error($result['error'] ?? 'Failed to fetch bridges', 'PROXMOX_ERROR', 502);
            }

            return ApiResponse::success(['bridges' => $result['bridges']], 'Bridges fetched', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox getBridges failed for node ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch bridges: ' . $e->getMessage(), 'PROXMOX_ERROR', 500);
        }
    }

    /**
     * GET /api/admin/vm-nodes/{id}/storage — List Proxmox storage (for VM disk) that supports images/rootdir.
     */
    public function storage(Request $request, int $id): Response
    {
        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 10),
            );
            $nodesResult = $client->getNodes();
            if (!$nodesResult['ok'] || empty($nodesResult['nodes'])) {
                return ApiResponse::error(
                    'Could not get Proxmox nodes: ' . ($nodesResult['error'] ?? 'unknown'),
                    'PROXMOX_ERROR',
                    502,
                );
            }
            $pveNode = (string) $nodesResult['nodes'][0]['node'];
            $result = $client->getStorage($pveNode);
            if (!$result['ok']) {
                return ApiResponse::error($result['error'] ?? 'Failed to fetch storage', 'PROXMOX_ERROR', 502);
            }

            return ApiResponse::success(['storage' => $result['storage']], 'Storage list fetched', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox getStorage failed for node ' . $id . ': ' . $e->getMessage());

            return ApiResponse::error('Failed to fetch storage: ' . $e->getMessage(), 'PROXMOX_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/vm-nodes/{id}/ips',
        summary: 'List IPs for a VM node',
        description: 'Retrieve all IP addresses configured for a specific VM node.',
        tags: ['Admin - VM Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'VM Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
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
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 50)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM node IPs retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ips', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'pagination', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Invalid VM node ID'),
            new OA\Response(response: 404, description: 'VM node not found'),
        ]
    )]
    public function listIps(Request $request, int $id): Response
    {
        if ($id <= 0) {
            return ApiResponse::error('Invalid VM node ID', 'INVALID_VM_NODE_ID', 400);
        }

        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 50);
        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 50;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $offset = ($page - 1) * $limit;
        $ips = VmIp::getByVmNodeId($id, $limit, $offset);
        $inUseIds = VmIp::getInUseIpIdsForNode($id);
        foreach ($ips as &$ip) {
            $ip['in_use'] = in_array((int) $ip['id'], $inUseIds, true);
        }
        unset($ip);
        $total = VmIp::countByVmNodeId($id);
        $totalPages = (int) ceil($total / $limit);
        $from = $total === 0 ? 0 : $offset + 1;
        $to = $total === 0 ? 0 : (int) min($offset + $limit, $total);

        return ApiResponse::success([
            'ips' => $ips,
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
        ], 'VM node IPs fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/vm-nodes/{id}/ips',
        summary: 'Create IP for VM node',
        description: 'Create a new IP address for a specific VM node.',
        tags: ['Admin - VM Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'VM Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['ip'],
                properties: [
                    new OA\Property(property: 'ip', type: 'string', description: 'IP address'),
                    new OA\Property(property: 'cidr', type: 'integer', nullable: true, description: 'CIDR prefix length'),
                    new OA\Property(property: 'gateway', type: 'string', nullable: true, description: 'Gateway IP'),
                    new OA\Property(property: 'is_primary', type: 'string', enum: ['true', 'false'], description: 'Mark as primary IP'),
                    new OA\Property(property: 'notes', type: 'string', nullable: true, description: 'Notes'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'IP created successfully'),
            new OA\Response(response: 400, description: 'Invalid VM node ID or payload'),
            new OA\Response(response: 404, description: 'VM node not found'),
        ]
    )]
    public function createIp(Request $request, int $id): Response
    {
        $admin = $request->get('user');

        if ($id <= 0) {
            return ApiResponse::error('Invalid VM node ID', 'INVALID_VM_NODE_ID', 400);
        }

        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (!isset($data['ip']) || trim((string) $data['ip']) === '') {
            return ApiResponse::error('IP is required', 'MISSING_REQUIRED_FIELDS', 400);
        }

        $data['vm_node_id'] = $id;

        $ipId = VmIp::create($data);
        if (!$ipId) {
            return ApiResponse::error('Failed to create VM node IP', 'VM_NODE_IP_CREATE_FAILED', 400);
        }

        $ip = VmIp::getById($ipId);

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_vm_node_ip',
            'context' => 'Created IP ' . ($ip['ip'] ?? '') . ' for VM node: ' . ($vmNode['name'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['ip' => $ip], 'VM node IP created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/vm-nodes/{id}/ips/{ipId}',
        summary: 'Update IP for VM node',
        description: 'Update an existing IP entry for a VM node.',
        tags: ['Admin - VM Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'VM Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'ipId',
                in: 'path',
                description: 'VM IP ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'ip', type: 'string', description: 'IP address'),
                    new OA\Property(property: 'cidr', type: 'integer', nullable: true, description: 'CIDR prefix length'),
                    new OA\Property(property: 'gateway', type: 'string', nullable: true, description: 'Gateway IP'),
                    new OA\Property(property: 'is_primary', type: 'string', enum: ['true', 'false'], description: 'Mark as primary IP'),
                    new OA\Property(property: 'notes', type: 'string', nullable: true, description: 'Notes'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'IP updated successfully'),
            new OA\Response(response: 400, description: 'Invalid IDs or payload'),
            new OA\Response(response: 404, description: 'VM node or IP not found'),
        ]
    )]
    public function updateIp(Request $request, int $id, int $ipId): Response
    {
        $admin = $request->get('user');

        if ($id <= 0 || $ipId <= 0) {
            return ApiResponse::error('Invalid VM node or IP ID', 'INVALID_ID', 400);
        }

        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $ip = VmIp::getById($ipId);
        if (!$ip || (int) $ip['vm_node_id'] !== $id) {
            return ApiResponse::error('VM node IP not found', 'VM_NODE_IP_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (empty($data)) {
            return ApiResponse::success(['ip' => $ip], 'No changes to update', 200);
        }

        $success = VmIp::update($ipId, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update VM node IP', 'VM_NODE_IP_UPDATE_FAILED', 400);
        }

        $updated = VmIp::getById($ipId);

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_vm_node_ip',
            'context' => 'Updated IP ' . ($updated['ip'] ?? '') . ' for VM node: ' . ($vmNode['name'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['ip' => $updated], 'VM node IP updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/vm-nodes/{id}/ips/{ipId}',
        summary: 'Delete IP from VM node',
        description: 'Delete an IP entry from a VM node.',
        tags: ['Admin - VM Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'VM Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'ipId',
                in: 'path',
                description: 'VM IP ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'IP deleted successfully'),
            new OA\Response(response: 400, description: 'Invalid IDs'),
            new OA\Response(response: 404, description: 'VM node or IP not found'),
        ]
    )]
    public function deleteIp(Request $request, int $id, int $ipId): Response
    {
        $admin = $request->get('user');

        if ($id <= 0 || $ipId <= 0) {
            return ApiResponse::error('Invalid VM node or IP ID', 'INVALID_ID', 400);
        }

        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $ip = VmIp::getById($ipId);
        if (!$ip || (int) $ip['vm_node_id'] !== $id) {
            return ApiResponse::error('VM node IP not found', 'VM_NODE_IP_NOT_FOUND', 404);
        }

        $success = VmIp::delete($ipId);
        if (!$success) {
            return ApiResponse::error('Failed to delete VM node IP', 'VM_NODE_IP_DELETE_FAILED', 400);
        }

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_vm_node_ip',
            'context' => 'Deleted IP ' . ($ip['ip'] ?? '') . ' from VM node: ' . ($vmNode['name'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'VM node IP deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/vm-nodes/{id}/ips/{ipId}/primary',
        summary: 'Set primary IP for VM node',
        description: 'Mark a specific IP as the primary IP for a VM node. Clears the primary flag on all other IPs for this node.',
        tags: ['Admin - VM Nodes'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'VM Node ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'ipId',
                in: 'path',
                description: 'VM IP ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Primary IP set successfully'),
            new OA\Response(response: 400, description: 'Invalid IDs'),
            new OA\Response(response: 404, description: 'VM node or IP not found'),
        ]
    )]
    public function setPrimaryIp(Request $request, int $id, int $ipId): Response
    {
        $admin = $request->get('user');

        if ($id <= 0 || $ipId <= 0) {
            return ApiResponse::error('Invalid VM node or IP ID', 'INVALID_ID', 400);
        }

        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $ip = VmIp::getById($ipId);
        if (!$ip || (int) $ip['vm_node_id'] !== $id) {
            return ApiResponse::error('VM node IP not found', 'VM_NODE_IP_NOT_FOUND', 404);
        }

        $success = VmIp::setPrimaryForVmNode($id, $ipId);
        if (!$success) {
            return ApiResponse::error('Failed to set primary VM node IP', 'VM_NODE_IP_PRIMARY_FAILED', 400);
        }

        $updated = VmIp::getById($ipId);

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'set_primary_vm_node_ip',
            'context' => 'Set primary IP ' . ($updated['ip'] ?? '') . ' for VM node: ' . ($vmNode['name'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['ip' => $updated], 'VM node primary IP updated successfully', 200);
    }

    /**
     * GET /api/admin/vm-nodes/{id}/free-ips — IPs not assigned to any VM instance.
     */
    public function freeIps(Request $request, int $id): Response
    {
        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        $ips = VmIp::getFreeIpsForNode($id);

        return ApiResponse::success(['free_ips' => $ips], 'Free IPs fetched successfully', 200);
    }

    /**
     * GET /api/admin/vm-nodes/{id}/templates — VM templates for this node (for create-server form).
     */
    public function templates(Request $request, int $id): Response
    {
        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        $templates = VmTemplate::getByNodeId($id);
        $guestType = $request->query->get('guest_type');
        if ($guestType === 'qemu' || $guestType === 'lxc') {
            $templates = array_values(array_filter($templates, static fn ($t) => ($t['guest_type'] ?? 'qemu') === $guestType));
        }

        return ApiResponse::success(['templates' => $templates], 'Templates fetched successfully', 200);
    }

    /**
     * POST /api/admin/vm-nodes/{id}/templates — Create a VM template for this node.
     */
    public function createTemplate(Request $request, int $id): Response
    {
        $vmNode = VmNode::getVmNodeById($id);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        $content = $request->getContent();
        $data = is_string($content) && $content !== '' ? (json_decode($content, true) ?? []) : $request->request->all();
        if (empty(trim((string) ($data['name'] ?? '')))) {
            return ApiResponse::error('Template name is required', 'INVALID_INPUT', 400);
        }
        $templateFile = isset($data['template_file']) ? trim((string) $data['template_file']) : null;
        if ($templateFile === '' || !ctype_digit($templateFile)) {
            return ApiResponse::error('Template VMID (template_file) is required and must be a number', 'INVALID_TEMPLATE_FILE', 400);
        }
        try {
            $created = VmTemplate::create([
                'name'          => $data['name'],
                'description'   => $data['description'] ?? null,
                'guest_type'   => $data['guest_type'] ?? 'qemu',
                'os_type'       => $data['os_type'] ?? null,
                'storage'       => $data['storage'] ?? 'local',
                'template_file' => $templateFile,
                'vm_node_id'    => $id,
                'is_active'     => $data['is_active'] ?? 'true',
            ]);

            return ApiResponse::success(['template' => $created], 'Template created successfully', 201);
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), 'CREATE_FAILED', 400);
        }
    }

    /**
     * PATCH /api/admin/vm-templates/{id} — Update a VM template.
     */
    public function updateTemplate(Request $request, int $templateId): Response
    {
        $template = VmTemplate::getById($templateId);
        if (!$template) {
            return ApiResponse::error('Template not found', 'TEMPLATE_NOT_FOUND', 404);
        }
        $content = $request->getContent();
        $data = is_string($content) && $content !== '' ? (json_decode($content, true) ?? []) : $request->request->all();
        if (array_key_exists('template_file', $data) && (!ctype_digit(trim((string) $data['template_file'])) || trim((string) $data['template_file']) === '')) {
            return ApiResponse::error('Template VMID must be a number', 'INVALID_TEMPLATE_FILE', 400);
        }
        $updated = VmTemplate::update($templateId, $data);

        return $updated
            ? ApiResponse::success(['template' => $updated], 'Template updated successfully', 200)
            : ApiResponse::error('Update failed', 'UPDATE_FAILED', 400);
    }

    /**
     * DELETE /api/admin/vm-templates/{id} — Delete a VM template.
     */
    public function deleteTemplate(Request $request, int $templateId): Response
    {
        $template = VmTemplate::getById($templateId);
        if (!$template) {
            return ApiResponse::error('Template not found', 'TEMPLATE_NOT_FOUND', 404);
        }
        $deleted = VmTemplate::delete($templateId);

        return $deleted
            ? ApiResponse::success(null, 'Template deleted successfully', 200)
            : ApiResponse::error('Delete failed', 'DELETE_FAILED', 400);
    }
}
