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
use App\Chat\DatabaseInstance;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

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
    public function getServerDatabases(Request $request, string $serverUuid): Response
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
    public function getServerDatabase(Request $request, string $serverUuid, int $databaseId): Response
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
    public function createServerDatabase(Request $request, string $serverUuid): Response
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
    public function updateServerDatabase(Request $request, string $serverUuid, int $databaseId): Response
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
    public function deleteServerDatabase(Request $request, string $serverUuid, int $databaseId): Response
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
    public function getAvailableDatabaseHosts(Request $request, string $serverUuid): Response
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
            // Connect to the external database host (not the panel's database)
            $dsn = '';
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 10, // 10 second timeout
            ];

            // Handle different database types like the admin controller does
            switch ($databaseHost['database_type']) {
                case 'mysql':
                case 'mariadb':
                    $dsn = "mysql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                    break;
                case 'postgresql':
                    $dsn = "pgsql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                    break;
                case 'mongodb':
                    throw new \Exception('MongoDB database creation not implemented yet');
                case 'redis':
                    throw new \Exception('Redis database creation not implemented yet');
                default:
                    throw new \Exception("Unsupported database type: {$databaseHost['database_type']}");
            }

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
            // Connect to the external database host (not the panel's database)
            $dsn = '';
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 10, // 10 second timeout
            ];

            // Handle different database types like the admin controller does
            switch ($databaseHost['database_type']) {
                case 'mysql':
                case 'mariadb':
                    $dsn = "mysql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                    break;
                case 'postgresql':
                    $dsn = "pgsql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                    break;
                case 'mongodb':
                    throw new \Exception('MongoDB database deletion not implemented yet');
                case 'redis':
                    throw new \Exception('Redis database deletion not implemented yet');
                default:
                    throw new \Exception("Unsupported database type: {$databaseHost['database_type']}");
            }

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
            $dsn = '';
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 10, // 10 second timeout
            ];

            switch ($databaseHost['database_type']) {
                case 'mysql':
                case 'mariadb':
                    $dsn = "mysql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                    break;
                case 'postgresql':
                    $dsn = "pgsql:host={$databaseHost['database_host']};port={$databaseHost['database_port']}";
                    break;
                case 'mongodb':
                    return [
                        'success' => false,
                        'message' => 'MongoDB connection testing not implemented yet',
                    ];
                case 'redis':
                    return [
                        'success' => false,
                        'message' => 'Redis connection testing not implemented yet',
                    ];
                default:
                    return [
                        'success' => false,
                        'message' => 'Unsupported database type',
                    ];
            }

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
