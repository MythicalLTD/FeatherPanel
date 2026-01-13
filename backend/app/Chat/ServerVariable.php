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
 * ServerVariable service/model for CRUD operations on the featherpanel_server_variables table.
 */
class ServerVariable
{
    /**
     * @var string The server_variables table name
     */
    private static string $table = 'featherpanel_server_variables';

    /**
     * Whitelist of allowed field names for SQL queries to prevent injection.
     */
    private static array $allowedFields = [
        'server_id',
        'variable_id',
        'variable_value',
    ];

    /**
     * Create a new server variable.
     *
     * @param array $data Associative array of server variable fields
     *
     * @return int|false The new server variable's ID or false on failure
     */
    public static function createServerVariable(array $data): int | false
    {
        $required = ['server_id', 'variable_id', 'variable_value'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for server variable with data: ' . json_encode($sanitizedData));

                return false;
            }
        }

        // Validate numeric fields
        if (!is_numeric($data['server_id']) || (int) $data['server_id'] <= 0) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid server_id: ' . $data['server_id'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        if (!is_numeric($data['variable_id']) || (int) $data['variable_id'] <= 0) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid variable_id: ' . $data['variable_id'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Validate that server exists
        $server = Server::getServerById((int) $data['server_id']);
        if (!$server) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Server not found: ' . $data['server_id'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Validate that spell variable exists
        $spellVariable = SpellVariable::getVariableById((int) $data['variable_id']);
        if (!$spellVariable) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Spell variable not found: ' . $data['variable_id'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Filter data to only include allowed fields
        $filteredData = array_intersect_key($data, array_flip(self::$allowedFields));

        $pdo = Database::getPdoConnection();
        $fields = array_keys($filteredData);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($filteredData)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Get server variable by ID.
     *
     * @param int $id The server variable ID
     *
     * @return array|null The server variable data or null if not found
     */
    public static function getServerVariableById(int $id): ?array
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
     * Get all server variables for a specific server.
     *
     * @param int $serverId The server ID
     *
     * @return array Array of server variables
     */
    public static function getServerVariablesByServerId(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY id ASC');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get server variables with spell variable details.
     *
     * @param int $serverId The server ID
     *
     * @return array Array of server variables with spell variable details
     */
    public static function getServerVariablesWithDetails(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT sv.*, spv.name, spv.description, spv.env_variable, spv.default_value, spv.user_viewable, spv.user_editable, spv.rules, spv.field_type 
                FROM ' . self::$table . ' sv 
                LEFT JOIN featherpanel_spell_variables spv ON sv.variable_id = spv.id 
                WHERE sv.server_id = :server_id 
                ORDER BY sv.id ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Update a server variable.
     *
     * @param int $id The server variable ID
     * @param array $data The data to update
     *
     * @return bool True on success, false on failure
     */
    public static function updateServerVariable(int $id, array $data): bool
    {
        if ($id <= 0) {
            return false;
        }

        // Filter data to only include allowed fields
        $filteredData = array_intersect_key($data, array_flip(self::$allowedFields));

        if (empty($filteredData)) {
            return false;
        }

        // Validate server_id if provided
        if (isset($filteredData['server_id'])) {
            if (!is_numeric($filteredData['server_id']) || (int) $filteredData['server_id'] <= 0) {
                return false;
            }
            $server = Server::getServerById((int) $filteredData['server_id']);
            if (!$server) {
                return false;
            }
        }

        // Validate variable_id if provided
        if (isset($filteredData['variable_id'])) {
            if (!is_numeric($filteredData['variable_id']) || (int) $filteredData['variable_id'] <= 0) {
                return false;
            }
            $spellVariable = SpellVariable::getVariableById((int) $filteredData['variable_id']);
            if (!$spellVariable) {
                return false;
            }
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($filteredData);
        $setClause = implode(', ', array_map(fn ($f) => $f . ' = :' . $f, $fields));
        $sql = 'UPDATE ' . self::$table . ' SET ' . $setClause . ' WHERE id = :id';
        $filteredData['id'] = $id;
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($filteredData);
    }

    /**
     * Delete a server variable.
     *
     * @param int $id The server variable ID
     *
     * @return bool True on success, false on failure
     */
    public static function deleteServerVariable(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Delete all server variables for a specific server.
     *
     * @param int $serverId The server ID
     *
     * @return bool True on success, false on failure
     */
    public static function deleteServerVariablesByServerId(int $serverId): bool
    {
        if ($serverId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE server_id = :server_id');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Create or update multiple server variables for a server.
     * This method deletes ALL existing variables and recreates them.
     * Use updateSpecificServerVariables() for selective updates.
     *
     * @param int $serverId The server ID
     * @param array $variables Array of variables with variable_id and variable_value
     *
     * @return bool True on success, false on failure
     */
    public static function createOrUpdateServerVariables(int $serverId, array $variables): bool
    {
        if ($serverId <= 0 || empty($variables)) {
            return false;
        }

        // Validate server exists
        $server = Server::getServerById($serverId);
        if (!$server) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $pdo->beginTransaction();

        try {
            // Delete existing variables for this server
            self::deleteServerVariablesByServerId($serverId);

            // Insert new variables
            foreach ($variables as $variable) {
                if (!isset($variable['variable_id']) || !isset($variable['variable_value'])) {
                    $pdo->rollBack();

                    return false;
                }

                $data = [
                    'server_id' => $serverId,
                    'variable_id' => (int) $variable['variable_id'],
                    'variable_value' => (string) $variable['variable_value'],
                ];

                $result = self::createServerVariable($data);
                if (!$result) {
                    $pdo->rollBack();

                    return false;
                }
            }

            $pdo->commit();

            return true;
        } catch (\Exception $e) {
            $pdo->rollBack();
            App::getInstance(true)->getLogger()->error('Failed to create/update server variables: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Update only specific server variables without touching others.
     * This method only updates the variables provided in the payload,
     * leaving read-only and admin-only variables untouched.
     *
     * @param int $serverId The server ID
     * @param array $variables Array of variables with variable_id and variable_value
     *
     * @return bool True on success, false on failure
     */
    public static function updateSpecificServerVariables(int $serverId, array $variables): bool
    {
        if ($serverId <= 0 || empty($variables)) {
            return true; // No variables to update is considered success
        }

        // Validate server exists
        $server = Server::getServerById($serverId);
        if (!$server) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $pdo->beginTransaction();

        try {
            // Get existing variables for this server
            $existingVariables = self::getServerVariablesByServerId($serverId);
            $existingVariableMap = [];
            foreach ($existingVariables as $existing) {
                $existingVariableMap[(int) $existing['variable_id']] = $existing;
            }

            // Process each variable in the payload
            foreach ($variables as $variable) {
                if (!isset($variable['variable_id']) || !isset($variable['variable_value'])) {
                    $pdo->rollBack();

                    return false;
                }

                $variableId = (int) $variable['variable_id'];
                $variableValue = (string) $variable['variable_value'];

                if (isset($existingVariableMap[$variableId])) {
                    // Update existing variable
                    $existingVar = $existingVariableMap[$variableId];
                    $updateData = ['variable_value' => $variableValue];

                    $result = self::updateServerVariable((int) $existingVar['id'], $updateData);
                    if (!$result) {
                        $pdo->rollBack();

                        return false;
                    }
                } else {
                    // Create new variable
                    $data = [
                        'server_id' => $serverId,
                        'variable_id' => $variableId,
                        'variable_value' => $variableValue,
                    ];

                    $result = self::createServerVariable($data);
                    if (!$result) {
                        $pdo->rollBack();

                        return false;
                    }
                }
            }

            $pdo->commit();

            return true;
        } catch (\Exception $e) {
            $pdo->rollBack();
            App::getInstance(true)->getLogger()->error('Failed to update specific server variables: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Get count of server variables for a server.
     *
     * @param int $serverId The server ID
     *
     * @return int The count
     */
    public static function getCountByServerId(int $serverId): int
    {
        if ($serverId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE server_id = :server_id');
        $stmt->execute(['server_id' => $serverId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Get all server variables.
     *
     * @return array Array of all server variables
     */
    public static function getAllServerVariables(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' ORDER BY id ASC');
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get table columns.
     *
     * @return array Array of column information
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DESCRIBE ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Sanitize data for logging (remove sensitive information).
     *
     * @param array $data The data to sanitize
     *
     * @return array The sanitized data
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sanitized = $data;
        // Remove any potentially sensitive fields if needed
        unset($sanitized['variable_value']);

        return $sanitized;
    }
}
