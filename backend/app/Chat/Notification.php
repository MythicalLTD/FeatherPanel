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
 * Notification service/model for CRUD operations on the featherpanel_notifications table.
 */
class Notification
{
    /**
     * @var string The notifications table name
     */
    private static string $table = 'featherpanel_notifications';

    /**
     * Create a new notification.
     *
     * @param array $data Associative array of notification fields
     *
     * @return int|false The new notification's ID or false on failure
     */
    public static function createNotification(array $data): int | false
    {
        // Required fields
        $required = ['title', 'message_markdown', 'type'];

        // Validate all required fields are present
        foreach ($required as $field) {
            if (!isset($data[$field]) || (!is_string($data[$field]) && !is_null($data[$field]))) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error("Missing required field: $field");

                return false;
            }
        }

        // Validate title is not empty
        if (!is_string($data['title']) || trim($data['title']) === '') {
            App::getInstance(true)->getLogger()->error('Title must be a non-empty string');

            return false;
        }

        // Validate message_markdown is not empty
        if (!is_string($data['message_markdown']) || trim($data['message_markdown']) === '') {
            App::getInstance(true)->getLogger()->error('Message markdown must be a non-empty string');

            return false;
        }

        // Validate type
        $validTypes = ['info', 'warning', 'danger', 'success', 'error'];
        if (!in_array($data['type'], $validTypes, true)) {
            App::getInstance(true)->getLogger()->error('Invalid notification type: ' . $data['type']);

            return false;
        }

        // Normalize targeting
        if (array_key_exists('user_id', $data)) {
            if ($data['user_id'] === null || $data['user_id'] === '' || (int) $data['user_id'] <= 0) {
                $data['user_id'] = null;
            } else {
                $data['user_id'] = (int) $data['user_id'];
            }
        }

        if (array_key_exists('server_id', $data)) {
            if ($data['server_id'] === null || $data['server_id'] === '' || (int) $data['server_id'] <= 0) {
                $data['server_id'] = null;
            } else {
                $data['server_id'] = (int) $data['server_id'];
            }
        }

        // Set defaults
        if (!isset($data['is_dismissible'])) {
            $data['is_dismissible'] = true;
        }
        if (!isset($data['is_sticky'])) {
            $data['is_sticky'] = false;
        }

        // Convert boolean to MySQL boolean (0/1)
        $data['is_dismissible'] = $data['is_dismissible'] ? 1 : 0;
        $data['is_sticky'] = $data['is_sticky'] ? 1 : 0;

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($data)) {
            return (int) $pdo->lastInsertId();
        }

        $sanitizedData = self::sanitizeDataForLogging($data);
        App::getInstance(true)->getLogger()->error('Failed to create notification: ' . json_encode($sanitizedData));

        return false;
    }

    /**
     * Get a notification by ID.
     *
     * @param int $id Notification ID
     *
     * @return array|null Notification data or null if not found
     */
    public static function getNotificationById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($result) {
            return self::normalizeRow($result);
        }

        return null;
    }

    /**
     * Get all notifications with pagination and filtering.
     *
     * @param int $page Page number (1-based)
     * @param int $limit Number of results per page
     * @param string $search Search term for title/message (optional)
     * @param string|null $type Filter by type (optional)
     * @param string $sortBy Field to sort by (default: 'created_at')
     * @param string $sortOrder 'ASC' or 'DESC' (default: 'DESC')
     * @param int|null $userId Filter by target user (optional)
     * @param int|null $serverId Filter by target server (optional)
     * @param bool|null $globalOnly When true, only notifications with null user_id
     *
     * @return array Array of notifications
     */
    public static function searchNotifications(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        ?string $type = null,
        string $sortBy = 'created_at',
        string $sortOrder = 'DESC',
        ?int $userId = null,
        ?int $serverId = null,
        ?bool $globalOnly = null,
    ): array {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;
        $params = [];

        $allowedSort = ['id', 'title', 'type', 'created_at', 'updated_at'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'created_at';
        }
        $sortOrder = strtoupper($sortOrder) === 'ASC' ? 'ASC' : 'DESC';

        $sql = 'SELECT * FROM ' . self::$table;
        $where = [];

        if (!empty($search)) {
            $where[] = '(title LIKE :search OR message_markdown LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($type !== null && $type !== '') {
            $where[] = 'type = :type';
            $params['type'] = $type;
        }

        if ($globalOnly === true) {
            $where[] = 'user_id IS NULL';
        } elseif ($userId !== null && $userId > 0) {
            $where[] = 'user_id = :user_id';
            $params['user_id'] = $userId;
        }

        if ($serverId !== null && $serverId > 0) {
            $where[] = 'server_id = :server_id';
            $params['server_id'] = $serverId;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= " ORDER BY $sortBy $sortOrder";
        $sql .= ' LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($results as &$result) {
            $result = self::normalizeRow($result);
        }

        return $results;
    }

    /**
     * Get count of notifications based on filters.
     *
     * @param string $search Search term (optional)
     * @param string|null $type Filter by type (optional)
     * @param int|null $userId Filter by target user (optional)
     * @param int|null $serverId Filter by target server (optional)
     * @param bool|null $globalOnly When true, only notifications with null user_id
     *
     * @return int Count of notifications
     */
    public static function getNotificationsCount(
        string $search = '',
        ?string $type = null,
        ?int $userId = null,
        ?int $serverId = null,
        ?bool $globalOnly = null,
    ): int {
        $pdo = Database::getPdoConnection();
        $params = [];

        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $where = [];

        if (!empty($search)) {
            $where[] = '(title LIKE :search OR message_markdown LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($type !== null && $type !== '') {
            $where[] = 'type = :type';
            $params['type'] = $type;
        }

        if ($globalOnly === true) {
            $where[] = 'user_id IS NULL';
        } elseif ($userId !== null && $userId > 0) {
            $where[] = 'user_id = :user_id';
            $params['user_id'] = $userId;
        }

        if ($serverId !== null && $serverId > 0) {
            $where[] = 'server_id = :server_id';
            $params['server_id'] = $serverId;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $stmt = $pdo->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }

        $stmt->execute();

        return (int) $stmt->fetchColumn();
    }

    /**
     * Get notifications visible to a user (global + targeted to them).
     *
     * @param int $userId User ID
     * @param bool $includeDismissed Include dismissed notifications (default: false, unused)
     * @param int $limit Maximum number of notifications to return
     *
     * @return array Array of notifications
     */
    public static function getNotificationsForUser(int $userId, bool $includeDismissed = false, int $limit = 50): array
    {
        unset($includeDismissed);

        if ($userId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();

        $sql = 'SELECT * FROM ' . self::$table
            . ' WHERE user_id IS NULL OR user_id = :user_id'
            . ' ORDER BY created_at DESC LIMIT :limit';
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($results as &$result) {
            $result = self::normalizeRow($result);
        }

        return $results;
    }

    /**
     * Whether a notification is visible to the given user.
     */
    public static function isVisibleToUser(array $notification, int $userId): bool
    {
        if ($userId <= 0) {
            return false;
        }

        $targetUserId = $notification['user_id'] ?? null;
        if ($targetUserId === null) {
            return true;
        }

        return (int) $targetUserId === $userId;
    }

    /**
     * Update a notification by ID.
     *
     * @param int $id Notification ID
     * @param array $data Fields to update
     *
     * @return bool True on success, false on failure
     */
    public static function updateNotification(int $id, array $data): bool
    {
        try {
            if ($id <= 0) {
                return false;
            }

            if (empty($data)) {
                App::getInstance(true)->getLogger()->error('No data to update');

                return false;
            }

            // Prevent updating primary key
            unset($data['id']);

            // Validate type if provided
            if (isset($data['type'])) {
                $validTypes = ['info', 'warning', 'danger', 'success', 'error'];
                if (!in_array($data['type'], $validTypes, true)) {
                    App::getInstance(true)->getLogger()->error('Invalid notification type: ' . $data['type']);

                    return false;
                }
            }

            if (array_key_exists('user_id', $data)) {
                if ($data['user_id'] === null || $data['user_id'] === '' || (int) $data['user_id'] <= 0) {
                    $data['user_id'] = null;
                } else {
                    $data['user_id'] = (int) $data['user_id'];
                }
            }

            if (array_key_exists('server_id', $data)) {
                if ($data['server_id'] === null || $data['server_id'] === '' || (int) $data['server_id'] <= 0) {
                    $data['server_id'] = null;
                } else {
                    $data['server_id'] = (int) $data['server_id'];
                }
            }

            // Convert boolean values to MySQL boolean (0/1)
            if (isset($data['is_dismissible'])) {
                $data['is_dismissible'] = $data['is_dismissible'] ? 1 : 0;
            }
            if (isset($data['is_sticky'])) {
                $data['is_sticky'] = $data['is_sticky'] ? 1 : 0;
            }

            // Validate fields exist in table
            $columns = self::getColumns();
            $columns = array_map(fn ($c) => $c['Field'], $columns);
            $missing = array_diff(array_keys($data), $columns);
            if (!empty($missing)) {
                App::getInstance(true)->getLogger()->error('Invalid fields: ' . implode(', ', $missing));

                return false;
            }

            $pdo = Database::getPdoConnection();
            $fields = array_keys($data);
            $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
            $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id';

            $params = $data;
            $params['id'] = $id;
            $stmt = $pdo->prepare($sql);

            return $stmt->execute($params);
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to update notification: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Dismiss a notification (mark as dismissed).
     * Note: Dismissal is handled client-side via localStorage. This method is kept for API compatibility.
     *
     * @param int $id Notification ID
     * @param int $userId User ID (not used, kept for compatibility)
     *
     * @return bool True on success, false on failure
     */
    public static function dismissNotification(int $id, int $userId): bool
    {
        if ($id <= 0) {
            return false;
        }

        $notification = self::getNotificationById($id);
        if (!$notification) {
            return false;
        }

        if (!self::isVisibleToUser($notification, $userId)) {
            return false;
        }

        // Notification dismissal is handled client-side via localStorage
        // This method always returns true for API compatibility when visible
        return true;
    }

    /**
     * Hard-delete a notification (permanently remove).
     *
     * @param int $id Notification ID
     *
     * @return bool True on success, false on failure
     */
    public static function hardDeleteNotification(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get table columns information.
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
     * Normalize boolean and nullable ID fields on a notification row.
     */
    private static function normalizeRow(array $result): array
    {
        $result['is_dismissible'] = (bool) $result['is_dismissible'];
        $result['is_sticky'] = (bool) $result['is_sticky'];
        $result['user_id'] = isset($result['user_id']) && $result['user_id'] !== null
            ? (int) $result['user_id']
            : null;
        $result['server_id'] = isset($result['server_id']) && $result['server_id'] !== null
            ? (int) $result['server_id']
            : null;

        return $result;
    }

    /**
     * Sanitize data for logging by excluding sensitive fields.
     *
     * @param array $data Data to sanitize
     *
     * @return array Sanitized data
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sensitiveFields = [
            'password',
            'remember_token',
            'two_fa_key',
            'api_key',
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
}
