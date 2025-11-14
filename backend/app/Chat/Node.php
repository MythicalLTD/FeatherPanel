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
 * Node service/model for CRUD operations on the featherpanel_nodes table.
 */
class Node
{
    /**
     * @var string The nodes table name
     */
    private static string $table = 'featherpanel_nodes';

    /**
     * Whitelist of allowed field names for SQL queries to prevent injection.
     */
    private static array $allowedFields = [
        'uuid',
        'name',
        'description',
        'location_id',
        'fqdn',
        'public',
        'scheme',
        'behind_proxy',
        'maintenance_mode',
        'memory',
        'memory_overallocate',
        'disk',
        'disk_overallocate',
        'upload_size',
        'daemon_token_id',
        'daemon_token',
        'daemonListen',
        'daemonSFTP',
        'daemonBase',
        'public_ip_v4',
        'public_ip_v6',
    ];

    /**
     * Validate required fields and types for node creation/update.
     */
    public static function validateNodeData(array $data, array $requiredFields = []): array
    {
        $errors = [];

        // Check required fields
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                $errors[] = "Missing required field: $field";
            }
        }

        // Type and format validations
        if (isset($data['uuid']) && !self::isValidUuid($data['uuid'])) {
            $errors[] = 'Invalid UUID format';
        }

        if (isset($data['name']) && (!is_string($data['name']) || strlen($data['name']) > 100)) {
            $errors[] = 'Name must be a string with maximum 100 characters';
        }

        if (isset($data['fqdn']) && !is_string($data['fqdn'])) {
            $errors[] = 'FQDN must be a string';
        }

        if (isset($data['location_id']) && (!is_numeric($data['location_id']) || (int) $data['location_id'] <= 0)) {
            $errors[] = 'Location ID must be a positive number';
        }

        if (isset($data['memory']) && (!is_numeric($data['memory']) || (int) $data['memory'] < 0)) {
            $errors[] = 'Memory must be a non-negative number';
        }

        if (isset($data['disk']) && (!is_numeric($data['disk']) || (int) $data['disk'] < 0)) {
            $errors[] = 'Disk space must be a non-negative number';
        }

        if (isset($data['daemonListen']) && (!is_numeric($data['daemonListen']) || (int) $data['daemonListen'] < 1)) {
            $errors[] = 'Daemon port must be a positive number';
        }

        if (isset($data['daemonSFTP']) && (!is_numeric($data['daemonSFTP']) || (int) $data['daemonSFTP'] < 1)) {
            $errors[] = 'Daemon SFTP port must be a positive number';
        }

        if (isset($data['public_ip_v4']) && $data['public_ip_v4'] !== null && $data['public_ip_v4'] !== '') {
            if (!filter_var($data['public_ip_v4'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                $errors[] = 'public_ip_v4 must be a valid IPv4 address';
            }
        }

        if (isset($data['public_ip_v6']) && $data['public_ip_v6'] !== null && $data['public_ip_v6'] !== '') {
            if (!filter_var($data['public_ip_v6'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                $errors[] = 'public_ip_v6 must be a valid IPv6 address';
            }
        }

        return $errors;
    }

    /**
     * Create a new node.
     *
     * @param array $data Associative array of node fields
     *
     * @return int|false The new node's ID or false on failure
     */
    public static function createNode(array $data): int | false
    {
        // Required fields for node creation
        $required = [
            'uuid',
            'name',
            'fqdn',
            'location_id',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Missing required fields: ' . implode(', ', $missing) . ' for node: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for node: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                return false;
            }

            // Special validation for different field types
            if ($field === 'location_id') {
                if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid location_id: ' . $data[$field] . ' for node: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } else {
                // String fields validation
                if (!is_string($data[$field]) || trim($data[$field]) === '') {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for node: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            }
        }

        // UUID validation (basic)
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid UUID: ' . $data['uuid'] . ' for node: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Validate location_id exists
        if (!Location::getById($data['location_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid location_id: ' . $data['location_id'] . ' for node: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Convert boolean values to integers for database compatibility
        $booleanFields = ['public', 'behind_proxy', 'maintenance_mode'];
        foreach ($booleanFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = $data[$field] ? 1 : 0;
            }
        }

        // Encrypt sensitive daemon credentials before storing
        if (isset($data['daemon_token_id']) && is_string($data['daemon_token_id']) && $data['daemon_token_id'] !== '') {
            $data['daemon_token_id'] = App::getInstance(true)->encryptValue($data['daemon_token_id']);
        }
        if (isset($data['daemon_token']) && is_string($data['daemon_token']) && $data['daemon_token'] !== '') {
            $data['daemon_token'] = App::getInstance(true)->encryptValue($data['daemon_token']);
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
        App::getInstance(true)->getLogger()->error('Failed to create node: ' . $sql . ' for node: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData) . ' and error: ' . json_encode($stmt->errorInfo()));

        return false;
    }

    /**
     * Alias for createNode method.
     */
    public static function create(array $data): int | false
    {
        return self::createNode($data);
    }

    /**
     * Fetch a node by ID.
     */
    public static function getNodeById(int $id): ?array
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
     * Fetch a node by UUID.
     */
    public static function getNodeByUuid(string $uuid): ?array
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
        if ($row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $row;
    }

    /**
     * Fetch a node by name.
     */
    public static function getNodeByName(string $name): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE name = :name LIMIT 1');
        $stmt->execute(['name' => $name]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
        if ($row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $row;
    }

    /**
     * Fetch a node by FQDN.
     */
    public static function getNodeByFqdn(string $fqdn): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE fqdn = :fqdn LIMIT 1');
        $stmt->execute(['fqdn' => $fqdn]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
        if ($row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $row;
    }

    /**
     * Fetch nodes by location ID.
     */
    public static function getNodesByLocationId(int $locationId): array
    {
        if ($locationId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE location_id = :location_id ORDER BY name ASC');
        $stmt->execute(['location_id' => $locationId]);

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $rows;
    }

    /**
     * Fetch all nodes with optional filtering.
     */
    public static function getAllNodes(): array
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
     * Search nodes with pagination and filtering.
     */
    public static function searchNodes(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        array $fields = [],
        string $sortBy = 'name',
        string $sortOrder = 'ASC',
        ?int $locationId = null,
        ?int $excludeNodeId = null,
    ): array {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;
        $params = [];

        $sql = 'SELECT n.*, l.name as location_name FROM ' . self::$table . ' n';
        $sql .= ' LEFT JOIN featherpanel_locations l ON n.location_id = l.id';
        $sql .= ' WHERE 1=1';

        if (!empty($search)) {
            $sql .= ' AND (n.name LIKE :search OR n.description LIKE :search OR n.fqdn LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($locationId !== null) {
            $sql .= ' AND n.location_id = :location_id';
            $params['location_id'] = $locationId;
        }

        if ($excludeNodeId !== null) {
            $sql .= ' AND n.id != :exclude_node_id';
            $params['exclude_node_id'] = $excludeNodeId;
        }

        $sql .= ' ORDER BY n.' . $sortBy . ' ' . $sortOrder;
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
     * Get total count of nodes with optional filtering.
     */
    public static function getNodesCount(
        string $search = '',
        ?int $locationId = null,
        ?int $excludeNodeId = null,
    ): int {
        $pdo = Database::getPdoConnection();
        $params = [];

        $sql = 'SELECT COUNT(*) FROM ' . self::$table . ' WHERE 1=1';

        if (!empty($search)) {
            $sql .= ' AND (name LIKE :search OR description LIKE :search OR fqdn LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($locationId !== null) {
            $sql .= ' AND location_id = :location_id';
            $params['location_id'] = $locationId;
        }

        if ($excludeNodeId !== null) {
            $sql .= ' AND id != :exclude_node_id';
            $params['exclude_node_id'] = $excludeNodeId;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Update a node by UUID.
     */
    public static function updateNode(string $uuid, array $data): bool
    {
        if (!self::isValidUuid($uuid)) {
            App::getInstance(true)->getLogger()->error('Invalid UUID: ' . $uuid . ' for node: ' . $data['name'] . ' with data: ' . json_encode($data));

            return false;
        }

        // Validate location_id if provided
        if (isset($data['location_id']) && !Location::getById($data['location_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid location_id: ' . $data['location_id'] . ' for node: ' . $data['name'] . ' with data: ' . json_encode($data));

            return false;
        }

        // Convert boolean values to integers for database compatibility
        $booleanFields = ['public', 'behind_proxy', 'maintenance_mode'];
        foreach ($booleanFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = $data[$field] ? 1 : 0;
            }
        }

        // Encrypt sensitive daemon credentials before storing
        if (isset($data['daemon_token_id']) && is_string($data['daemon_token_id']) && $data['daemon_token_id'] !== '') {
            $data['daemon_token_id'] = App::getInstance(true)->encryptValue($data['daemon_token_id']);
        }
        if (isset($data['daemon_token']) && is_string($data['daemon_token']) && $data['daemon_token'] !== '') {
            $data['daemon_token'] = App::getInstance(true)->encryptValue($data['daemon_token']);
        }

        // Filter data to only include allowed fields
        $filteredData = array_intersect_key($data, array_flip(self::$allowedFields));

        $pdo = Database::getPdoConnection();
        $fields = array_keys($filteredData);
        $set = array_map(fn ($f) => "`$f` = :$f", $fields);
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(',', $set) . ' WHERE uuid = :uuid';

        $params = $filteredData;
        $params['uuid'] = $uuid;

        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /**
     * Update a node by ID.
     */
    public static function updateNodeById(int $id, array $data): bool
    {
        if ($id <= 0) {
            App::getInstance(true)->getLogger()->error('Invalid ID: ' . $id . ' for node: ' . $data['name'] . ' with data: ' . json_encode($data));

            return false;
        }

        // Validate location_id if provided
        if (isset($data['location_id']) && !Location::getById($data['location_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid location_id: ' . $data['location_id'] . ' for node: ' . $data['name'] . ' with data: ' . json_encode($data));

            return false;
        }

        // Convert boolean values to integers for database compatibility
        $booleanFields = ['public', 'behind_proxy', 'maintenance_mode'];
        foreach ($booleanFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = $data[$field] ? 1 : 0;
            }
        }

        // Encrypt sensitive daemon credentials before storing
        if (isset($data['daemon_token_id']) && is_string($data['daemon_token_id']) && $data['daemon_token_id'] !== '') {
            $data['daemon_token_id'] = App::getInstance(true)->encryptValue($data['daemon_token_id']);
        }
        if (isset($data['daemon_token']) && is_string($data['daemon_token']) && $data['daemon_token'] !== '') {
            $data['daemon_token'] = App::getInstance(true)->encryptValue($data['daemon_token']);
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
     * Hard delete a node by ID.
     */
    public static function hardDeleteNode(int $id): bool
    {
        if ($id <= 0) {
            App::getInstance(true)->getLogger()->error('Invalid ID: ' . $id . ' for node:  with data: ' . $id);

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
     * Generate a cryptographically secure UUID for nodes.
     */
    public static function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0F | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3F | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    /**
     * Generate a daemon token ID (16 characters) using cryptographically secure random generation.
     */
    public static function generateDaemonTokenId(): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        $tokenId = '';
        $randomBytes = random_bytes(16);
        for ($i = 0; $i < 16; ++$i) {
            $tokenId .= $chars[ord($randomBytes[$i]) % strlen($chars)];
        }

        return $tokenId;
    }

    /**
     * Generate a daemon token (64 characters) using cryptographically secure random generation.
     */
    public static function generateDaemonToken(): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        $token = '';
        $randomBytes = random_bytes(64);
        for ($i = 0; $i < 64; ++$i) {
            $token .= $chars[ord($randomBytes[$i]) % strlen($chars)];
        }

        return $token;
    }

    /**
     * Validate UUID format.
     */
    public static function isValidUuid(string $uuid): bool
    {
        return (bool) preg_match('/^[a-f0-9\-]{36}$/i', $uuid);
    }

    /**
     * Get node with location information.
     */
    public static function getNodeWithLocation(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
			SELECT n.*, l.name as location_name, l.description as location_description 
			FROM ' . self::$table . ' n 
			LEFT JOIN featherpanel_locations l ON n.location_id = l.id 
			WHERE n.id = :id LIMIT 1
		');
        $stmt->execute(['id' => $id]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
        if ($row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $row;
    }

    /**
     * Get all nodes with location information.
     */
    public static function getAllNodesWithLocation(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
			SELECT n.*, l.name as location_name, l.description as location_description 
			FROM ' . self::$table . ' n 
			LEFT JOIN featherpanel_locations l ON n.location_id = l.id 
			ORDER BY n.name ASC
		');
        $stmt->execute();

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $rows;
    }

    public static function getNodeByWingsAuth(string $tokenId, string $tokenSecret): ?array
    {
        try {
            if ($tokenId === '' || $tokenSecret === '') {
                return null;
            }

            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('SELECT * FROM ' . self::$table);
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($rows as $row) {
                $storedId = App::getInstance(true)->decryptValue($row['daemon_token_id'] ?? '');
                $storedSecret = App::getInstance(true)->decryptValue($row['daemon_token'] ?? '');
                if ($storedId === $tokenId && $storedSecret === $tokenSecret) {
                    return self::decryptSensitiveFields($row);
                }
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Wings auth fetch failed: ' . $e->getMessage());
        }

        return null;
    }

    public static function isWingsAuthValid(string $tokenId, string $tokenSecret): bool
    {
        try {
            if (empty($tokenId) || empty($tokenSecret)) {
                return false;
            }

            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('SELECT daemon_token_id, daemon_token FROM featherpanel_nodes');
            $stmt->execute();

            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $storedId = App::getInstance(true)->decryptValue($row['daemon_token_id'] ?? '');
                $storedSecret = App::getInstance(true)->decryptValue($row['daemon_token'] ?? '');
                if ($storedId === $tokenId && $storedSecret === $tokenSecret) {
                    return true;
                }
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Wings auth validation failed: ' . $e->getMessage());

            return false;
        }

        return false;
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
            'daemon_token',
            'daemon_token_id',
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
            if (isset($row['daemon_token_id']) && is_string($row['daemon_token_id']) && $row['daemon_token_id'] !== '') {
                $row['daemon_token_id'] = App::getInstance(true)->decryptValue($row['daemon_token_id']);
            }
            if (isset($row['daemon_token']) && is_string($row['daemon_token']) && $row['daemon_token'] !== '') {
                $row['daemon_token'] = App::getInstance(true)->decryptValue($row['daemon_token']);
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to decrypt node sensitive fields: ' . $e->getMessage());
        }

        return $row;
    }
}
