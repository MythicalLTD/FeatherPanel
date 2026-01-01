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

        // Remove user_id if provided (column doesn't exist)
        if (isset($data['user_id'])) {
            unset($data['user_id']);
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
            // Convert boolean values
            $result['is_dismissible'] = (bool) $result['is_dismissible'];
            $result['is_sticky'] = (bool) $result['is_sticky'];
        }

        return $result ?: null;
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
    ): array {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;
        $params = [];

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

        // Convert boolean values
        foreach ($results as &$result) {
            $result['is_dismissible'] = (bool) $result['is_dismissible'];
            $result['is_sticky'] = (bool) $result['is_sticky'];
        }

        return $results;
    }

    /**
     * Get count of notifications based on filters.
     *
     * @param string $search Search term (optional)
     * @param string|null $type Filter by type (optional)
     *
     * @return int Count of notifications
     */
    public static function getNotificationsCount(
        string $search = '',
        ?string $type = null,
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
     * Get notifications for a user.
     *
     * @param int $userId User ID (not used, kept for compatibility)
     * @param bool $includeDismissed Include dismissed notifications (default: false)
     * @param int $limit Maximum number of notifications to return
     *
     * @return array Array of notifications
     */
    public static function getNotificationsForUser(int $userId, bool $includeDismissed = false, int $limit = 50): array
    {
        $pdo = Database::getPdoConnection();

        $sql = 'SELECT * FROM ' . self::$table . ' ORDER BY created_at DESC LIMIT :limit';
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Convert boolean values
        foreach ($results as &$result) {
            $result['is_dismissible'] = (bool) $result['is_dismissible'];
            $result['is_sticky'] = (bool) $result['is_sticky'];
        }

        return $results;
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

            // Remove user_id if provided (column doesn't exist)
            if (isset($data['user_id'])) {
                unset($data['user_id']);
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

        // Notification dismissal is handled client-side via localStorage
        // This method always returns true for API compatibility
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
