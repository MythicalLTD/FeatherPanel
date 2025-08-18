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

use App\Chat\Node;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Chat\DatabaseInstance;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class DatabasesController
{
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

        // Validate database_port
        if (!is_numeric($data['database_port']) || (int) $data['database_port'] < 1 || (int) $data['database_port'] > 65535) {
            return ApiResponse::error('Database port must be between 1 and 65535', 'INVALID_DATABASE_PORT');
        }

        // Validate database_type
        $allowedTypes = ['mysql', 'postgresql', 'mariadb', 'mongodb', 'redis'];
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

        return ApiResponse::success(['database_id' => $databaseId], 'Database created successfully', 201);
    }

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

        return ApiResponse::success([], 'Database updated successfully', 200);
    }

    public function delete(Request $request, int $id): Response
    {
        $database = DatabaseInstance::getDatabaseById($id);
        if (!$database) {
            return ApiResponse::error('Database not found', 'DATABASE_NOT_FOUND', 404);
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

        return ApiResponse::success([], 'Database deleted successfully', 200);
    }

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
            $dsn = '';
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 10, // 10 second timeout
            ];

            switch ($data['database_type']) {
                case 'mysql':
                case 'mariadb':
                    $dsn = "mysql:host={$data['database_host']};port={$data['database_port']}";
                    break;
                case 'postgresql':
                    $dsn = "pgsql:host={$data['database_host']};port={$data['database_port']}";
                    break;
                case 'mongodb':
                    // MongoDB connection test would require MongoDB extension
                    return [
                        'success' => false,
                        'message' => 'MongoDB connection testing not implemented yet',
                    ];
                case 'redis':
                    // Redis connection test would require Redis extension
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

            $pdo = new \PDO($dsn, $data['database_username'], $data['database_password'], $options);

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
}
