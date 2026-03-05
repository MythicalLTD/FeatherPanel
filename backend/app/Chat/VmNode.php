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

namespace App\Chat;

use App\App;

/**
 * VmNode service/model for CRUD operations on the featherpanel_vm_nodes table.
 *
 * Represents Proxmox (VDS/VPS) hypervisor nodes that FeatherPanel can talk to.
 */
class VmNode
{
    /**
     * @var string The VM nodes table name
     */
    private static string $table = 'featherpanel_vm_nodes';

    /**
     * Whitelist of allowed field names for SQL queries to prevent injection.
     *
     * @var array<int, string>
     */
    private static array $allowedFields = [
        'id',
        'name',
        'description',
        'location_id',
        'fqdn',
        'scheme',
        'port',
        'user',
        'token_id',
        'secret',
        'tls_no_verify',
        'timeout',
        'addional_headers',
        'additional_params',
    ];

    /**
     * Validate required fields and types for VM node creation/update.
     *
     * @param array<string, mixed> $data
     * @param array<int, string>   $requiredFields
     *
     * @return array<int, string> Validation error messages (empty if ok)
     */
    public static function validateVmNodeData(array $data, array $requiredFields = []): array
    {
        $errors = [];

        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                $errors[] = "Missing required field: {$field}";
            }
        }

        if (isset($data['name']) && (!is_string($data['name']) || strlen($data['name']) > 255)) {
            $errors[] = 'Name must be a string with maximum 255 characters';
        }

        if (isset($data['fqdn']) && (!is_string($data['fqdn']) || trim($data['fqdn']) === '')) {
            $errors[] = 'FQDN must be a non-empty string';
        }

        if (isset($data['location_id']) && (!is_numeric($data['location_id']) || (int) $data['location_id'] <= 0)) {
            $errors[] = 'Location ID must be a positive number';
        }

        if (isset($data['scheme']) && !in_array($data['scheme'], ['http', 'https'], true)) {
            $errors[] = 'Scheme must be either http or https';
        }

        if (isset($data['port']) && (!is_numeric($data['port']) || (int) $data['port'] < 1 || (int) $data['port'] > 65535)) {
            $errors[] = 'Port must be a valid TCP port (1-65535)';
        }

        if (isset($data['timeout']) && (!is_numeric($data['timeout']) || (int) $data['timeout'] < 1)) {
            $errors[] = 'Timeout must be a positive number of seconds';
        }

        if (isset($data['tls_no_verify']) && !in_array($data['tls_no_verify'], ['true', 'false'], true)) {
            $errors[] = 'tls_no_verify must be either "true" or "false"';
        }

        foreach (['user', 'token_id', 'secret'] as $field) {
            if (isset($data[$field]) && (!is_string($data[$field]) || trim($data[$field]) === '')) {
                $errors[] = "{$field} must be a non-empty string";
            }
        }

        return $errors;
    }

    /**
     * Create a new VM node.
     *
     * @param array<string, mixed> $data
     *
     * @return int|false The new VM node ID or false on failure
     */
    public static function createVmNode(array $data): int|false
    {
        $required = [
            'name',
            'fqdn',
            'location_id',
            'scheme',
            'port',
            'user',
            'token_id',
            'secret',
        ];

        $errors = self::validateVmNodeData($data, $required);
        if (!empty($errors)) {
            $sanitized = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('VM node validation failed: ' . implode('; ', $errors) . ' for node: ' . ($data['name'] ?? 'unknown') . ' with data: ' . json_encode($sanitized));

            return false;
        }

        if (!Location::getById((int) $data['location_id'])) {
            $sanitized = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid location_id: ' . $data['location_id'] . ' for VM node: ' . $data['name'] . ' with data: ' . json_encode($sanitized));

            return false;
        }

        $location = Location::getById((int) $data['location_id']);
        if (!$location || ($location['type'] ?? 'game') !== 'vps') {
            $sanitized = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Location is not marked as VPS/VDS location_id: ' . $data['location_id'] . ' for VM node: ' . $data['name'] . ' with data: ' . json_encode($sanitized));

            return false;
        }

        $data['location_id'] = (int) $data['location_id'];

        if (!isset($data['timeout']) || !is_numeric($data['timeout']) || (int) $data['timeout'] <= 0) {
            $data['timeout'] = 60;
        }

        if (!isset($data['tls_no_verify']) || !in_array($data['tls_no_verify'], ['true', 'false'], true)) {
            $data['tls_no_verify'] = 'false';
        }

        $data['token_id'] = App::getInstance(true)->encryptValue((string) $data['token_id']);
        $data['secret'] = App::getInstance(true)->encryptValue((string) $data['secret']);

        $hasId = isset($data['id']) && is_int($data['id']) && $data['id'] > 0;

        $filteredData = array_intersect_key($data, array_flip(self::$allowedFields));

        $pdo = Database::getPdoConnection();
        $fields = array_keys($filteredData);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (`' . implode('`,`', $fields) . '`) VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($filteredData)) {
            return $hasId ? (int) $filteredData['id'] : (int) $pdo->lastInsertId();
        }

        $sanitized = self::sanitizeDataForLogging($data);
        App::getInstance(true)->getLogger()->error('Failed to create VM node: ' . $sql . ' for node: ' . ($data['name'] ?? 'unknown') . ' with data: ' . json_encode($sanitized) . ' and error: ' . json_encode($stmt->errorInfo()));

        return false;
    }

    /**
     * Alias for createVmNode.
     *
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int|false
    {
        return self::createVmNode($data);
    }

    /**
     * Fetch a VM node by ID.
     *
     * @return array<string, mixed>|null
     */
    public static function getVmNodeById(int $id): ?array
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
     * Fetch all VM nodes with optional filtering.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getAllVmNodes(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' ORDER BY name ASC');
        $stmt->execute();

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row = self::decryptSensitiveFields($row);
        }

        return $rows;
    }

    /**
     * Search VM nodes with pagination and filtering.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function searchVmNodes(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        ?int $locationId = null,
    ): array {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;
        $params = [];

        $sql = 'SELECT n.*, l.name as location_name, l.type as location_type FROM ' . self::$table . ' n';
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

        $sql .= " AND (l.type = 'vps')";

        $sql .= ' ORDER BY n.name ASC';
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
     * Get total count of VM nodes with optional filtering.
     */
    public static function getVmNodesCount(
        string $search = '',
        ?int $locationId = null,
    ): int {
        $pdo = Database::getPdoConnection();
        $params = [];

        $sql = 'SELECT COUNT(*) FROM ' . self::$table . ' n';
        $sql .= ' LEFT JOIN featherpanel_locations l ON n.location_id = l.id';
        $sql .= " WHERE 1=1 AND l.type = 'vps'";

        if (!empty($search)) {
            $sql .= ' AND (n.name LIKE :search OR n.description LIKE :search OR n.fqdn LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($locationId !== null) {
            $sql .= ' AND n.location_id = :location_id';
            $params['location_id'] = $locationId;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Update a VM node by ID.
     *
     * @param array<string, mixed> $data
     */
    public static function updateVmNodeById(int $id, array $data): bool
    {
        if ($id <= 0) {
            App::getInstance(true)->getLogger()->error('Invalid VM node ID: ' . $id . ' with data: ' . json_encode($data));

            return false;
        }

        if (isset($data['location_id'])) {
            if (!Location::getById((int) $data['location_id'])) {
                App::getInstance(true)->getLogger()->error('Invalid location_id: ' . $data['location_id'] . ' for VM node with data: ' . json_encode($data));

                return false;
            }

            $location = Location::getById((int) $data['location_id']);
            if (!$location || ($location['type'] ?? 'game') !== 'vps') {
                App::getInstance(true)->getLogger()->error('Location is not marked as VPS/VDS location_id: ' . $data['location_id'] . ' for VM node with data: ' . json_encode($data));

                return false;
            }

            $data['location_id'] = (int) $data['location_id'];
        }

        if (!empty($data)) {
            $errors = self::validateVmNodeData($data);
            if (!empty($errors)) {
                App::getInstance(true)->getLogger()->error('VM node update validation failed for ID ' . $id . ': ' . implode('; ', $errors));

                return false;
            }
        }

        if (isset($data['token_id']) && is_string($data['token_id']) && $data['token_id'] !== '') {
            $data['token_id'] = App::getInstance(true)->encryptValue($data['token_id']);
        }
        if (isset($data['secret']) && is_string($data['secret']) && $data['secret'] !== '') {
            $data['secret'] = App::getInstance(true)->encryptValue($data['secret']);
        }

        $filteredData = array_intersect_key($data, array_flip(self::$allowedFields));

        if (empty($filteredData)) {
            return true;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($filteredData);
        $set = array_map(static fn ($f) => "`{$f}` = :{$f}", $fields);
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(',', $set) . ' WHERE id = :id';

        $params = $filteredData;
        $params['id'] = $id;

        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /**
     * Hard delete a VM node by ID.
     */
    public static function hardDeleteVmNode(int $id): bool
    {
        if ($id <= 0) {
            App::getInstance(true)->getLogger()->error('Invalid VM node ID: ' . $id);

            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get table columns information.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DESCRIBE ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get count of VM nodes based on conditions.
     *
     * @param array<string, mixed> $conditions
     */
    public static function count(array $conditions): int
    {
        $pdo = Database::getPdoConnection();
        $where = implode(' AND ', array_map(static fn ($k) => "{$k} = :{$k}", array_keys($conditions)));
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE ' . $where);
        $stmt->execute($conditions);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Sanitize data for logging by excluding sensitive fields.
     *
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sensitiveFields = [
            'token_id',
            'secret',
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
     *
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function decryptSensitiveFields(array $row): array
    {
        try {
            if (isset($row['token_id']) && is_string($row['token_id']) && $row['token_id'] !== '') {
                $row['token_id'] = App::getInstance(true)->decryptValue($row['token_id']);
            }
            if (isset($row['secret']) && is_string($row['secret']) && $row['secret'] !== '') {
                $row['secret'] = App::getInstance(true)->decryptValue($row['secret']);
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to decrypt VM node sensitive fields: ' . $e->getMessage());
        }

        return $row;
    }
}

