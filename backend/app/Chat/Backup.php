<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
 * Backup service/model for CRUD operations on the featherpanel_server_backups table.
 */
class Backup
{
    /**
     * @var string The backups table name
     */
    private static string $table = 'featherpanel_server_backups';

    /**
     * Create a new backup.
     *
     * @param array $data Associative array of backup fields
     *
     * @return int|false The new backup's ID or false on failure
     */
    public static function createBackup(array $data): int | false
    {
        // Required fields for backup creation
        $required = [
            'server_id',
            'uuid',
            'name',
            'ignored_files',
            'disk',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Missing required fields: ' . implode(', ', $missing) . ' for backup: ' . $data['uuid'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for backup: ' . $data['uuid'] . ' with data: ' . json_encode($sanitizedData));

                return false;
            }

            // Special validation for different field types
            if (in_array($field, ['server_id'])) {
                if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid ' . $field . ': ' . $data[$field] . ' for backup: ' . $data['uuid'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } else {
                // String fields validation
                if (!is_string($data[$field]) || trim($data[$field]) === '') {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for backup: ' . $data[$field] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            }
        }

        // UUID validation (basic)
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid UUID: ' . $data['uuid'] . ' for backup: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Validate server_id exists
        if (!Server::getServerById($data['server_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid server_id: ' . $data['server_id'] . ' for backup: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Set default values for optional fields
        $data['is_successful'] = $data['is_successful'] ?? 0;
        $data['is_locked'] = $data['is_locked'] ?? 0;
        $data['bytes'] = $data['bytes'] ?? 0;
        $data['created_at'] = $data['created_at'] ?? date('Y-m-d H:i:s');
        $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');

        // Build explicit fields and insert arrays (same pattern as Location.php)
        $fields = ['server_id', 'uuid', 'name', 'ignored_files', 'disk', 'is_successful', 'is_locked', 'bytes', 'created_at', 'updated_at'];
        $insert = [];
        foreach ($fields as $field) {
            $insert[$field] = $data[$field] ?? null;
        }

        // Add optional fields if provided
        $optionalFields = ['upload_id', 'checksum', 'completed_at'];
        foreach ($optionalFields as $field) {
            if (isset($data[$field])) {
                $insert[$field] = $data[$field];
                $fields[] = $field;
            }
        }

        // Handle optional ID for migrations (EXACT same pattern as Location.php)
        $hasId = false;
        if (isset($data['id'])) {
            if (is_int($data['id']) || (is_string($data['id']) && ctype_digit((string) $data['id']))) {
                $idValue = (int) $data['id'];
                if ($idValue > 0) {
                    $insert['id'] = $idValue;
                    $fields[] = 'id';
                    $hasId = true;
                }
            }
        }

        $pdo = Database::getPdoConnection();
        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($insert)) {
            return $hasId ? $insert['id'] : (int) $pdo->lastInsertId();
        }

        // Log database error for debugging
        $errorInfo = $stmt->errorInfo();
        App::getInstance(true)->getLogger()->error('Failed to create backup: ' . ($errorInfo[2] ?? 'Unknown error') . ' | SQLSTATE: ' . ($errorInfo[0] ?? 'N/A') . ' | Error Code: ' . ($errorInfo[1] ?? 'N/A') . ' | SQL: ' . $sql . ' | Data: ' . json_encode(self::sanitizeDataForLogging($insert)));

        return false;
    }

    /**
     * Get a backup by ID.
     *
     * @param int $id The backup ID
     *
     * @return array|null The backup data or null if not found
     */
    public static function getBackupById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get a backup by UUID.
     *
     * @param string $uuid The backup UUID
     *
     * @return array|null The backup data or null if not found
     */
    public static function getBackupByUuid(string $uuid): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get backups by server ID.
     *
     * @param int $serverId The server ID
     *
     * @return array Array of backups
     */
    public static function getBackupsByServerId(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id AND deleted_at IS NULL ORDER BY created_at DESC');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Update a backup.
     *
     * @param int $id The backup ID
     * @param array $data Associative array of backup fields to update
     *
     * @return bool True on success, false on failure
     */
    public static function updateBackup(int $id, array $data): bool
    {
        try {
            if ($id <= 0) {
                return false;
            }
            if (empty($data)) {
                App::getInstance(true)->getLogger()->error('No data to update');

                return false;
            }
            // Prevent updating primary key/id
            if (isset($data['id'])) {
                unset($data['id']);
            }
            $columns = self::getColumns();
            $columns = array_map(fn ($c) => $c['Field'], $columns);
            $missing = array_diff(array_keys($data), $columns);
            if (!empty($missing)) {
                App::getInstance(true)->getLogger()->error('Missing fields: ' . implode(', ', $missing));

                return false;
            }
            $pdo = Database::getPdoConnection();
            $fields = array_keys($data);
            if (empty($fields)) {
                App::getInstance(true)->getLogger()->error('No fields to update');

                return false;
            }
            $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
            $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            $data['id'] = $id;

            return $stmt->execute($data);
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to update backup: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Delete a backup (soft delete).
     *
     * @param int $id The backup ID
     *
     * @return bool True on success, false on failure
     */
    public static function deleteBackup(int $id): bool
    {
        try {
            if ($id <= 0) {
                return false;
            }
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET deleted_at = :deleted_at WHERE id = :id');
            $stmt->execute([
                'deleted_at' => date('Y-m-d H:i:s'),
                'id' => $id,
            ]);

            return $stmt->rowCount() > 0;
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete backup: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Hard delete a backup.
     *
     * @param int $id The backup ID
     *
     * @return bool True on success, false on failure
     */
    public static function hardDeleteBackup(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Delete all backups for a server (soft delete).
     *
     * @param int $serverId The server ID
     *
     * @return int Number of backups deleted
     */
    public static function deleteAllByServerId(int $serverId): int
    {
        if ($serverId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET deleted_at = :deleted_at WHERE server_id = :server_id AND deleted_at IS NULL');
        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'server_id' => $serverId,
        ]);

        return $stmt->rowCount();
    }

    /**
     * Hard delete all backups for a server.
     *
     * @param int $serverId The server ID
     *
     * @return int Number of backups deleted
     */
    public static function hardDeleteAllByServerId(int $serverId): int
    {
        if ($serverId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE server_id = :server_id');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->rowCount();
    }

    /**
     * Get all backups with pagination.
     *
     * @param int $page The page number (1-based)
     * @param int $perPage Number of items per page
     * @param array $filters Optional filters
     *
     * @return array Array with 'data' and 'pagination' keys
     */
    public static function getAllBackups(int $page = 1, int $perPage = 20, array $filters = []): array
    {
        $pdo = Database::getPdoConnection();
        $offset = max(0, ($page - 1) * $perPage);

        $whereConditions = ['deleted_at IS NULL'];
        $params = [];

        // Apply filters
        if (!empty($filters['server_id'])) {
            $whereConditions[] = 'server_id = :server_id';
            $params['server_id'] = $filters['server_id'];
        }

        if (!empty($filters['is_successful'])) {
            $whereConditions[] = 'is_successful = :is_successful';
            $params['is_successful'] = $filters['is_successful'];
        }

        if (!empty($filters['is_locked'])) {
            $whereConditions[] = 'is_locked = :is_locked';
            $params['is_locked'] = $filters['is_locked'];
        }

        $whereClause = implode(' AND ', $whereConditions);

        // Get total count
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . " WHERE {$whereClause}");
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        // Get data
        $sql = 'SELECT * FROM ' . self::$table . " WHERE {$whereClause} ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);

        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }

        $stmt->execute();
        $data = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'data' => $data,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total),
            ],
        ];
    }

    /**
     * Get table columns.
     *
     * @return array Array of column information
     */
    private static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . self::$table);
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
        $sensitiveFields = ['checksum', 'upload_id'];
        $sanitized = $data;

        foreach ($sensitiveFields as $field) {
            if (isset($sanitized[$field])) {
                $sanitized[$field] = '[REDACTED]';
            }
        }

        return $sanitized;
    }
}
