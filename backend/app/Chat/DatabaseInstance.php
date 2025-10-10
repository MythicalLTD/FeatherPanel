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

namespace App\Chat;

use App\App;

/**
 * DatabaseInstance service/model for CRUD operations on the featherpanel_databases table.
 */
class DatabaseInstance
{
    /**
     * @var string The databases table name
     */
    private static string $table = 'featherpanel_databases';

    /**
     * Whitelist of allowed field names for SQL queries to prevent injection.
     */
    private static array $allowedFields = [
        'name',
        'node_id',
        'database_type',
        'database_port',
        'database_username',
        'database_password',
        'database_host',
    ];

    /**
     * Create a new database instance.
     *
     * @param array $data Associative array of database fields
     *
     * @return int|false The new database's ID or false on failure
     */
    public static function createDatabase(array $data): int|false
    {
        // Required fields for database creation
        $required = [
            'name',
            'node_id',
            'database_type',
            'database_port',
            'database_username',
            'database_password',
            'database_host',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Missing required fields: ' . implode(', ', $missing) . ' for database: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for database: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                return false;
            }

            // Special validation for different field types
            if ($field === 'node_id') {
                if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid node_id: ' . $data[$field] . ' for database: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } elseif ($field === 'database_port') {
                if (!is_numeric($data[$field]) || (int) $data[$field] < 1 || (int) $data[$field] > 65535) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid database_port: ' . $data[$field] . ' for database: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } elseif ($field === 'database_type') {
                $allowedTypes = ['mysql', 'postgresql', 'mariadb', 'mongodb', 'redis'];
                if (!in_array($data[$field], $allowedTypes)) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid database_type: ' . $data[$field] . ' for database: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } else {
                // String fields validation
                if (!is_string($data[$field]) || trim($data[$field]) === '') {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for database: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            }
        }

        // Validate node_id exists
        if (!Node::getNodeById($data['node_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid node_id: ' . $data['node_id'] . ' for database: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Encrypt sensitive fields before storing
        if (isset($data['database_password']) && is_string($data['database_password']) && $data['database_password'] !== '') {
            $data['database_password'] = App::getInstance(true)->encryptValue($data['database_password']);
        }

        // Filter data to only include allowed fields
        $filteredData = array_intersect_key($data, array_flip(self::$allowedFields));

        $pdo = Database::getPdoConnection();
        $fields = array_keys($filteredData);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (`' . implode('`,`', $fields) . '`) VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($filteredData)) {
            return (int) $pdo->lastInsertId();
        }

        $sanitizedData = self::sanitizeDataForLogging($data);
        App::getInstance(true)->getLogger()->error('Failed to create database: ' . $sql . ' for database: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData) . ' and error: ' . json_encode($stmt->errorInfo()));

        return false;
    }

    /**
     * Fetch a database by ID.
     */
    public static function getDatabaseById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
        if ($row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $row;
    }

    /**
     * Fetch databases by node ID.
     */
    public static function getDatabasesByNodeId(int $nodeId): array
    {
        if ($nodeId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE node_id = :node_id ORDER BY name ASC');
        $stmt->execute(['node_id' => $nodeId]);

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $rows;
    }

    /**
     * Fetch all databases with optional filtering.
     */
    public static function getAllDatabases(): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;

        $sql .= ' ORDER BY name ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute();

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $rows;
    }

    /**
     * Search databases with pagination and filtering.
     */
    public static function searchDatabases(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        array $fields = [],
        string $sortBy = 'name',
        string $sortOrder = 'ASC',
        ?int $nodeId = null,
    ): array {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;
        $params = [];

        $sql = 'SELECT d.*, n.name as node_name FROM ' . self::$table . ' d';
        $sql .= ' LEFT JOIN featherpanel_nodes n ON d.node_id = n.id';
        $sql .= ' WHERE 1=1';

        if (!empty($search)) {
            $sql .= ' AND (d.name LIKE :search OR d.database_host LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($nodeId !== null) {
            $sql .= ' AND d.node_id = :node_id';
            $params['node_id'] = $nodeId;
        }

        $sql .= ' ORDER BY d.' . $sortBy . ' ' . $sortOrder;
        $sql .= ' LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $rows;
    }

    /**
     * Get total count of databases with optional filtering.
     */
    public static function getDatabasesCount(
        string $search = '',
        ?int $nodeId = null,
    ): int {
        $pdo = Database::getPdoConnection();
        $params = [];

        $sql = 'SELECT COUNT(*) FROM ' . self::$table . ' WHERE 1=1';

        if (!empty($search)) {
            $sql .= ' AND (name LIKE :search OR database_host LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($nodeId !== null) {
            $sql .= ' AND node_id = :node_id';
            $params['node_id'] = $nodeId;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Update a database by ID.
     */
    public static function updateDatabase(int $id, array $data): bool
    {
        if ($id <= 0) {
            App::getInstance(true)->getLogger()->error('Invalid ID: ' . $id . ' for database update with data: ' . json_encode($data));

            return false;
        }

        // Validate node_id if provided
        if (isset($data['node_id']) && !Node::getNodeById($data['node_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid node_id: ' . $data['node_id'] . ' for database update with data: ' . json_encode($data));

            return false;
        }

        // Validate database_type if provided
        if (isset($data['database_type'])) {
            $allowedTypes = ['mysql', 'postgresql', 'mariadb', 'mongodb', 'redis'];
            if (!in_array($data['database_type'], $allowedTypes)) {
                App::getInstance(true)->getLogger()->error('Invalid database_type: ' . $data['database_type'] . ' for database update with data: ' . json_encode($data));

                return false;
            }
        }

        // Validate database_port if provided
        if (isset($data['database_port'])) {
            if (!is_numeric($data['database_port']) || (int) $data['database_port'] < 1 || (int) $data['database_port'] > 65535) {
                App::getInstance(true)->getLogger()->error('Invalid database_port: ' . $data['database_port'] . ' for database update with data: ' . json_encode($data));

                return false;
            }
        }

        // Encrypt sensitive fields before storing
        if (isset($data['database_password']) && is_string($data['database_password']) && $data['database_password'] !== '') {
            $data['database_password'] = App::getInstance(true)->encryptValue($data['database_password']);
        }

        // Filter data to only include allowed fields
        $filteredData = array_intersect_key($data, array_flip(self::$allowedFields));

        $pdo = Database::getPdoConnection();
        $fields = array_keys($filteredData);
        $set = array_map(fn ($f) => "`$f` = :$f", $fields);
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(',', $set) . ' WHERE id = :id';

        $params = $filteredData;
        $params['id'] = $id;

        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /**
     * Hard delete a database by ID.
     */
    public static function hardDeleteDatabase(int $id): bool
    {
        if ($id <= 0) {
            App::getInstance(true)->getLogger()->error('Invalid ID: ' . $id . ' for database deletion');

            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get table columns information.
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DESCRIBE ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get database with node information.
     */
    public static function getDatabaseWithNode(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT d.*, n.name as node_name, n.description as node_description 
            FROM ' . self::$table . ' d 
            LEFT JOIN featherpanel_nodes n ON d.node_id = n.id 
            WHERE d.id = :id LIMIT 1
        ');
        $stmt->execute(['id' => $id]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
        if ($row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $row;
    }

    /**
     * Get all databases with node information.
     */
    public static function getAllDatabasesWithNode(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT d.*, n.name as node_name, n.description as node_description 
            FROM ' . self::$table . ' d 
            LEFT JOIN featherpanel_nodes n ON d.node_id = n.id 
            ORDER BY d.name ASC
        ');
        $stmt->execute();

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $rows;
    }

    public static function count(array $conditions = []): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE ' . implode(' AND ', array_map(fn ($k) => "$k = :$k", array_keys($conditions))));
        $stmt->execute($conditions);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Sanitize data for logging by excluding sensitive fields.
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sensitiveFields = [
            'database_password',
        ];

        $sanitized = $data;
        foreach ($sensitiveFields as $field) {
            if (isset($sanitized[$field])) {
                $sanitized[$field] = '[REDACTED]';
            }
        }

        return $sanitized;
    }

    /**
     * Decrypt sensitive fields for application usage.
     */
    private static function decryptSensitiveFields(array $row): array
    {
        try {
            if (isset($row['database_password']) && is_string($row['database_password']) && $row['database_password'] !== '') {
                $row['database_password'] = App::getInstance(true)->decryptValue($row['database_password']);
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to decrypt database sensitive fields: ' . $e->getMessage());
        }

        return $row;
    }
}
