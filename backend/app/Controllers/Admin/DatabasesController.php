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

use App\Chat\Node;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\DatabaseInstance;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\DatabasesEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'Database',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Database ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Database name'),
        new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID'),
        new OA\Property(property: 'database_type', type: 'string', description: 'Database type', enum: ['mysql', 'postgresql', 'mariadb']),
        new OA\Property(property: 'database_port', type: 'integer', description: 'Database port', minimum: 1, maximum: 65535),
        new OA\Property(property: 'database_username', type: 'string', description: 'Database username'),
        new OA\Property(property: 'database_host', type: 'string', description: 'Database host'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'DatabaseCreate',
    type: 'object',
    required: ['name', 'node_id', 'database_type', 'database_port', 'database_username', 'database_password', 'database_host'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Database name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID', minimum: 1),
        new OA\Property(property: 'database_type', type: 'string', description: 'Database type', enum: ['mysql', 'postgresql', 'mariadb']),
        new OA\Property(property: 'database_port', type: 'integer', description: 'Database port', minimum: 1, maximum: 65535),
        new OA\Property(property: 'database_username', type: 'string', description: 'Database username', minLength: 1, maxLength: 255),
        new OA\Property(property: 'database_password', type: 'string', description: 'Database password', minLength: 1, maxLength: 255),
        new OA\Property(property: 'database_host', type: 'string', description: 'Database host', minLength: 1, maxLength: 255),
    ]
)]
#[OA\Schema(
    schema: 'DatabaseUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Database name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'node_id', type: 'integer', description: 'Node ID', minimum: 1),
        new OA\Property(property: 'database_type', type: 'string', description: 'Database type', enum: ['mysql', 'postgresql', 'mariadb']),
        new OA\Property(property: 'database_port', type: 'integer', description: 'Database port', minimum: 1, maximum: 65535),
        new OA\Property(property: 'database_username', type: 'string', description: 'Database username', minLength: 1, maxLength: 255),
        new OA\Property(property: 'database_password', type: 'string', description: 'Database password', minLength: 1, maxLength: 255),
        new OA\Property(property: 'database_host', type: 'string', description: 'Database host', minLength: 1, maxLength: 255),
    ]
)]
#[OA\Schema(
    schema: 'ConnectionTest',
    type: 'object',
    required: ['database_type', 'database_port', 'database_username', 'database_password', 'database_host'],
    properties: [
        new OA\Property(property: 'database_type', type: 'string', description: 'Database type', enum: ['mysql', 'postgresql', 'mariadb']),
        new OA\Property(property: 'database_port', type: 'integer', description: 'Database port', minimum: 1, maximum: 65535),
        new OA\Property(property: 'database_username', type: 'string', description: 'Database username'),
        new OA\Property(property: 'database_password', type: 'string', description: 'Database password'),
        new OA\Property(property: 'database_host', type: 'string', description: 'Database host'),
    ]
)]
class DatabasesController
{
    #[OA\Get(
        path: '/api/admin/databases',
        summary: 'Get all databases',
        description: 'Retrieve a paginated list of all database instances with optional filtering by node and search query.',
        tags: ['Admin - Databases'],
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
                description: 'Search term to filter databases by name',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'node_id',
                in: 'query',
                description: 'Filter databases by node ID',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Databases retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'databases', type: 'array', items: new OA\Items(ref: '#/components/schemas/Database')),
                        new OA\Property(property: 'pagination', type: 'object', properties: [
                            new OA\Property(property: 'current_page', type: 'integer'),
                            new OA\Property(property: 'per_page', type: 'integer'),
                            new OA\Property(property: 'total_records', type: 'integer'),
                            new OA\Property(property: 'total_pages', type: 'integer'),
                            new OA\Property(property: 'has_next', type: 'boolean'),
                            new OA\Property(property: 'has_prev', type: 'boolean'),
                            new OA\Property(property: 'from', type: 'integer'),
                            new OA\Property(property: 'to', type: 'integer'),
                        ]),
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
        $page = $request->query->get('page', 1);
        $limit = $request->query->get('limit', 10);
        $search = $request->query->get('search', '');
        $nodeId = $request->query->get('node_id');

        $databases = DatabaseInstance::searchDatabases(
            (int) $page,
            (int) $limit,
            $search,
            [
                'id',
                'name',
                'node_id',
                'database_type',
                'database_port',
                'database_username',
                'database_host',
                'created_at',
                'updated_at',
            ],
            'name',
            'ASC',
            $nodeId ? (int) $nodeId : null
        );

        // Get total count for pagination
        $total = DatabaseInstance::getDatabasesCount($search, $nodeId ? (int) $nodeId : null);

        // Calculate pagination metadata
        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'databases' => $databases,
            'pagination' => [
                'current_page' => (int) $page,
                'per_page' => (int) $limit,
                'total_records' => (int) $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from,
                'to' => $to,
            ],
            'search' => [
                'query' => $search,
                'has_results' => count($databases) > 0,
            ],
        ], 'Databases fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/databases/{id}',
        summary: 'Get database by ID',
        description: 'Retrieve a specific database instance by its ID with associated node information. Password is excluded from response.',
        tags: ['Admin - Databases'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Database ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Database retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'database', ref: '#/components/schemas/Database'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Invalid ID format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Database not found'),
        ]
    )]
    public function show(Request $request, int $id): Response
    {
        $database = DatabaseInstance::getDatabaseWithNode($id);
        if (!$database) {
            return ApiResponse::error('Database not found', 'DATABASE_NOT_FOUND', 404);
        }

        // Remove sensitive information
        unset($database['database_password']);

        return ApiResponse::success(['database' => $database], 'Database fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/databases',
        summary: 'Create new database',
        description: 'Create a new database instance. The system will test the database connection before creating the record.',
        tags: ['Admin - Databases'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/DatabaseCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Database created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'database_id', type: 'integer', description: 'ID of the created database'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid data or connection failed'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create database'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        // Required fields for database creation
        $requiredFields = [
            'name',
            'node_id',
            'database_type',
            'database_port',
            'database_username',
            'database_password',
            'database_host',
        ];

        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
        }

        // Validate data types and format
        foreach ($requiredFields as $field) {
            if (!is_string($data[$field]) && $field !== 'node_id' && $field !== 'database_port') {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE');
            }
            if ($field !== 'node_id' && $field !== 'database_port') {
                $data[$field] = trim($data[$field]);
            }
        }

        // Validate data length
        $lengthRules = [
            'name' => [1, 255],
            'database_username' => [1, 255],
            'database_password' => [1, 255],
            'database_host' => [1, 255],
        ];

        foreach ($lengthRules as $field => [$min, $max]) {
            $len = strlen($data[$field]);
            if ($len < $min) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $min characters long", 'INVALID_DATA_LENGTH');
            }
            if ($len > $max) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $max characters long", 'INVALID_DATA_LENGTH');
            }
        }

        // Validate node_id
        if (!is_numeric($data['node_id']) || (int) $data['node_id'] <= 0) {
            return ApiResponse::error('Node ID must be a positive number', 'INVALID_NODE_ID');
        }

        // Set default port if not provided or is 0
        if (!isset($data['database_port']) || (int) $data['database_port'] === 0) {
            $data['database_port'] = $this->getDefaultPort($data['database_type']);
        }

        // Validate database_port
        if (!is_numeric($data['database_port']) || (int) $data['database_port'] < 1 || (int) $data['database_port'] > 65535) {
            return ApiResponse::error('Database port must be between 1 and 65535', 'INVALID_DATABASE_PORT');
        }

        // Validate database_type
        $allowedTypes = ['mysql', 'postgresql', 'mariadb'];
        if (!in_array($data['database_type'], $allowedTypes)) {
            return ApiResponse::error('Invalid database type. Allowed types: ' . implode(', ', $allowedTypes), 'INVALID_DATABASE_TYPE');
        }

        // Check if node exists
        if (!Node::getNodeById($data['node_id'])) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Test database connection before creating
        $connectionTest = $this->testDatabaseConnection($data);
        if (!$connectionTest['success']) {
            return ApiResponse::error('Database connection failed: ' . $connectionTest['message'], 'CONNECTION_FAILED', 400);
        }

        $databaseId = DatabaseInstance::createDatabase($data);
        if (!$databaseId) {
            return ApiResponse::error('Failed to create database', 'FAILED_TO_CREATE_DATABASE', 500);
        }

        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'create_database',
            'context' => 'Created a new database ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                DatabasesEvent::onDatabaseCreated(),
                [
                    'database_id' => $databaseId,
                    'database_data' => $data,
                    'created_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success(['database_id' => $databaseId], 'Database created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/databases/{id}',
        summary: 'Update database',
        description: 'Update an existing database instance. Only provided fields will be updated.',
        tags: ['Admin - Databases'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Database ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/DatabaseUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Database updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid data'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Database or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update database'),
        ]
    )]
    public function update(Request $request, int $id): Response
    {
        $database = DatabaseInstance::getDatabaseById($id);
        if (!$database) {
            return ApiResponse::error('Database not found', 'DATABASE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Prevent updating primary key
        if (isset($data['id'])) {
            unset($data['id']);
        }

        // Validation rules (only for fields being updated)
        $lengthRules = [
            'name' => [1, 255],
            'database_username' => [1, 255],
            'database_password' => [1, 255],
            'database_host' => [1, 255],
        ];

        foreach ($data as $field => $value) {
            if (isset($lengthRules[$field])) {
                if (!is_string($value)) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE');
                }
                $len = strlen($value);
                [$min, $max] = $lengthRules[$field];
                if ($len < $min) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $min characters long", 'INVALID_DATA_LENGTH');
                }
                if ($len > $max) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $max characters long", 'INVALID_DATA_LENGTH');
                }
            }
        }

        // Validate node_id if updating
        if (isset($data['node_id'])) {
            if (!is_numeric($data['node_id']) || (int) $data['node_id'] <= 0) {
                return ApiResponse::error('Node ID must be a positive number', 'INVALID_NODE_ID');
            }
            if (!Node::getNodeById($data['node_id'])) {
                return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
            }
        }

        // Validate database_port if updating
        if (isset($data['database_port'])) {
            if (!is_numeric($data['database_port']) || (int) $data['database_port'] < 1 || (int) $data['database_port'] > 65535) {
                return ApiResponse::error('Database port must be between 1 and 65535', 'INVALID_DATABASE_PORT');
            }
        }

        // Validate database_type if updating
        if (isset($data['database_type'])) {
            $allowedTypes = ['mysql', 'postgresql', 'mariadb', 'mongodb', 'redis'];
            if (!in_array($data['database_type'], $allowedTypes)) {
                return ApiResponse::error('Invalid database type. Allowed types: ' . implode(', ', $allowedTypes), 'INVALID_DATABASE_TYPE');
            }
        }

        $updated = DatabaseInstance::updateDatabase($id, $data);
        if (!$updated) {
            return ApiResponse::error('Failed to update database', 'FAILED_TO_UPDATE_DATABASE', 500);
        }

        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'update_database',
            'context' => 'Updated database ' . $database['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                DatabasesEvent::onDatabaseUpdated(),
                [
                    'database' => $database,
                    'updated_data' => $data,
                    'updated_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success([], 'Database updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/databases/{id}',
        summary: 'Delete database',
        description: 'Permanently delete a database instance. This action cannot be undone.',
        tags: ['Admin - Databases'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Database ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Database deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Database not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete database'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        $database = DatabaseInstance::getDatabaseById($id);
        if (!$database) {
            return ApiResponse::error('Database not found', 'DATABASE_NOT_FOUND', 404);
        }

        if (DatabaseInstance::count(['database_host_id' => $id]) > 0) {
            return ApiResponse::error('Cannot delete database: there are servers assigned to this database. Please remove or reassign all servers before deleting the database.', 'DATABASE_HAS_SERVERS', 400);
        }
        $deleted = DatabaseInstance::hardDeleteDatabase($id);
        if (!$deleted) {
            return ApiResponse::error('Failed to delete database', 'FAILED_TO_DELETE_DATABASE', 500);
        }

        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'],
            'name' => 'delete_database',
            'context' => 'Deleted database ' . $database['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                DatabasesEvent::onDatabaseDeleted(),
                [
                    'database' => $database,
                    'deleted_by' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success([], 'Database deleted successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/databases/node/{nodeId}',
        summary: 'Get databases by node',
        description: 'Retrieve all database instances for a specific node with pagination and search capabilities.',
        tags: ['Admin - Databases'],
        parameters: [
            new OA\Parameter(
                name: 'nodeId',
                in: 'path',
                description: 'Node ID',
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
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 10)
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Search term to filter databases by name',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Databases for node retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'databases', type: 'array', items: new OA\Items(ref: '#/components/schemas/Database')),
                        new OA\Property(property: 'pagination', type: 'object', properties: [
                            new OA\Property(property: 'current_page', type: 'integer'),
                            new OA\Property(property: 'per_page', type: 'integer'),
                            new OA\Property(property: 'total_records', type: 'integer'),
                            new OA\Property(property: 'total_pages', type: 'integer'),
                            new OA\Property(property: 'has_next', type: 'boolean'),
                            new OA\Property(property: 'has_prev', type: 'boolean'),
                            new OA\Property(property: 'from', type: 'integer'),
                            new OA\Property(property: 'to', type: 'integer'),
                        ]),
                        new OA\Property(property: 'search', type: 'object', properties: [
                            new OA\Property(property: 'query', type: 'string'),
                            new OA\Property(property: 'has_results', type: 'boolean'),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Invalid node ID format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Node not found'),
        ]
    )]
    public function getByNode(Request $request, int $nodeId): Response
    {
        // Check if node exists
        if (!Node::getNodeById($nodeId)) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $page = $request->query->get('page', 1);
        $limit = $request->query->get('limit', 10);
        $search = $request->query->get('search', '');

        $databases = DatabaseInstance::searchDatabases(
            (int) $page,
            (int) $limit,
            $search,
            [
                'id',
                'name',
                'node_id',
                'database_type',
                'database_port',
                'database_username',
                'database_host',
                'created_at',
                'updated_at',
            ],
            'name',
            'ASC',
            $nodeId
        );

        // Get total count for pagination
        $total = DatabaseInstance::getDatabasesCount($search, $nodeId);

        // Calculate pagination metadata
        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'databases' => $databases,
            'pagination' => [
                'current_page' => (int) $page,
                'per_page' => (int) $limit,
                'total_records' => (int) $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from,
                'to' => $to,
            ],
            'search' => [
                'query' => $search,
                'has_results' => count($databases) > 0,
            ],
        ], 'Databases for node fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/databases/{id}/health',
        summary: 'Check database health',
        description: 'Perform a health check on a specific database instance by testing the connection.',
        tags: ['Admin - Databases'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Database ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Health check completed',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'database_id', type: 'integer', description: 'Database ID'),
                        new OA\Property(property: 'healthy', type: 'boolean', description: 'Whether the database is healthy'),
                        new OA\Property(property: 'message', type: 'string', description: 'Health check message'),
                        new OA\Property(property: 'response_time', type: 'number', nullable: true, description: 'Connection response time in milliseconds'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Invalid ID format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Database not found'),
        ]
    )]
    public function healthCheck(Request $request, int $id): Response
    {
        $database = DatabaseInstance::getDatabaseById($id);
        if (!$database) {
            return ApiResponse::error('Database not found', 'DATABASE_NOT_FOUND', 404);
        }

        $healthCheck = $this->testDatabaseConnection($database);

        return ApiResponse::success([
            'database_id' => $id,
            'healthy' => $healthCheck['success'],
            'message' => $healthCheck['message'],
            'response_time' => $healthCheck['response_time'] ?? null,
        ], 'Health check completed', 200);
    }

    #[OA\Post(
        path: '/api/admin/databases/test-connection',
        summary: 'Test database connection',
        description: 'Test a database connection without creating a database record. Useful for validating connection parameters.',
        tags: ['Admin - Databases'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ConnectionTest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Connection test completed',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', description: 'Whether the connection was successful'),
                        new OA\Property(property: 'message', type: 'string', description: 'Connection test message'),
                        new OA\Property(property: 'response_time', type: 'number', nullable: true, description: 'Connection response time in milliseconds'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function testConnection(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data)) {
            return ApiResponse::error('No connection data provided', 'NO_DATA_PROVIDED', 400);
        }

        $requiredFields = ['database_type', 'database_port', 'database_username', 'database_password', 'database_host'];
        $missingFields = [];

        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
        }

        $connectionTest = $this->testDatabaseConnection($data);

        return ApiResponse::success([
            'success' => $connectionTest['success'],
            'message' => $connectionTest['message'],
            'response_time' => $connectionTest['response_time'] ?? null,
        ], 'Connection test completed', 200);
    }

    private function testDatabaseConnection(array $data): array
    {
        $startTime = microtime(true);

        try {
            switch ($data['database_type']) {
                case 'mysql':
                case 'mariadb':
                    return $this->testPDOConnection(
                        "mysql:host={$data['database_host']};port={$data['database_port']}",
                        $data['database_username'],
                        $data['database_password'],
                        $startTime
                    );

                case 'postgresql':
                    return $this->testPDOConnection(
                        "pgsql:host={$data['database_host']};port={$data['database_port']}",
                        $data['database_username'],
                        $data['database_password'],
                        $startTime
                    );

                default:
                    return [
                        'success' => false,
                        'message' => 'Unsupported database type',
                    ];
            }
        } catch (\Exception $e) {
            $endTime = microtime(true);
            $responseTime = round(($endTime - $startTime) * 1000, 2);

            return [
                'success' => false,
                'message' => 'Unexpected error: ' . $e->getMessage(),
                'response_time' => $responseTime,
            ];
        }
    }

    private function testPDOConnection(string $dsn, string $username, string $password, float $startTime): array
    {
        try {
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 10, // 10 second timeout
            ];

            $pdo = new \PDO($dsn, $username, $password, $options);

            // Test the connection with a simple query
            $pdo->query('SELECT 1');

            $endTime = microtime(true);
            $responseTime = round(($endTime - $startTime) * 1000, 2);

            return [
                'success' => true,
                'message' => 'Connection successful',
                'response_time' => $responseTime,
            ];
        } catch (\PDOException $e) {
            $endTime = microtime(true);
            $responseTime = round(($endTime - $startTime) * 1000, 2);

            return [
                'success' => false,
                'message' => 'Connection failed: ' . $e->getMessage(),
                'response_time' => $responseTime,
            ];
        }
    }

    /**
     * Get default port for database type.
     *
     * @param string $databaseType Database type
     *
     * @return int Default port
     */
    private function getDefaultPort(string $databaseType): int
    {
        return match ($databaseType) {
            'mysql', 'mariadb' => 3306,
            'postgresql' => 5432,
            default => 3306,
        };
    }
}
