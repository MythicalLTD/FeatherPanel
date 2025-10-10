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
 * ServerActivity service/model for CRUD operations on the featherpanel_server_activities table.
 *
 * This handles server-specific activities like:
 * - server:power.start
 * - server:power.stop
 * - server:power.restart
 * - server:install
 * - server:backup
 * - server:console
 * - etc.
 */
class ServerActivity
{
    /**
     * @var string The server activities table name
     */
    private static string $table = 'featherpanel_server_activities';

    /**
     * Create a new server activity log.
     *
     * @param array $data Associative array of activity fields
     *
     * @return int|false The new activity's ID or false on failure
     */
    public static function createActivity(array $data): int|false
    {
        // Required fields for activity creation
        $required = [
            'server_id',
            'node_id',
            'event',
        ];

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for server activity');

                return false;
            }
        }

        // Validate numeric fields
        if (!is_numeric($data['server_id']) || (int) $data['server_id'] <= 0) {
            App::getInstance(true)->getLogger()->error('Invalid server_id: ' . $data['server_id']);

            return false;
        }

        if (!is_numeric($data['node_id']) || (int) $data['node_id'] <= 0) {
            App::getInstance(true)->getLogger()->error('Invalid node_id: ' . $data['node_id']);

            return false;
        }

        // Validate user_id if provided
        if (isset($data['user_id']) && $data['user_id'] !== null) {
            if (!is_numeric($data['user_id']) || (int) $data['user_id'] <= 0) {
                App::getInstance(true)->getLogger()->error('Invalid user_id: ' . $data['user_id']);

                return false;
            }
        }

        // Validate event field
        if (!is_string($data['event']) || trim($data['event']) === '') {
            App::getInstance(true)->getLogger()->error('Invalid event: ' . $data['event']);

            return false;
        }

        // Set default timestamp if not provided
        if (!isset($data['timestamp'])) {
            $data['timestamp'] = date('Y-m-d H:i:s');
        }

        // Ensure metadata is JSON if it's an array
        if (isset($data['metadata']) && is_array($data['metadata'])) {
            $data['metadata'] = json_encode($data['metadata']);
        }

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
     * Get activity by ID.
     *
     * @param int $id Activity ID
     *
     * @return array|null Activity data or null if not found
     */
    public static function getActivityById(int $id): ?array
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
     * Get activities by server ID.
     *
     * @param int $serverId Server ID
     * @param int $limit Maximum number of results (default: 100)
     *
     * @return array Array of activities
     */
    public static function getActivitiesByServerId(int $serverId, int $limit = 100): array
    {
        if ($serverId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY timestamp DESC LIMIT :limit');
        $stmt->bindValue(':server_id', $serverId, \PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get activities by node ID.
     *
     * @param int $nodeId Node ID
     * @param int $limit Maximum number of results (default: 100)
     *
     * @return array Array of activities
     */
    public static function getActivitiesByNodeId(int $nodeId, int $limit = 100): array
    {
        if ($nodeId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE node_id = :node_id ORDER BY timestamp DESC LIMIT :limit');
        $stmt->bindValue(':node_id', $nodeId, \PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get activities by event type.
     *
     * @param string $event Event type
     * @param int $limit Maximum number of results (default: 100)
     *
     * @return array Array of activities
     */
    public static function getActivitiesByEvent(string $event, int $limit = 100): array
    {
        if (trim($event) === '') {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE event = :event ORDER BY timestamp DESC LIMIT :limit');
        $stmt->bindValue(':event', $event, \PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get activities by user ID.
     *
     * @param int $userId User ID
     * @param int $limit Maximum number of results (default: 100)
     *
     * @return array Array of activities
     */
    public static function getActivitiesByUserId(int $userId, int $limit = 100): array
    {
        if ($userId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE user_id = :user_id ORDER BY timestamp DESC LIMIT :limit');
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get activities by user ID with server information.
     *
     * @param int $userId User ID
     * @param int $limit Maximum number of results (default: 100)
     *
     * @return array Array of activities with server details
     */
    public static function getActivitiesByUserIdWithServerInfo(int $userId, int $limit = 100): array
    {
        if ($userId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT sa.*, s.name as server_name, s.uuid as server_uuid, n.name as node_name 
				FROM ' . self::$table . ' sa
				LEFT JOIN featherpanel_servers s ON sa.server_id = s.id
				LEFT JOIN featherpanel_nodes n ON sa.node_id = n.id
				WHERE sa.user_id = :user_id 
				ORDER BY sa.timestamp DESC 
				LIMIT :limit';
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get all activities with pagination.
     *
     * @param int $page Page number (1-based)
     * @param int $perPage Number of results per page
     * @param string $search Search term for event (optional)
     * @param int|null $serverId Filter by server ID (optional)
     * @param int|null $nodeId Filter by node ID (optional)
     * @param int|null $userId Filter by user ID (optional)
     *
     * @return array Array of activities with pagination info
     */
    public static function getActivitiesWithPagination(
        int $page = 1,
        int $perPage = 50,
        string $search = '',
        ?int $serverId = null,
        ?int $nodeId = null,
        ?int $userId = null,
        ?array $serverIds = null,
    ): array {
        $pdo = Database::getPdoConnection();
        $where = [];
        $params = [];

        if ($search !== '') {
            $where[] = 'event LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        if ($serverId !== null) {
            $where[] = 'server_id = :server_id';
            $params['server_id'] = $serverId;
        }

        if (is_array($serverIds) && !empty($serverIds)) {
            // Build an IN (...) clause with named placeholders
            $inPlaceholders = [];
            foreach ($serverIds as $idx => $sid) {
                $ph = ':sid' . $idx;
                $inPlaceholders[] = $ph;
                $params['sid' . $idx] = (int) $sid;
            }
            $where[] = 'server_id IN (' . implode(',', $inPlaceholders) . ')';
        }

        if ($nodeId !== null) {
            $where[] = 'node_id = :node_id';
            $params['node_id'] = $nodeId;
        }

        if ($userId !== null) {
            $where[] = 'user_id = :user_id';
            $params['user_id'] = $userId;
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        // Get total count
        $countSql = 'SELECT COUNT(*) FROM ' . self::$table . ' ' . $whereClause;
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        // Calculate pagination
        $offset = ($page - 1) * $perPage;
        $totalPages = max(1, (int) ceil($total / $perPage));

        // Get activities
        $sql = 'SELECT * FROM ' . self::$table . ' ' . $whereClause . ' ORDER BY timestamp DESC LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->execute();

        $activities = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'data' => $activities,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => $totalPages,
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total),
            ],
        ];
    }

    /**
     * Delete old activities (cleanup).
     *
     * @param int $daysOld Number of days old to delete
     *
     * @return int Number of deleted records
     */
    public static function deleteOldActivities(int $daysOld = 30): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE timestamp < DATE_SUB(NOW(), INTERVAL :days DAY)');
        $stmt->bindValue(':days', $daysOld, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount();
    }

    /**
     * Get table columns.
     *
     * @return array Array of column information
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}
