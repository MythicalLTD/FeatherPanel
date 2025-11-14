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
 * ServerDatabase service/model for CRUD operations on the featherpanel_server_databases table.
 */
class ServerDatabase
{
    /**
     * @var string The server_databases table name
     */
    private static string $table = 'featherpanel_server_databases';

    /**
     * Create a new server database.
     *
     * @param array $data Associative array of database fields
     *
     * @return int|false The new database's ID or false on failure
     */
    public static function createServerDatabase(array $data): int | false
    {
        // Required fields for server database creation
        $required = [
            'server_id',
            'database_host_id',
            'database',
            'username',
            'password',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Missing required fields: ' . implode(', ', $missing) . ' for server database: ' . $data['database'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for server database: ' . $data['database'] . ' with data: ' . json_encode($sanitizedData));

                return false;
            }

            // Special validation for different field types
            if (in_array($field, ['server_id', 'database_host_id'])) {
                if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid ' . $field . ': ' . $data[$field] . ' for server database: ' . $data['database'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } else {
                // String fields validation
                if (!is_string($data[$field]) || trim($data[$field]) === '') {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for server database: ' . $data['database'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            }
        }

        // Validate server_id exists
        if (!Server::getServerById($data['server_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid server_id: ' . $data['server_id'] . ' for server database: ' . $data['database'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Validate database_host_id exists
        if (!DatabaseInstance::getDatabaseById($data['database_host_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid database_host_id: ' . $data['database_host_id'] . ' for server database: ' . $data['database'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Check if database already exists for this server
        if (self::getServerDatabaseByServerAndName($data['server_id'], $data['database'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Database already exists for server: ' . $data['server_id'] . ' with name: ' . $data['database'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Set default values for optional fields
        $data['remote'] = $data['remote'] ?? '%';
        $data['max_connections'] = $data['max_connections'] ?? 0;
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($data)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Fetch a server database by ID.
     */
    public static function getServerDatabaseById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get all server databases.
     */
    public static function getAllServerDatabases(): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $stmt = $pdo->query($sql);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get server databases by server ID.
     */
    public static function getServerDatabasesByServerId(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY created_at DESC');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get server databases by database host ID.
     */
    public static function getServerDatabasesByDatabaseHostId(int $databaseHostId): array
    {
        if ($databaseHostId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE database_host_id = :database_host_id ORDER BY created_at DESC');
        $stmt->execute(['database_host_id' => $databaseHostId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get server database by server ID and database name.
     */
    public static function getServerDatabaseByServerAndName(int $serverId, string $databaseName): ?array
    {
        if ($serverId <= 0 || empty($databaseName)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id AND database = :database LIMIT 1');
        $stmt->execute([
            'server_id' => $serverId,
            'database' => $databaseName,
        ]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get server database by username.
     */
    public static function getServerDatabaseByUsername(string $username): ?array
    {
        if (empty($username)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE username = :username LIMIT 1');
        $stmt->execute(['username' => $username]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Update a server database.
     */
    public static function updateServerDatabase(int $id, array $data): bool
    {
        if ($id <= 0) {
            return false;
        }

        // Remove immutable fields
        unset($data['id'], $data['created_at']);

        // Set updated_at
        $data['updated_at'] = date('Y-m-d H:i:s');

        // Validate data if provided
        if (isset($data['server_id']) && (!is_numeric($data['server_id']) || (int) $data['server_id'] <= 0)) {
            return false;
        }

        if (isset($data['database_host_id']) && (!is_numeric($data['database_host_id']) || (int) $data['database_host_id'] <= 0)) {
            return false;
        }

        if (isset($data['max_connections']) && (!is_numeric($data['max_connections']) || (int) $data['max_connections'] < 0)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $setClause = implode(', ', array_map(fn ($f) => $f . ' = :' . $f, $fields));
        $sql = 'UPDATE ' . self::$table . ' SET ' . $setClause . ' WHERE id = :id';
        $data['id'] = $id;
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($data);
    }

    public static function getDatabasesByServerId(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY created_at DESC');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Delete a server database.
     */
    public static function deleteServerDatabase(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Delete all server databases for a specific server.
     */
    public static function deleteServerDatabasesByServerId(int $serverId): bool
    {
        if ($serverId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE server_id = :server_id');

        return $stmt->execute(['server_id' => $serverId]);
    }

    /**
     * Delete all server databases for a specific database host.
     */
    public static function deleteServerDatabasesByDatabaseHostId(int $databaseHostId): bool
    {
        if ($databaseHostId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE database_host_id = :database_host_id');

        return $stmt->execute(['database_host_id' => $databaseHostId]);
    }

    /**
     * Get server database with server and database host details.
     */
    public static function getServerDatabaseWithDetails(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT sd.*, s.name as server_name, s.uuid as server_uuid, 
                       dh.name as database_host_name, dh.database_type, dh.database_host, dh.database_port
                FROM ' . self::$table . ' sd
                LEFT JOIN featherpanel_servers s ON sd.server_id = s.id
                LEFT JOIN featherpanel_databases dh ON sd.database_host_id = dh.id
                WHERE sd.id = :id LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get server databases with details by server ID.
     */
    public static function getServerDatabasesWithDetailsByServerId(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT sd.*, s.name as server_name, s.uuid as server_uuid, 
                       dh.name as database_host_name, dh.database_type, dh.database_host, dh.database_port
                FROM ' . self::$table . ' sd
                LEFT JOIN featherpanel_servers s ON sd.server_id = s.id
                LEFT JOIN featherpanel_databases dh ON sd.database_host_id = dh.id
                WHERE sd.server_id = :server_id
                ORDER BY sd.created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get server databases with details by database host ID.
     */
    public static function getServerDatabasesWithDetailsByDatabaseHostId(int $databaseHostId): array
    {
        if ($databaseHostId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT sd.*, s.name as server_name, s.uuid as server_uuid, 
                       dh.name as database_host_name, dh.database_type, dh.database_host, dh.database_port
                FROM ' . self::$table . ' sd
                LEFT JOIN featherpanel_servers s ON sd.server_id = s.id
                LEFT JOIN featherpanel_databases dh ON sd.database_host_id = dh.id
                WHERE sd.database_host_id = :database_host_id
                ORDER BY sd.created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['database_host_id' => $databaseHostId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Search server databases.
     */
    public static function searchServerDatabases(string $search, int $limit = 50): array
    {
        if (empty($search)) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $searchTerm = '%' . $search . '%';
        $sql = 'SELECT * FROM ' . self::$table . ' 
                WHERE database LIKE :search 
                OR username LIKE :search 
                OR remote LIKE :search
                ORDER BY created_at DESC 
                LIMIT :limit';
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':search', $searchTerm, \PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get database table columns.
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DESCRIBE ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Validate server database data.
     */
    public static function validateServerDatabaseData(array $data): array
    {
        $errors = [];

        if (isset($data['server_id']) && (!is_numeric($data['server_id']) || (int) $data['server_id'] <= 0)) {
            $errors[] = 'Invalid server_id';
        }

        if (isset($data['database_host_id']) && (!is_numeric($data['database_host_id']) || (int) $data['database_host_id'] <= 0)) {
            $errors[] = 'Invalid database_host_id';
        }

        if (isset($data['database']) && (empty($data['database']) || strlen($data['database']) > 191)) {
            $errors[] = 'Invalid database name';
        }

        if (isset($data['username']) && (empty($data['username']) || strlen($data['username']) > 191)) {
            $errors[] = 'Invalid username';
        }

        if (isset($data['remote']) && (empty($data['remote']) || strlen($data['remote']) > 191)) {
            $errors[] = 'Invalid remote value';
        }

        if (isset($data['max_connections']) && (!is_numeric($data['max_connections']) || (int) $data['max_connections'] < 0)) {
            $errors[] = 'Invalid max_connections';
        }

        return $errors;
    }

    /**
     * Sanitize data for logging (remove sensitive fields).
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sensitiveFields = ['password'];
        $sanitized = $data;

        foreach ($sensitiveFields as $field) {
            if (isset($sanitized[$field])) {
                $sanitized[$field] = '[REDACTED]';
            }
        }

        return $sanitized;
    }
}
