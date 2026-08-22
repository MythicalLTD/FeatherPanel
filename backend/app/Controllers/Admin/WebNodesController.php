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

use App\Chat\WebNode;
use App\Chat\Activity;
use App\Chat\Location;
use App\Helpers\ApiResponse;
use App\Helpers\AppUrlHelper;
use OpenApi\Attributes as OA;
use App\Helpers\FeatherQuilldProbe;
use App\CloudFlare\CloudFlareRealIP;
use App\Helpers\FeatherQuilldCapabilities;
use App\Helpers\FeatherQuilldConfigBuilder;
use App\Plugins\Events\Events\WebNodeEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'WebNode',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Web Node ID'),
        new OA\Property(property: 'uuid', type: 'string', format: 'uuid', description: 'Web Node UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'Web Node name'),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Web Node description'),
        new OA\Property(property: 'location_id', type: 'integer', description: 'Location ID (must be type=web)'),
        new OA\Property(property: 'fqdn', type: 'string', description: 'FeatherQuilld host FQDN or IP'),
        new OA\Property(property: 'scheme', type: 'string', enum: ['http', 'https'], description: 'Connection scheme'),
        new OA\Property(property: 'public', type: 'integer', description: 'Whether the node is publicly visible'),
        new OA\Property(property: 'behind_proxy', type: 'integer', description: 'Whether the node is behind a reverse proxy'),
        new OA\Property(property: 'maintenance_mode', type: 'integer', description: 'Whether the node is in maintenance mode'),
        new OA\Property(property: 'memory', type: 'integer', description: 'Memory allocation in MB'),
        new OA\Property(property: 'memory_overallocate', type: 'integer', description: 'Memory overallocation percentage'),
        new OA\Property(property: 'disk', type: 'integer', description: 'Disk allocation in MB'),
        new OA\Property(property: 'disk_overallocate', type: 'integer', description: 'Disk overallocation percentage'),
        new OA\Property(property: 'upload_size', type: 'integer', description: 'Max upload size in MB'),
        new OA\Property(property: 'daemon_token_id', type: 'string', description: 'FeatherQuilld daemon token ID'),
        new OA\Property(property: 'daemon_token', type: 'string', description: 'FeatherQuilld daemon authentication token'),
        new OA\Property(property: 'daemonListen', type: 'integer', description: 'FeatherQuilld daemon listen port'),
        new OA\Property(property: 'daemonBase', type: 'string', description: 'FeatherQuilld daemon base path'),
        new OA\Property(property: 'websitesPath', type: 'string', nullable: true, description: 'Volumes path (system.data); defaults to {daemonBase}/volumes'),
        new OA\Property(property: 'backupsPath', type: 'string', nullable: true, description: 'Backup path (system.backup_directory); defaults to {daemonBase}/backups'),
        new OA\Property(property: 'addonsPath', type: 'string', nullable: true, description: 'Plugins path (plugins.directory); only emitted in config when explicitly set'),
        new OA\Property(property: 'quilldConfigOverrides', type: 'string', nullable: true, description: 'Optional JSON object merged into generated FeatherQuilld config (docker, api.ssl, etc.)'),
        new OA\Property(property: 'remoteTimeout', type: 'integer', description: 'Panel API request timeout in seconds', default: 30),
        new OA\Property(property: 'remoteRetryLimit', type: 'integer', description: 'Panel API retry limit', default: 10),
        new OA\Property(property: 'remoteCustomHeaders', type: 'string', nullable: true, description: 'Optional JSON object of custom HTTP headers sent to the panel (remote.custom_headers)'),
        new OA\Property(property: 'sftpEnabled', type: 'integer', description: 'Whether SFTP is enabled on the daemon'),
        new OA\Property(property: 'sftpKeyAlgorithm', type: 'string', description: 'SSH key algorithm for SFTP host keys', default: 'ssh-ed25519'),
        new OA\Property(property: 'sftpPort', type: 'integer', description: 'SFTP listen port', default: 2222),
        new OA\Property(property: 'sftpDisablePasswordAuth', type: 'integer', description: 'Whether SFTP password authentication is disabled'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'WebNodePagination',
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
    schema: 'WebNodeCreate',
    type: 'object',
    required: ['name', 'fqdn', 'location_id'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Web Node name', minLength: 1, maxLength: 191),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Web Node description'),
        new OA\Property(property: 'location_id', type: 'integer', description: 'Location ID (must be type=web)'),
        new OA\Property(property: 'fqdn', type: 'string', description: 'FeatherQuilld host FQDN or IP'),
        new OA\Property(property: 'scheme', type: 'string', enum: ['http', 'https'], description: 'Connection scheme', default: 'https'),
        new OA\Property(property: 'public', type: 'boolean', description: 'Whether the node is publicly visible', default: true),
        new OA\Property(property: 'behind_proxy', type: 'boolean', description: 'Whether the node is behind a reverse proxy', default: false),
        new OA\Property(property: 'maintenance_mode', type: 'boolean', description: 'Whether the node is in maintenance mode', default: false),
        new OA\Property(property: 'memory', type: 'integer', description: 'Memory allocation in MB', default: 1024),
        new OA\Property(property: 'memory_overallocate', type: 'integer', description: 'Memory overallocation percentage', default: 0),
        new OA\Property(property: 'disk', type: 'integer', description: 'Disk allocation in MB', default: 4096),
        new OA\Property(property: 'disk_overallocate', type: 'integer', description: 'Disk overallocation percentage', default: 0),
        new OA\Property(property: 'upload_size', type: 'integer', description: 'Max upload size in MB', default: 100),
        new OA\Property(property: 'daemonListen', type: 'integer', description: 'FeatherQuilld daemon listen port', default: 8989),
        new OA\Property(property: 'daemonBase', type: 'string', description: 'FeatherQuilld daemon base path', default: '/var/lib/featherquilld'),
        new OA\Property(property: 'websitesPath', type: 'string', nullable: true, description: 'Path where hosted websites are stored (defaults to {daemonBase}/websites)'),
        new OA\Property(property: 'backupsPath', type: 'string', nullable: true, description: 'Path where website backups are stored (defaults to {daemonBase}/backups)'),
        new OA\Property(property: 'addonsPath', type: 'string', nullable: true, description: 'Plugins path; only emitted in config when explicitly set'),
        new OA\Property(property: 'quilldConfigOverrides', type: 'string', nullable: true, description: 'Optional JSON merged into generated FeatherQuilld config'),
        new OA\Property(property: 'remoteTimeout', type: 'integer', description: 'Panel API request timeout in seconds', default: 30),
        new OA\Property(property: 'remoteRetryLimit', type: 'integer', description: 'Panel API retry limit', default: 10),
        new OA\Property(property: 'remoteCustomHeaders', type: 'string', nullable: true, description: 'Optional JSON object of custom HTTP headers (remote.custom_headers)'),
        new OA\Property(property: 'sftpEnabled', type: 'boolean', description: 'Whether SFTP is enabled', default: true),
        new OA\Property(property: 'sftpKeyAlgorithm', type: 'string', description: 'SSH key algorithm for SFTP', default: 'ssh-ed25519'),
        new OA\Property(property: 'sftpPort', type: 'integer', description: 'SFTP listen port', default: 2222),
        new OA\Property(property: 'sftpDisablePasswordAuth', type: 'boolean', description: 'Disable SFTP password authentication', default: false),
        new OA\Property(property: 'id', type: 'integer', nullable: true, description: 'Optional web node ID (useful for migrations)'),
    ]
)]
#[OA\Schema(
    schema: 'WebNodeUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Web Node name', minLength: 1, maxLength: 191),
        new OA\Property(property: 'description', type: 'string', nullable: true, description: 'Web Node description'),
        new OA\Property(property: 'location_id', type: 'integer', description: 'Location ID (must be type=web)'),
        new OA\Property(property: 'fqdn', type: 'string', description: 'FeatherQuilld host FQDN or IP'),
        new OA\Property(property: 'scheme', type: 'string', enum: ['http', 'https'], description: 'Connection scheme'),
        new OA\Property(property: 'public', type: 'boolean', description: 'Whether the node is publicly visible'),
        new OA\Property(property: 'behind_proxy', type: 'boolean', description: 'Whether the node is behind a reverse proxy'),
        new OA\Property(property: 'maintenance_mode', type: 'boolean', description: 'Whether the node is in maintenance mode'),
        new OA\Property(property: 'memory', type: 'integer', description: 'Memory allocation in MB'),
        new OA\Property(property: 'memory_overallocate', type: 'integer', description: 'Memory overallocation percentage'),
        new OA\Property(property: 'disk', type: 'integer', description: 'Disk allocation in MB'),
        new OA\Property(property: 'disk_overallocate', type: 'integer', description: 'Disk overallocation percentage'),
        new OA\Property(property: 'upload_size', type: 'integer', description: 'Max upload size in MB'),
        new OA\Property(property: 'daemonListen', type: 'integer', description: 'FeatherQuilld daemon listen port'),
        new OA\Property(property: 'daemonBase', type: 'string', description: 'FeatherQuilld daemon base path'),
        new OA\Property(property: 'websitesPath', type: 'string', nullable: true, description: 'Volumes path (system.data); defaults to {daemonBase}/volumes'),
        new OA\Property(property: 'backupsPath', type: 'string', nullable: true, description: 'Backup path (system.backup_directory); defaults to {daemonBase}/backups'),
        new OA\Property(property: 'addonsPath', type: 'string', nullable: true, description: 'Plugins path; only emitted in config when explicitly set'),
        new OA\Property(property: 'quilldConfigOverrides', type: 'string', nullable: true, description: 'Optional JSON merged into generated FeatherQuilld config'),
        new OA\Property(property: 'remoteTimeout', type: 'integer', description: 'Panel API request timeout in seconds'),
        new OA\Property(property: 'remoteRetryLimit', type: 'integer', description: 'Panel API retry limit'),
        new OA\Property(property: 'remoteCustomHeaders', type: 'string', nullable: true, description: 'Optional JSON object of custom HTTP headers (remote.custom_headers)'),
        new OA\Property(property: 'sftpEnabled', type: 'boolean', description: 'Whether SFTP is enabled'),
        new OA\Property(property: 'sftpKeyAlgorithm', type: 'string', description: 'SSH key algorithm for SFTP'),
        new OA\Property(property: 'sftpPort', type: 'integer', description: 'SFTP listen port'),
        new OA\Property(property: 'sftpDisablePasswordAuth', type: 'boolean', description: 'Disable SFTP password authentication'),
    ]
)]
class WebNodesController
{
    #[OA\Get(
        path: '/api/admin/web-nodes',
        summary: 'Get all FeatherQuilld web nodes',
        description: 'Retrieve a paginated list of all web nodes (FeatherQuilld daemons) with optional search and web-location filtering.',
        tags: ['Admin - Web Nodes'],
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', description: 'Page number for pagination', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)),
            new OA\Parameter(name: 'limit', in: 'query', description: 'Number of records per page', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 10)),
            new OA\Parameter(name: 'search', in: 'query', description: 'Search term to filter web nodes by name or FQDN', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'location_id', in: 'query', description: 'Location ID to filter web nodes by (must be type=web)', required: false, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Web nodes retrieved successfully'),
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
            if (!$location || ($location['type'] ?? 'game') !== 'web') {
                return ApiResponse::error('Location must be a web hosting location', 'INVALID_LOCATION_TYPE', 400);
            }
        }

        $webNodes = WebNode::searchWebNodes(page: $page, limit: $limit, search: (string) $search, locationId: $locationId);
        $total = WebNode::getWebNodesCount(search: (string) $search, locationId: $locationId);

        $totalPages = (int) ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = (int) min($from + $limit - 1, $total);

        return ApiResponse::success([
            'web_nodes' => $webNodes,
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
                'has_results' => count($webNodes) > 0,
            ],
        ], 'Web nodes fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/web-nodes/{id}',
        summary: 'Get web node by ID',
        description: 'Retrieve a specific web node by its ID.',
        tags: ['Admin - Web Nodes'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', description: 'Web Node ID', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Web node retrieved successfully'),
            new OA\Response(response: 400, description: 'Bad request - Invalid web node ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Web node not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $webNode = WebNode::getWebNodeById($id);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        return ApiResponse::success(['web_node' => WebNode::sanitizeForAdminResponse($webNode)], 'Web node fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/web-nodes',
        summary: 'Create new web node',
        description: 'Create a new web node (FeatherQuilld daemon) associated with a web hosting location. Daemon tokens are auto-generated.',
        tags: ['Admin - Web Nodes'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/WebNodeCreate')
        ),
        responses: [
            new OA\Response(response: 201, description: 'Web node created successfully'),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, validation errors, location not found or not web'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function create(Request $request): Response
    {
        $admin = $request->attributes->get('user');
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        $requiredFields = ['name', 'fqdn', 'location_id'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        $errors = WebNode::validateWebNodeData($data, $requiredFields);
        if (!empty($errors)) {
            return ApiResponse::error(implode('; ', $errors), 'WEB_NODE_VALIDATION_FAILED', 400);
        }

        $locationId = $data['location_id'] ?? null;
        if (!$locationId || !is_numeric($locationId)) {
            return ApiResponse::error('Location ID must be a positive integer', 'INVALID_LOCATION_ID', 400);
        }

        $location = Location::getById((int) $locationId);
        if (!$location) {
            return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
        }

        if (($location['type'] ?? 'game') !== 'web') {
            return ApiResponse::error('Location must be a web hosting location', 'INVALID_LOCATION_TYPE', 400);
        }

        $data['location_id'] = (int) $locationId;
        $data['uuid'] = WebNode::generateUuid();
        $data['daemon_token_id'] = WebNode::generateDaemonTokenId();
        $data['daemon_token'] = WebNode::generateDaemonToken();

        if (!isset($data['scheme']) || !in_array($data['scheme'], ['http', 'https'], true)) {
            $data['scheme'] = 'https';
        }

        if (!isset($data['daemonListen']) || !is_numeric($data['daemonListen'])) {
            $data['daemonListen'] = 8989;
        }

        if (!isset($data['daemonBase']) || trim((string) $data['daemonBase']) === '') {
            $data['daemonBase'] = '/var/lib/featherquilld';
        }

        if (isset($data['id'])) {
            if (!is_int($data['id']) && !ctype_digit((string) $data['id'])) {
                return ApiResponse::error('ID must be an integer', 'INVALID_DATA_TYPE', 400);
            }
            $data['id'] = (int) $data['id'];
            if ($data['id'] < 1) {
                return ApiResponse::error('ID must be a positive integer', 'INVALID_DATA_LENGTH', 400);
            }
            if (WebNode::getWebNodeById($data['id'])) {
                return ApiResponse::error('Web node with this ID already exists', 'DUPLICATE_ID', 400);
            }
        }

        if (WebNode::getWebNodeByUuid($data['uuid'])) {
            return ApiResponse::error('Web node with this UUID already exists', 'UUID_ALREADY_EXISTS', 400);
        }

        $webNodeId = WebNode::createWebNode($data);
        if (!$webNodeId) {
            return ApiResponse::error('Failed to create web node', 'WEB_NODE_CREATE_FAILED', 400);
        }

        $webNode = WebNode::getWebNodeById($webNodeId);

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_web_node',
            'context' => 'Created web node: ' . ($webNode['name'] ?? $data['name']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        self::emitWebEvent(WebNodeEvent::onWebNodeCreated(), [
            'user_uuid' => $admin['uuid'] ?? null,
            'web_node_id' => (int) $webNodeId,
            'web_node' => WebNode::sanitizeForAdminResponse($webNode),
            'context' => ['source' => 'admin'],
        ]);

        return ApiResponse::success(['web_node' => WebNode::sanitizeForAdminResponse($webNode)], 'Web node created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/web-nodes/{id}',
        summary: 'Update web node',
        description: 'Update an existing web node. Only provided fields will be updated. Validates location existence and type.',
        tags: ['Admin - Web Nodes'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', description: 'Web Node ID', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/WebNodeUpdate')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Web node updated successfully'),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, no data provided, validation errors, location not found, or invalid location type'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Web node not found'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $admin = $request->attributes->get('user');
        $webNode = WebNode::getWebNodeById($id);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        unset($data['id'], $data['uuid'], $data['daemon_token_id'], $data['daemon_token']);

        if (isset($data['location_id'])) {
            $locationId = $data['location_id'];
            if (!$locationId || !is_numeric($locationId)) {
                return ApiResponse::error('Location ID must be a positive integer', 'INVALID_LOCATION_ID', 400);
            }

            $location = Location::getById((int) $locationId);
            if (!$location) {
                return ApiResponse::error('Location does not exist', 'LOCATION_NOT_FOUND', 400);
            }

            if (($location['type'] ?? 'game') !== 'web') {
                return ApiResponse::error('Location must be a web hosting location', 'INVALID_LOCATION_TYPE', 400);
            }

            $data['location_id'] = (int) $locationId;
        }

        $existingHeadersRaw = is_string($webNode['remoteCustomHeaders'] ?? null) ? $webNode['remoteCustomHeaders'] : null;
        $errors = WebNode::validateWebNodeData($data, [], $existingHeadersRaw);
        if (!empty($errors)) {
            return ApiResponse::error(implode('; ', $errors), 'WEB_NODE_VALIDATION_FAILED', 400);
        }

        $success = WebNode::updateWebNodeById($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update web node', 'WEB_NODE_UPDATE_FAILED', 400);
        }

        $webNode = WebNode::getWebNodeById($id);

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_web_node',
            'context' => 'Updated web node: ' . ($webNode['name'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        self::emitWebEvent(WebNodeEvent::onWebNodeUpdated(), [
            'user_uuid' => $admin['uuid'] ?? null,
            'web_node_id' => $id,
            'web_node' => WebNode::sanitizeForAdminResponse($webNode),
            'changed_fields' => array_keys($data),
            'context' => ['source' => 'admin'],
        ]);

        return ApiResponse::success(['web_node' => WebNode::sanitizeForAdminResponse($webNode)], 'Web node updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/web-nodes/{id}',
        summary: 'Delete web node',
        description: 'Permanently delete a web node from the database. This does not touch the FeatherQuilld daemon itself.',
        tags: ['Admin - Web Nodes'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', description: 'Web Node ID', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Web node deleted successfully'),
            new OA\Response(response: 400, description: 'Bad request - Invalid web node ID'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Web node not found'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $admin = $request->attributes->get('user');
        $webNode = WebNode::getWebNodeById($id);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $success = WebNode::hardDeleteWebNode($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete web node', 'WEB_NODE_DELETE_FAILED', 400);
        }

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_web_node',
            'context' => 'Deleted web node: ' . $webNode['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        self::emitWebEvent(WebNodeEvent::onWebNodeDeleted(), [
            'user_uuid' => $admin['uuid'] ?? null,
            'web_node_id' => $id,
            'web_node' => WebNode::sanitizeForAdminResponse($webNode),
            'context' => ['source' => 'admin'],
        ]);

        return ApiResponse::success([], 'Web node deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/web-nodes/{id}/reset-token',
        summary: 'Reset FeatherQuilld daemon token',
        description: 'Generate a new daemon token ID and secret for the web node. The FeatherQuilld daemon must be reconfigured with the new credentials.',
        tags: ['Admin - Web Nodes'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', description: 'Web Node ID', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Daemon token reset successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Web node not found'),
        ]
    )]
    public function resetToken(Request $request, int $id): Response
    {
        $admin = $request->attributes->get('user');
        $webNode = WebNode::getWebNodeById($id);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $tokenData = [
            'daemon_token_id' => WebNode::generateDaemonTokenId(),
            'daemon_token' => WebNode::generateDaemonToken(),
        ];

        $success = WebNode::updateWebNodeById($id, $tokenData);
        if (!$success) {
            return ApiResponse::error('Failed to reset web node token', 'WEB_NODE_TOKEN_RESET_FAILED', 400);
        }

        $webNode = WebNode::getWebNodeById($id);

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'reset_web_node_token',
            'context' => 'Reset daemon token for web node: ' . ($webNode['name'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        self::emitWebEvent(WebNodeEvent::onWebNodeKeyReset(), [
            'user_uuid' => $admin['uuid'] ?? null,
            'web_node_id' => $id,
            'web_node' => WebNode::sanitizeForAdminResponse($webNode),
            'context' => ['source' => 'admin'],
        ]);

        return ApiResponse::success(['web_node' => WebNode::sanitizeForAdminResponse($webNode)], 'Web node daemon token reset successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/web-nodes/{id}/setup-command',
        summary: 'Get FeatherQuilld setup command',
        description: 'Returns install command (step 1) and setup command (step 2) to configure the web node. Step 2 embeds full panel-generated config via join-data (Calagopus-style) or fetches from the panel.',
        tags: ['Admin - Web Nodes'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', description: 'Web Node ID', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Setup commands (install + config)'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Web node not found'),
        ]
    )]
    public function getSetupCommand(Request $request, int $id): Response
    {
        $webNode = WebNode::getWebNodeById($id);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $panelUrl = AppUrlHelper::wingsRemoteUrl();
        $configUrl = $panelUrl . FeatherQuilldConfigBuilder::REMOTE_CONFIG_PATH;
        $healthUrl = $panelUrl . FeatherQuilldConfigBuilder::REMOTE_HEALTH_PATH;
        $tokenId = $webNode['daemon_token_id'] ?? '';
        $tokenSecret = $webNode['daemon_token'] ?? '';
        $bearer = $tokenId . '.' . $tokenSecret;

        $joinYaml = WebNode::generateFeatherQuilldJoinConfigYaml($webNode, $panelUrl);
        $runtimeYaml = WebNode::generateFeatherQuilldRuntimeConfigYaml($webNode, $panelUrl);
        $commands = FeatherQuilldCapabilities::buildSetupCommands($configUrl, $bearer, $joinYaml);
        $defaults = FeatherQuilldCapabilities::defaults();

        $payload = [
            'panel_url' => $panelUrl,
            'config_url' => $configUrl,
            'health_url' => $healthUrl,
            'install_command' => $commands['install_command'],
            'setup_command' => $commands['setup_command'],
            'config_path_hint' => $commands['config_path_hint'],
            'daemon_type' => 'featherquilld',
            'daemon_display_name' => $defaults['display_name'],
            'systemd_unit' => $defaults['systemd_unit'],
            'join_config' => $joinYaml,
            'runtime_config' => $runtimeYaml,
            'config' => $runtimeYaml,
        ];

        if (!empty($commands['join_data'])) {
            $payload['join_data'] = $commands['join_data'];
        }

        return ApiResponse::success($payload, 'Setup command retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/web-nodes/{id}/config',
        summary: 'Get FeatherQuilld config YAML',
        description: 'Returns the full FeatherQuilld config.yml content for this web node (for manual copy or inspection).',
        tags: ['Admin - Web Nodes'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', description: 'Web Node ID', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'FeatherQuilld config YAML'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Web node not found'),
        ]
    )]
    public function getConfig(Request $request, int $id): Response
    {
        $webNode = WebNode::getWebNodeById($id);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $panelUrl = AppUrlHelper::wingsRemoteUrl();
        $joinYaml = WebNode::generateFeatherQuilldJoinConfigYaml($webNode, $panelUrl);
        $runtimeYaml = WebNode::generateFeatherQuilldRuntimeConfigYaml($webNode, $panelUrl);

        return ApiResponse::success([
            'join_config' => $joinYaml,
            'runtime_config' => $runtimeYaml,
            'config' => $runtimeYaml,
            'config_path_hint' => FeatherQuilldCapabilities::defaults()['config_path'],
        ], 'FeatherQuilld config retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/web-nodes/{id}/health',
        summary: 'Probe FeatherQuilld daemon health',
        description: 'Calls GET /api/system/health on the web node daemon using its stored credentials.',
        tags: ['Admin - Web Nodes'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', description: 'Web Node ID', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Health probe result'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Web node not found'),
        ]
    )]
    public function healthCheck(Request $request, int $id): Response
    {
        $webNode = WebNode::getWebNodeById($id);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $probe = FeatherQuilldProbe::probeHealth($webNode);

        return ApiResponse::success([
            'health' => $probe,
            'node' => [
                'id' => (int) $webNode['id'],
                'uuid' => (string) ($webNode['uuid'] ?? ''),
                'fqdn' => (string) ($webNode['fqdn'] ?? ''),
            ],
        ], $probe['status'] === 'healthy' ? 'Daemon is healthy' : 'Daemon is unhealthy', 200);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private static function emitWebEvent(string $event, array $payload): void
    {
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit($event, $payload);
        }
    }
}
