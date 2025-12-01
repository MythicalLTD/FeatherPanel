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
 * TicketAttachment service/model for CRUD operations on the featherpanel_ticket_attachments table.
 */
class TicketAttachment
{
    private static string $table = 'featherpanel_ticket_attachments';

    /**
     * Get all attachments for a ticket.
     *
     * @param int|null $ticketId Ticket ID
     * @param int|null $messageId Message ID
     * @param int $limit Number of records per page
     * @param int $offset Offset for pagination
     *
     * @return array Array of attachments
     */
    public static function getAll(
        ?int $ticketId = null,
        ?int $messageId = null,
        int $limit = 100,
        int $offset = 0,
    ): array {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $where = [];
        $params = [];

        if ($ticketId !== null) {
            $where[] = 'ticket_id = :ticket_id';
            $params['ticket_id'] = $ticketId;
        }

        if ($messageId !== null) {
            $where[] = 'message_id = :message_id';
            $params['message_id'] = $messageId;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);

        if (!empty($params)) {
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value, \PDO::PARAM_INT);
            }
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get attachment by ID.
     *
     * @param int $id Attachment ID
     *
     * @return array|null Attachment data or null if not found
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
     * Get count of attachments.
     *
     * @param int|null $ticketId Filter by ticket ID
     * @param int|null $messageId Filter by message ID
     *
     * @return int Count of attachments
     */
    public static function getCount(?int $ticketId = null, ?int $messageId = null): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $where = [];
        $params = [];

        if ($ticketId !== null) {
            $where[] = 'ticket_id = :ticket_id';
            $params['ticket_id'] = $ticketId;
        }

        if ($messageId !== null) {
            $where[] = 'message_id = :message_id';
            $params['message_id'] = $messageId;
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
     * Create a new attachment.
     *
     * @param array $data Attachment data
     *
     * @return int|false The new attachment's ID or false on failure
     */
    public static function create(array $data): int | false
    {
        $required = ['file_name', 'file_path', 'file_size', 'file_type'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                App::getInstance(true)->getLogger()->error("Missing required field: $field");

                return false;
            }
        }

        // At least one of ticket_id or message_id must be provided
        if ((!isset($data['ticket_id']) || $data['ticket_id'] === null) && (!isset($data['message_id']) || $data['message_id'] === null)) {
            App::getInstance(true)->getLogger()->error('Either ticket_id or message_id must be provided');

            return false;
        }

        // Validate ticket exists if provided
        if (isset($data['ticket_id']) && $data['ticket_id'] !== null) {
            if (!Ticket::getById($data['ticket_id'])) {
                App::getInstance(true)->getLogger()->error('Invalid ticket_id: ' . $data['ticket_id']);

                return false;
            }
        }

        // Validate message exists if provided
        if (isset($data['message_id']) && $data['message_id'] !== null) {
            if (!TicketMessage::getById($data['message_id'])) {
                App::getInstance(true)->getLogger()->error('Invalid message_id: ' . $data['message_id']);

                return false;
            }
        }

        $fields = ['ticket_id', 'message_id', 'file_name', 'file_path', 'file_size', 'file_type', 'user_downloadable'];
        $insert = [];
        foreach ($fields as $field) {
            if ($field === 'user_downloadable') {
                $insert[$field] = isset($data[$field]) ? (int) filter_var($data[$field], FILTER_VALIDATE_BOOLEAN) : 1; // Default to 1
            } elseif (($field === 'ticket_id' || $field === 'message_id') && (!isset($data[$field]) || $data[$field] === null)) {
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
     * Update an attachment by ID.
     *
     * @param int $id Attachment ID
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
        unset($data['id']);

        $fields = ['ticket_id', 'message_id', 'file_name', 'file_path', 'file_size', 'file_type', 'user_downloadable'];
        $set = [];
        $params = ['id' => $id];

        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                if ($field === 'user_downloadable') {
                    $params[$field] = (int) filter_var($data[$field], FILTER_VALIDATE_BOOLEAN);
                } else {
                    $params[$field] = $data[$field];
                }
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
     * Delete an attachment by ID.
     *
     * @param int $id Attachment ID
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
}
