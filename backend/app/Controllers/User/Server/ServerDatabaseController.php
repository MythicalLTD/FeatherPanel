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

use App\App;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerDatabase;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\DatabaseInstance;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'ServerDatabase',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Database ID'),
        new OA\Property(property: 'server_id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'database_host_id', type: 'integer', description: 'Database host ID'),
        new OA\Property(property: 'database', type: 'string', description: 'Database name'),
        new OA\Property(property: 'username', type: 'string', description: 'Database username'),
        new OA\Property(property: 'password', type: 'string', description: 'Database password'),
        new OA\Property(property: 'remote', type: 'string', description: 'Remote access pattern'),
        new OA\Property(property: 'max_connections', type: 'integer', description: 'Maximum connections'),
        new OA\Property(property: 'database_host_name', type: 'string', description: 'Database host name'),
        new OA\Property(property: 'database_host', type: 'string', description: 'Database host address'),
        new OA\Property(property: 'database_port', type: 'integer', description: 'Database host port'),
        new OA\Property(property: 'database_type', type: 'string', description: 'Database type'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'DatabasePagination',
    type: 'object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
        new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
        new OA\Property(property: 'total', type: 'integer', description: 'Total number of records'),
        new OA\Property(property: 'last_page', type: 'integer', description: 'Last page number'),
        new OA\Property(property: 'from', type: 'integer', description: 'Starting record number'),
        new OA\Property(property: 'to', type: 'integer', description: 'Ending record number'),
    ]
)]
#[OA\Schema(
    schema: 'DatabaseCreateRequest',
    type: 'object',
    required: ['database_host_id', 'database_name'],
    properties: [
        new OA\Property(property: 'database_host_id', type: 'integer', description: 'Database host ID'),
        new OA\Property(property: 'database_name', type: 'string', description: 'Database name (without server prefix)'),
        new OA\Property(property: 'remote', type: 'string', nullable: true, description: 'Remote access pattern', default: '%'),
        new OA\Property(property: 'max_connections', type: 'integer', nullable: true, description: 'Maximum connections', default: 0),
    ]
)]
#[OA\Schema(
    schema: 'DatabaseCreateResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Created database ID'),
        new OA\Property(property: 'database_name', type: 'string', description: 'Generated database name'),
        new OA\Property(property: 'username', type: 'string', description: 'Generated username'),
        new OA\Property(property: 'password', type: 'string', description: 'Generated password'),
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
    ]
)]
#[OA\Schema(
    schema: 'DatabaseUpdateRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'remote', type: 'string', nullable: true, description: 'Remote access pattern'),
        new OA\Property(property: 'max_connections', type: 'integer', nullable: true, description: 'Maximum connections'),
    ]
)]
#[OA\Schema(
    schema: 'DatabaseHost',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Database host ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Database host name'),
        new OA\Property(property: 'database_host', type: 'string', description: 'Database host address'),
        new OA\Property(property: 'database_port', type: 'integer', description: 'Database host port'),
        new OA\Property(property: 'database_type', type: 'string', description: 'Database type'),
        new OA\Property(property: 'database_username', type: 'string', description: 'Database host username'),
        new OA\Property(property: 'node_name', type: 'string', nullable: true, description: 'Associated node name'),
        new OA\Property(property: 'healthy', type: 'boolean', description: 'Health status'),
    ]
)]
#[OA\Schema(
    schema: 'ConnectionTestResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'database_host_id', type: 'integer', description: 'Database host ID'),
        new OA\Property(property: 'healthy', type: 'boolean', description: 'Connection health status'),
        new OA\Property(property: 'message', type: 'string', description: 'Connection test message'),
        new OA\Property(property: 'response_time', type: 'number', nullable: true, description: 'Response time in milliseconds'),
    ]
)]
class ServerDatabaseController
{
    /**
     * Get all databases for a server.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/databases',
        summary: 'Get server databases',
        description: 'Retrieve all databases for a specific server that the user owns or has subuser access to, with pagination and search functionality.',
        tags: ['User - Server Databases'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'per_page',
                in: 'query',
                description: 'Number of records per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20)
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Search term to filter databases by name, username, or host',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server databases retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerDatabase')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/DatabasePagination'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve databases'),
        ]
    )]
    public function getServerDatabases(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Get page and per_page from query parameters
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(100, (int) $request->query->get('per_page', 20)));
        $search = $request->query->get('search', '');

        // Get server databases from database with pagination and details
        $serverDatabases = ServerDatabase::getServerDatabasesWithDetailsByServerId($server['id']);

        // Apply search filter if provided
        if (!empty($search)) {
            $serverDatabases = array_filter($serverDatabases, function ($database) use ($search) {
                return stripos($database['database'], $search) !== false
                    || stripos($database['username'], $search) !== false
                    || stripos($database['database_host_name'], $search) !== false;
            });
        }

        // Apply pagination
        $total = count($serverDatabases);
        $offset = ($page - 1) * $perPage;
        $serverDatabases = array_slice($serverDatabases, $offset, $perPage);

        return ApiResponse::success([
            'data' => $serverDatabases,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total),
            ],
        ]);
    }

    /**
     * Get a specific server database.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $databaseId The database ID
     *
     * @return Response The HTTP response
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/databases/{databaseId}',
        summary: 'Get specific database',
        description: 'Retrieve details of a specific database for a server that the user owns or has subuser access to.',
        tags: ['User - Server Databases'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'databaseId',
                in: 'path',
                description: 'Database ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Database details retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ServerDatabase')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or database not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve database'),
        ]
    )]
    public function getServerDatabase(Request $request, string $serverUuid, int $databaseId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Get database info with details
        $database = ServerDatabase::getServerDatabaseWithDetails($databaseId);
        if (!$database) {
            return ApiResponse::error('Database not found', 'DATABASE_NOT_FOUND', 404);
        }

        // Verify database belongs to this server
        if ($database['server_id'] != $server['id']) {
            return ApiResponse::error('Database not found', 'DATABASE_NOT_FOUND', 404);
        }

        return ApiResponse::success($database);
    }

    /**
     * Create a new server database.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/databases',
        summary: 'Create database',
        description: 'Create a new database for a server. Checks database limits and creates database on the specified host.',
        tags: ['User - Server Databases'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/DatabaseCreateRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Database created successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/DatabaseCreateResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID, database limit reached, or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or database host not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create database'),
        ]
    )]
    public function createServerDatabase(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Check database limit
        $currentDatabases = count(ServerDatabase::getServerDatabasesWithDetailsByServerId($server['id']));
        $databaseLimit = (int) ($server['database_limit'] ?? 1);

        if ($currentDatabases >= $databaseLimit) {
            return ApiResponse::error('Database limit reached', 'DATABASE_LIMIT_REACHED', 400);
        }

        // Parse request body
        $body = json_decode($request->getContent(), true);
        if (!$body) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        // Validate required fields
        $required = ['database_host_id', 'database_name'];
        foreach ($required as $field) {
            if (!isset($body[$field]) || trim($body[$field]) === '') {
                return ApiResponse::error("Missing required field: {$field}", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        // Get database host info
        $databaseHost = DatabaseInstance::getDatabaseById($body['database_host_id']);
        if (!$databaseHost) {
            return ApiResponse::error('Database host not found', 'DATABASE_HOST_NOT_FOUND', 404);
        }

        // Generate database name: s{server_id}_{database_name}
        $databaseName = 's' . $server['id'] . '_' . $body['database_name'];

        // Generate username: u{server_id}_{random_string}
        $username = 'u' . $server['id'] . '_' . $this->generateRandomString(10);

        // Generate password
        $password = $this->generateRandomString(16);

        try {
            // Create database and user on the database host
            $this->createDatabaseOnHost($databaseHost, $databaseName, $username, $password);

            // Create server database record
            $databaseData = [
                'server_id' => $server['id'],
                'database_host_id' => $body['database_host_id'],
                'database' => $databaseName,
                'username' => $username,
                'password' => $password,
                'remote' => $body['remote'] ?? '%',
                'max_connections' => $body['max_connections'] ?? 0,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $databaseId = ServerDatabase::createServerDatabase($databaseData);
            if (!$databaseId) {
                // Rollback: delete the created database and user
                $this->deleteDatabaseFromHost($databaseHost, $databaseName, $username);

                return ApiResponse::error('Failed to create server database record', 'CREATION_FAILED', 500);
            }

            // Log activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'event' => 'database_created',
                'metadata' => json_encode([
                    'database_id' => $databaseId,
                    'database_name' => $databaseName,
                    'username' => $username,
                    'database_host_name' => $databaseHost['name'],
                ]),
                'user_id' => $request->get('user')['id'] ?? null,
            ]);

            // Emit event
            global $eventManager;
            $eventManager->emit(
                ServerEvent::onServerDatabaseCreated(),
                ['user_uuid' => $request->get('user')['uuid'], 'server_uuid' => $server['uuid'], 'database_id' => $databaseId]
            );

            return ApiResponse::success([
                'id' => $databaseId,
                'database_name' => $databaseName,
                'username' => $username,
                'password' => $password,
                'message' => 'Database created successfully',
            ]);

        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to create database: ' . $e->getMessage());

            return ApiResponse::error('Failed to create database: ' . $e->getMessage(), 'CREATION_FAILED', 500);
        }
    }

    /**
     * Update a server database.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $databaseId The database ID
     *
     * @return Response The HTTP response
     */
    #[OA\Patch(
        path: '/api/user/servers/{uuidShort}/databases/{databaseId}',
        summary: 'Update database',
        description: 'Update database settings including remote access pattern and maximum connections.',
        tags: ['User - Server Databases'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'databaseId',
                in: 'path',
                description: 'Database ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/DatabaseUpdateRequest')
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
            new OA\Response(response: 400, description: 'Bad request - Missing parameters or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or database not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update database'),
        ]
    )]
    public function updateServerDatabase(Request $request, string $serverUuid, int $databaseId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Get database info
        $database = ServerDatabase::getServerDatabaseById($databaseId);
        if (!$database) {
            return ApiResponse::error('Database not found', 'DATABASE_NOT_FOUND', 404);
        }

        // Verify database belongs to this server
        if ($database['server_id'] != $server['id']) {
            return ApiResponse::error('Database not found', 'DATABASE_NOT_FOUND', 404);
        }

        // Parse request body
        $body = json_decode($request->getContent(), true);
        if (!$body) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        // Prepare update data
        $updateData = [];
        if (isset($body['remote'])) {
            $updateData['remote'] = $body['remote'];
        }
        if (isset($body['max_connections'])) {
            $updateData['max_connections'] = (int) $body['max_connections'];
        }

        if (empty($updateData)) {
            return ApiResponse::error('No valid fields to update', 'NO_VALID_FIELDS', 400);
        }

        // Update the database
        if (!ServerDatabase::updateServerDatabase($databaseId, $updateData)) {
            return ApiResponse::error('Failed to update database', 'UPDATE_FAILED', 500);
        }

        // Log activity
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'database_updated',
            'metadata' => json_encode([
                'database_id' => $databaseId,
                'database_name' => $database['database'],
                'updated_fields' => array_keys($updateData),
            ]),
            'user_id' => $request->get('user')['id'] ?? null,
        ]);

        // Emit event
        global $eventManager;
        $eventManager->emit(
            ServerEvent::onServerDatabaseUpdated(),
            ['user_uuid' => $request->get('user')['uuid'], 'server_uuid' => $server['uuid'], 'database_id' => $databaseId]
        );

        return ApiResponse::success([
            'message' => 'Database updated successfully',
        ]);
    }

    /**
     * Delete a server database.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $databaseId The database ID
     *
     * @return Response The HTTP response
     */
    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/databases/{databaseId}',
        summary: 'Delete database',
        description: 'Permanently delete a database from a server. This action cannot be undone.',
        tags: ['User - Server Databases'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'databaseId',
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
            new OA\Response(response: 400, description: 'Bad request - Missing parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, database, or database host not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete database'),
        ]
    )]
    public function deleteServerDatabase(Request $request, string $serverUuid, int $databaseId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Get database info with details
        $database = ServerDatabase::getServerDatabaseWithDetails($databaseId);
        if (!$database) {
            return ApiResponse::error('Database not found', 'DATABASE_NOT_FOUND', 404);
        }

        // Verify database belongs to this server
        if ($database['server_id'] != $server['id']) {
            return ApiResponse::error('Database not found', 'DATABASE_NOT_FOUND', 404);
        }

        // Get database host info
        $databaseHost = DatabaseInstance::getDatabaseById($database['database_host_id']);
        if (!$databaseHost) {
            return ApiResponse::error('Database host not found', 'DATABASE_HOST_NOT_FOUND', 404);
        }

        try {
            // Delete database and user from the database host
            $this->deleteDatabaseFromHost($databaseHost, $database['database'], $database['username']);

            // Delete server database record
            if (!ServerDatabase::deleteServerDatabase($databaseId)) {
                return ApiResponse::error('Failed to delete server database record', 'DELETE_FAILED', 500);
            }

            // Log activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'event' => 'database_deleted',
                'metadata' => json_encode([
                    'database_id' => $databaseId,
                    'database_name' => $database['database'],
                    'username' => $database['username'],
                    'database_host_name' => $database['database_host_name'],
                ]),
                'user_id' => $request->get('user')['id'] ?? null,
            ]);

            // Emit event
            global $eventManager;
            $eventManager->emit(
                ServerEvent::onServerDatabaseDeleted(),
                ['user_uuid' => $request->get('user')['uuid'], 'server_uuid' => $server['uuid'], 'database_id' => $databaseId]
            );

            return ApiResponse::success([
                'message' => 'Database deleted successfully',
            ]);

        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete database: ' . $e->getMessage());

            return ApiResponse::error('Failed to delete database: ' . $e->getMessage(), 'DELETE_FAILED', 500);
        }
    }

    /**
     * Get available database hosts.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/databases/hosts',
        summary: 'Get available database hosts',
        description: 'Retrieve all available database hosts that can be used for creating databases.',
        tags: ['User - Server Databases'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Database hosts retrieved successfully',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/DatabaseHost')
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve database hosts'),
        ]
    )]
    public function getAvailableDatabaseHosts(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        }

        // Get all available database hosts
        $databaseHosts = DatabaseInstance::getAllDatabasesWithNode();

        return ApiResponse::success($databaseHosts);
    }

    /**
     * Test connection to a database host.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $databaseHostId The database host ID to test
     *
     * @return Response The HTTP response
     */
    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/databases/hosts/{databaseHostId}/test',
        summary: 'Test database host connection',
        description: 'Test the connection to a specific database host to verify connectivity and performance.',
        tags: ['User - Server Databases'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'databaseHostId',
                in: 'path',
                description: 'Database host ID to test',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Connection test completed',
                content: new OA\JsonContent(ref: '#/components/schemas/ConnectionTestResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 404, description: 'Not found - Server or database host not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to test connection'),
        ]
    )]
    public function testDatabaseHostConnection(Request $request, string $serverUuid, int $databaseHostId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // TODO: Add user permission check here
        // if (!$this->userCanAccessServer($request, $server)) {
        //     return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        // }

        // Get database host info
        $databaseHost = DatabaseInstance::getDatabaseById($databaseHostId);
        if (!$databaseHost) {
            return ApiResponse::error('Database host not found', 'DATABASE_HOST_NOT_FOUND', 404);
        }

        // Test the connection
        $connectionTest = $this->testDatabaseConnection($databaseHost);

        return ApiResponse::success([
            'database_host_id' => $databaseHostId,
            'healthy' => $connectionTest['success'],
            'message' => $connectionTest['message'],
            'response_time' => $connectionTest['response_time'] ?? null,
        ], 'Connection test completed', 200);
    }

    /**
     * Centralized check using ServerGateway with current request user.
     */
    private function userCanAccessServer(Request $request, array $server): bool
    {
        $currentUser = $request->get('user');
        if (!$currentUser || !isset($currentUser['uuid'])) {
            return false;
        }

        return ServerGateway::canUserAccessServer($currentUser['uuid'], $server['uuid']);
    }

    /**
     * Create database and user on the database host.
     *
     * @param array $databaseHost Database host information
     * @param string $databaseName Database name to create
     * @param string $username Username to create
     * @param string $password Password for the user
     *
     * @throws \Exception If creation fails
     */
    private function createDatabaseOnHost(array $databaseHost, string $databaseName, string $username, string $password): void
    {
        try {
            // Connect directly to the external database host (not the panel's database)
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 10, // 10 second timeout
            ];

            // Handle different database types
            $dsn = match ($databaseHost['database_type']) {
                'mysql', 'mariadb' => "mysql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}",
                'postgresql' => "pgsql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}",
                'mongodb' => throw new \Exception('MongoDB database creation not implemented yet'),
                'redis' => throw new \Exception('Redis database creation not implemented yet'),
                default => throw new \Exception("Unsupported database type: {$databaseHost['database_type']}"),
            };

            $pdo = new \PDO($dsn, $databaseHost['database_username'], $databaseHost['database_password'], $options);

            // For MySQL/MariaDB
            if (in_array($databaseHost['database_type'], ['mysql', 'mariadb'])) {
                // Create the database
                $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

                // Create the user
                $pdo->exec("CREATE USER IF NOT EXISTS '{$username}'@'%' IDENTIFIED BY '{$password}'");

                // Grant privileges to the user on the specific database
                $pdo->exec("GRANT ALL PRIVILEGES ON `{$databaseName}`.* TO '{$username}'@'%'");

                // Flush privileges
                $pdo->exec('FLUSH PRIVILEGES');
            }
            // For PostgreSQL (if implemented in the future)
            elseif ($databaseHost['database_type'] === 'postgresql') {
                // Create the database
                $pdo->exec("CREATE DATABASE \"{$databaseName}\" WITH ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8'");

                // Create the user
                $pdo->exec("CREATE USER \"{$username}\" WITH PASSWORD '{$password}'");

                // Grant privileges to the user on the specific database
                $pdo->exec("GRANT ALL PRIVILEGES ON DATABASE \"{$databaseName}\" TO \"{$username}\"");
            }

        } catch (\PDOException $e) {
            throw new \Exception("Failed to create database on host {$databaseHost['name']}: " . $e->getMessage());
        }
    }

    /**
     * Delete database and user from the database host.
     *
     * @param array $databaseHost Database host information
     * @param string $databaseName Database name to delete
     * @param string $username Username to delete
     *
     * @throws \Exception If deletion fails
     */
    private function deleteDatabaseFromHost(array $databaseHost, string $databaseName, string $username): void
    {
        try {
            // Connect directly to the external database host (not the panel's database)
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 10, // 10 second timeout
            ];

            // Handle different database types
            $dsn = match ($databaseHost['database_type']) {
                'mysql', 'mariadb' => "mysql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}",
                'postgresql' => "pgsql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}",
                'mongodb' => throw new \Exception('MongoDB database deletion not implemented yet'),
                'redis' => throw new \Exception('Redis database deletion not implemented yet'),
                default => throw new \Exception("Unsupported database type: {$databaseHost['database_type']}"),
            };

            $pdo = new \PDO($dsn, $databaseHost['database_username'], $databaseHost['database_password'], $options);

            // For MySQL/MariaDB
            if (in_array($databaseHost['database_type'], ['mysql', 'mariadb'])) {
                // Revoke privileges from the user
                $pdo->exec("REVOKE ALL PRIVILEGES ON `{$databaseName}`.* FROM '{$username}'@'%'");

                // Drop the user
                $pdo->exec("DROP USER IF EXISTS '{$username}'@'%'");

                // Drop the database
                $pdo->exec("DROP DATABASE IF EXISTS `{$databaseName}`");

                // Flush privileges
                $pdo->exec('FLUSH PRIVILEGES');
            }
            // For PostgreSQL (if implemented in the future)
            elseif ($databaseHost['database_type'] === 'postgresql') {
                // Revoke privileges from the user
                $pdo->exec("REVOKE ALL PRIVILEGES ON DATABASE \"{$databaseName}\" FROM \"{$username}\"");

                // Drop the user
                $pdo->exec("DROP USER IF EXISTS \"{$username}\"");

                // Drop the database
                $pdo->exec("DROP DATABASE IF EXISTS \"{$databaseName}\"");
            }

        } catch (\PDOException $e) {
            throw new \Exception("Failed to delete database from host {$databaseHost['name']}: " . $e->getMessage());
        }
    }

    /**
     * Test database connection to an external host.
     *
     * @param array $databaseHost Database host information
     *
     * @return array Connection test result
     */
    private function testDatabaseConnection(array $databaseHost): array
    {
        $startTime = microtime(true);

        try {
            // Connect directly to the external database host (not the panel's database)
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 10, // 10 second timeout
            ];

            // Handle different database types
            $dsn = match ($databaseHost['database_type']) {
                'mysql', 'mariadb' => "mysql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}",
                'postgresql' => "pgsql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}",
                'mongodb' => throw new \Exception('MongoDB connection testing not implemented yet'),
                'redis' => throw new \Exception('Redis connection testing not implemented yet'),
                default => throw new \Exception("Unsupported database type: {$databaseHost['database_type']}"),
            };

            $pdo = new \PDO($dsn, $databaseHost['database_username'], $databaseHost['database_password'], $options);

            // Test the connection with a simple query
            $pdo->query('SELECT 1');

            $endTime = microtime(true);
            $responseTime = round(($endTime - $startTime) * 1000, 2); // Convert to milliseconds

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

    /**
     * Generate a random string.
     *
     * @param int $length Length of the string
     *
     * @return string Random string
     */
    private function generateRandomString(int $length): string
    {
        $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $randomString = '';

        for ($i = 0; $i < $length; ++$i) {
            $randomString .= $characters[mt_rand(0, strlen($characters) - 1)];
        }

        return $randomString;
    }
}
