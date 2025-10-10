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
 * Subuser service/model for CRUD operations on the featherpanel_server_subusers table.
 */
class Subuser
{
    /**
     * @var string The server subusers table name
     */
    private static string $table = 'featherpanel_server_subusers';

    /**
     * Create a new subuser.
     *
     * @param array $data Associative array of subuser fields
     *
     * @return int|false The new subuser's ID or false on failure
     */
    public static function createSubuser(array $data): int|false
    {
        // Required fields for subuser creation
        $required = [
            'user_id',
            'server_id',
            'permissions',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Missing required fields: ' . implode(', ', $missing) . ' for subuser with data: ' . json_encode($sanitizedData));

            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for subuser with data: ' . json_encode($sanitizedData));

                return false;
            }

            // Special validation for different field types
            if (in_array($field, ['user_id', 'server_id'])) {
                if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid ' . $field . ': ' . $data[$field] . ' for subuser with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } elseif ($field === 'permissions') {
                if (!self::validatePermissions($data[$field])) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid permissions format for subuser with data: ' . json_encode($sanitizedData));

                    return false;
                }
            }
        }

        // Validate user_id exists
        if (!User::getUserById($data['user_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid user_id: ' . $data['user_id'] . ' for subuser with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Validate server_id exists
        if (!Server::getServerById($data['server_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid server_id: ' . $data['server_id'] . ' for subuser with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Check if subuser already exists for this user+server combination
        if (self::getSubuserByUserAndServer($data['user_id'], $data['server_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Subuser already exists for user_id: ' . $data['user_id'] . ' and server_id: ' . $data['server_id'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Set default values for optional fields
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
     * Fetch a subuser by ID.
     */
    public static function getSubuserById(int $id): ?array
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
     * Get subuser by user ID and server ID.
     */
    public static function getSubuserByUserAndServer(int $userId, int $serverId): ?array
    {
        if ($userId <= 0 || $serverId <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE user_id = :user_id AND server_id = :server_id LIMIT 1');
        $stmt->execute(['user_id' => $userId, 'server_id' => $serverId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get all subusers.
     */
    public static function getAllSubusers(): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table . ' ORDER BY user_id, server_id';
        $stmt = $pdo->query($sql);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get subusers by user ID.
     */
    public static function getSubusersByUserId(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE user_id = :user_id ORDER BY server_id ASC');
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get subusers by server ID.
     */
    public static function getSubusersByServerId(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY user_id ASC');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get subusers by permission.
     */
    public static function getSubusersByPermission(string $permission): array
    {
        if (empty($permission)) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE JSON_CONTAINS(permissions, :permission) ORDER BY user_id, server_id');
        $stmt->execute(['permission' => json_encode($permission)]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Search subusers with pagination, filtering, and field selection.
     *
     * @param int $page Page number (1-based)
     * @param int $limit Number of results per page
     * @param string $search Search term for user or server (optional)
     * @param array $fields Fields to select (e.g. ['user_id', 'server_id']) (default: all)
     * @param string $sortBy Field to sort by (default: 'id')
     * @param string $sortOrder 'ASC' or 'DESC' (default: 'ASC')
     * @param int|null $userId Filter by user ID (optional)
     * @param int|null $serverId Filter by server ID (optional)
     * @param string|null $permission Filter by permission (optional)
     */
    public static function searchSubusers(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        array $fields = [],
        string $sortBy = 'id',
        string $sortOrder = 'ASC',
        ?int $userId = null,
        ?int $serverId = null,
        ?string $permission = null,
    ): array {
        $pdo = Database::getPdoConnection();

        if (empty($fields)) {
            $selectFields = '*';
        } else {
            $selectFields = implode(', ', $fields);
        }

        $sql = "SELECT $selectFields FROM " . self::$table;
        $where = [];
        $params = [];

        if (!empty($search)) {
            $where[] = '(user_id LIKE :search OR server_id LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($userId !== null) {
            $where[] = 'user_id = :user_id';
            $params['user_id'] = $userId;
        }

        if ($serverId !== null) {
            $where[] = 'server_id = :server_id';
            $params['server_id'] = $serverId;
        }

        if ($permission !== null) {
            $where[] = 'JSON_CONTAINS(permissions, :permission)';
            $params['permission'] = json_encode($permission);
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= " ORDER BY $sortBy $sortOrder";
        $offset = max(0, ($page - 1) * $limit);
        $sql .= ' LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);

        // Bind parameters
        foreach ($params as $key => $value) {
            if ($key === 'user_id' || $key === 'server_id') {
                $stmt->bindValue(':' . $key, (int) $value, \PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':' . $key, $value, \PDO::PARAM_STR);
            }
        }
        $stmt->bindValue(':limit', (int) $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int) $offset, \PDO::PARAM_INT);

        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Update a subuser by ID.
     */
    public static function updateSubuser(int $id, array $data): bool
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

            // Validate permissions if being updated
            if (isset($data['permissions']) && !self::validatePermissions($data['permissions'])) {
                App::getInstance(true)->getLogger()->error('Invalid permissions format for subuser update');

                return false;
            }

            // Validate user_id exists if being updated
            if (isset($data['user_id']) && !User::getUserById($data['user_id'])) {
                App::getInstance(true)->getLogger()->error('Invalid user_id: ' . $data['user_id'] . ' for subuser update');

                return false;
            }

            // Validate server_id exists if being updated
            if (isset($data['server_id']) && !Server::getServerById($data['server_id'])) {
                App::getInstance(true)->getLogger()->error('Invalid server_id: ' . $data['server_id'] . ' for subuser update');

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
            App::getInstance(true)->getLogger()->error('Failed to update subuser: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Update subuser permissions.
     */
    public static function updatePermissions(int $id, array $permissions): bool
    {
        if (!self::validatePermissions($permissions)) {
            App::getInstance(true)->getLogger()->error('Invalid permissions format for subuser: ' . $id);

            return false;
        }

        return self::updateSubuser($id, [
            'permissions' => json_encode($permissions),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Add permission to subuser.
     */
    public static function addPermission(int $id, string $permission): bool
    {
        $subuser = self::getSubuserById($id);
        if (!$subuser) {
            return false;
        }

        $permissions = json_decode($subuser['permissions'], true) ?: [];
        if (!in_array($permission, $permissions)) {
            $permissions[] = $permission;

            return self::updatePermissions($id, $permissions);
        }

        return true; // Permission already exists
    }

    /**
     * Remove permission from subuser.
     */
    public static function removePermission(int $id, string $permission): bool
    {
        $subuser = self::getSubuserById($id);
        if (!$subuser) {
            return false;
        }

        $permissions = json_decode($subuser['permissions'], true) ?: [];
        $permissions = array_filter($permissions, fn ($p) => $p !== $permission);

        return self::updatePermissions($id, array_values($permissions));
    }

    /**
     * Check if subuser has permission.
     */
    public static function hasPermission(int $id, string $permission): bool
    {
        $subuser = self::getSubuserById($id);
        if (!$subuser) {
            return false;
        }

        $permissions = json_decode($subuser['permissions'], true) ?: [];

        return in_array($permission, $permissions);
    }

    /**
     * Delete a subuser.
     */
    public static function deleteSubuser(int $id): bool
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
     * Delete all subusers for a user.
     */
    public static function deleteSubusersByUserId(int $userId): bool
    {
        if ($userId <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE user_id = :user_id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['user_id' => $userId]);
    }

    /**
     * Delete all subusers for a server.
     */
    public static function deleteSubusersByServerId(int $serverId): bool
    {
        if ($serverId <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE server_id = :server_id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['server_id' => $serverId]);
    }

    /**
     * Get subuser with related user and server data.
     */
    public static function getSubuserWithDetails(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT su.*, u.username, u.email, u.first_name, u.last_name, s.name as server_name, s.uuid as server_uuid 
                FROM ' . self::$table . ' su 
                LEFT JOIN featherpanel_users u ON su.user_id = u.id 
                LEFT JOIN featherpanel_servers s ON su.server_id = s.id 
                WHERE su.id = :id LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get subusers with related user and server data for a specific server.
     */
    public static function getSubusersWithDetailsByServerId(int $serverId): array
    {
        if ($serverId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT su.*, u.username, u.email, u.first_name, u.last_name, s.name as server_name, s.uuid as server_uuid 
                FROM ' . self::$table . ' su 
                LEFT JOIN featherpanel_users u ON su.user_id = u.id 
                LEFT JOIN featherpanel_servers s ON su.server_id = s.id 
                WHERE su.server_id = :server_id 
                ORDER BY u.username ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get subusers with related user and server data for a specific user.
     */
    public static function getSubusersWithDetailsByUserId(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT su.*, u.username, u.email, u.first_name, u.last_name, s.name as server_name, s.uuid as server_uuid 
                FROM ' . self::$table . ' su 
                LEFT JOIN featherpanel_users u ON su.user_id = u.id 
                LEFT JOIN featherpanel_servers s ON su.server_id = s.id 
                WHERE su.user_id = :user_id 
                ORDER BY s.name ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get table columns.
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Validate permissions format.
     */
    public static function validatePermissions($permissions): bool
    {
        if (is_string($permissions)) {
            $decoded = json_decode($permissions, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return false;
            }
            $permissions = $decoded;
        }

        if (!is_array($permissions)) {
            return false;
        }

        // Check if all permissions are valid strings
        foreach ($permissions as $permission) {
            if (!is_string($permission) || trim($permission) === '') {
                return false;
            }
        }

        return true;
    }

    /**
     * Get valid permission types.
     */
    public static function getValidPermissions(): array
    {
        return [
            'control.console',
            'control.start',
            'control.stop',
            'control.restart',
            'control.kill',
            'control.settings',
            'control.startup',
            'control.sftp',
            'control.database',
            'control.backup',
            'control.allocation',
            'websocket.connect',
            'files.read',
            'files.write',
            'files.delete',
            'files.upload',
            'files.download',
        ];
    }

    public static function deleteAllSubusersByUserId(int $userId): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE user_id = :user_id');

        return $stmt->execute(['user_id' => $userId]);
    }

    /**
     * Sanitize data for logging (remove sensitive fields).
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sensitiveFields = ['password', 'remember_token', 'two_fa_key', 'permissions'];
        $sanitized = $data;

        foreach ($sensitiveFields as $field) {
            if (isset($sanitized[$field])) {
                $sanitized[$field] = '[REDACTED]';
            }
        }

        return $sanitized;
    }
}
