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
 * Ticket service/model for CRUD operations on the featherpanel_tickets table.
 */
class Ticket
{
    private static string $table = 'featherpanel_tickets';

    /**
     * Get all tickets with optional search and pagination.
     *
     * @param string|null $search Search term
     * @param int $limit Number of records per page
     * @param int $offset Offset for pagination
     * @param int|null $serverId Filter by server ID
     * @param int|null $categoryId Filter by category ID
     * @param int|null $statusId Filter by status ID
     *
     * @return array Array of tickets
     */
    public static function getAll(
        ?string $search = null,
        int $limit = 10,
        int $offset = 0,
        ?string $userUuid = null,
        ?int $serverId = null,
        ?int $categoryId = null,
        ?int $statusId = null,
    ): array {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $where = [];
        $params = [];

        if ($search !== null && trim($search) !== '') {
            $where[] = '(title LIKE :search OR description LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($userUuid !== null) {
            $where[] = 'user_uuid = :user_uuid';
            $params['user_uuid'] = $userUuid;
        }

        if ($serverId !== null) {
            $where[] = 'server_id = :server_id';
            $params['server_id'] = $serverId;
        }

        if ($categoryId !== null) {
            $where[] = 'category_id = :category_id';
            $params['category_id'] = $categoryId;
        }

        if ($statusId !== null) {
            $where[] = 'status_id = :status_id';
            $params['status_id'] = $statusId;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);

        if (!empty($params)) {
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get ticket by ID.
     *
     * @param int $id Ticket ID
     *
     * @return array|null Ticket data or null if not found
     */
    public static function getById(int $id): ?array
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
     * Get ticket by UUID.
     *
     * @param string $uuid Ticket UUID
     *
     * @return array|null Ticket data or null if not found
     */
    public static function getByUuid(string $uuid): ?array
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get count of tickets.
     *
     * @param string|null $search Search term
     * @param string|null $userUuid Filter by user UUID
     * @param int|null $serverId Filter by server ID
     * @param int|null $categoryId Filter by category ID
     * @param int|null $statusId Filter by status ID
     *
     * @return int Count of tickets
     */
    public static function getCount(
        ?string $search = null,
        ?string $userUuid = null,
        ?int $serverId = null,
        ?int $categoryId = null,
        ?int $statusId = null,
    ): int {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $where = [];
        $params = [];

        if ($search !== null && trim($search) !== '') {
            $where[] = '(title LIKE :search OR description LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($userUuid !== null) {
            $where[] = 'user_uuid = :user_uuid';
            $params['user_uuid'] = $userUuid;
        }

        if ($serverId !== null) {
            $where[] = 'server_id = :server_id';
            $params['server_id'] = $serverId;
        }

        if ($categoryId !== null) {
            $where[] = 'category_id = :category_id';
            $params['category_id'] = $categoryId;
        }

        if ($statusId !== null) {
            $where[] = 'status_id = :status_id';
            $params['status_id'] = $statusId;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $stmt = $pdo->prepare($sql);
        if (!empty($params)) {
            $stmt->execute($params);
        } else {
            $stmt->execute();
        }

        return (int) $stmt->fetchColumn();
    }

    /**
     * Get count of open tickets for a user (where closed_at IS NULL).
     *
     * @param string $userUuid User UUID
     *
     * @return int Count of open tickets
     */
    public static function getOpenTicketsCount(string $userUuid): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table . ' WHERE user_uuid = :user_uuid AND closed_at IS NULL';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['user_uuid' => $userUuid]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Create a new ticket.
     *
     * @param array $data Ticket data
     *
     * @return int|false The new ticket's ID or false on failure
     */
    public static function create(array $data): int | false
    {
        $required = ['uuid', 'user_uuid', 'category_id', 'priority_id', 'status_id', 'title', 'description'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                App::getInstance(true)->getLogger()->error("Missing required field: $field");

                return false;
            }
        }

        // Validate UUID format
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
            App::getInstance(true)->getLogger()->error('Invalid UUID format: ' . $data['uuid']);

            return false;
        }

        // Validate user UUID
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['user_uuid'])) {
            App::getInstance(true)->getLogger()->error('Invalid user UUID format: ' . $data['user_uuid']);

            return false;
        }

        // Validate foreign keys exist
        if (!TicketCategory::getById($data['category_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid category_id: ' . $data['category_id']);

            return false;
        }

        if (!TicketPriority::getById($data['priority_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid priority_id: ' . $data['priority_id']);

            return false;
        }

        if (!TicketStatus::getById($data['status_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid status_id: ' . $data['status_id']);

            return false;
        }

        // Validate user exists
        if (!User::getUserByUuid($data['user_uuid'])) {
            App::getInstance(true)->getLogger()->error('Invalid user_uuid: ' . $data['user_uuid']);

            return false;
        }

        // Validate server if provided
        if (isset($data['server_id']) && $data['server_id'] !== null) {
            if (!Server::getServerById($data['server_id'])) {
                App::getInstance(true)->getLogger()->error('Invalid server_id: ' . $data['server_id']);

                return false;
            }
        }

        $fields = ['uuid', 'user_uuid', 'server_id', 'category_id', 'priority_id', 'status_id', 'title', 'description', 'closed_at'];
        $insert = [];
        foreach ($fields as $field) {
            if ($field === 'server_id' && (!isset($data[$field]) || $data[$field] === null)) {
                $insert[$field] = null;
            } else {
                $insert[$field] = $data[$field] ?? null;
            }
        }

        $pdo = Database::getPdoConnection();
        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($insert)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Update a ticket by ID.
     *
     * @param int $id Ticket ID
     * @param array $data Fields to update
     *
     * @return bool True on success, false on failure
     */
    public static function update(int $id, array $data): bool
    {
        if ($id <= 0) {
            return false;
        }

        if (empty($data)) {
            return false;
        }

        // Prevent updating primary keys
        unset($data['id'], $data['uuid']);

        // Validate foreign keys if provided
        if (isset($data['category_id']) && !TicketCategory::getById($data['category_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid category_id: ' . $data['category_id']);

            return false;
        }

        if (isset($data['priority_id']) && !TicketPriority::getById($data['priority_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid priority_id: ' . $data['priority_id']);

            return false;
        }

        if (isset($data['status_id']) && !TicketStatus::getById($data['status_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid status_id: ' . $data['status_id']);

            return false;
        }

        if (isset($data['server_id']) && $data['server_id'] !== null && !Server::getServerById($data['server_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid server_id: ' . $data['server_id']);

            return false;
        }

        $fields = ['user_uuid', 'server_id', 'category_id', 'priority_id', 'status_id', 'title', 'description', 'closed_at'];
        $set = [];
        $params = ['id' => $id];

        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $params[$field] = $data[$field];
                $set[] = "`$field` = :$field";
            }
        }

        if (empty($set)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $set) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /**
     * Update a ticket by UUID.
     *
     * @param string $uuid Ticket UUID
     * @param array $data Fields to update
     *
     * @return bool True on success, false on failure
     */
    public static function updateByUuid(string $uuid, array $data): bool
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $uuid)) {
            return false;
        }

        $ticket = self::getByUuid($uuid);
        if (!$ticket) {
            return false;
        }

        return self::update($ticket['id'], $data);
    }

    /**
     * Delete a ticket by ID.
     *
     * @param int $id Ticket ID
     *
     * @return bool True on success, false on failure
     */
    public static function delete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Generate a UUID for a new ticket.
     */
    public static function generateUuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr(ord($bytes[6]) & 0x0F | 0x40);
        $bytes[8] = chr(ord($bytes[8]) & 0x3F | 0x80);
        $hex = bin2hex($bytes);

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12)
        );
    }
}
