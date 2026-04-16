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
 * TicketMessage service/model for CRUD operations on the featherpanel_ticket_messages table.
 */
class TicketMessage
{
    private static string $table = 'featherpanel_ticket_messages';

    /**
     * Get all messages for a ticket.
     *
     * @param int $ticketId Ticket ID
     * @param int $limit Number of records per page
     * @param int $offset Offset for pagination
     *
     * @return array Array of messages
     */
    public static function getByTicketId(int $ticketId, int $limit = 100, int $offset = 0): array
    {
        if ($ticketId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE ticket_id = :ticket_id ORDER BY created_at DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue('ticket_id', $ticketId, \PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get message by ID.
     *
     * @param int $id Message ID
     *
     * @return array|null Message data or null if not found
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
     * Get count of messages for a ticket.
     *
     * @param int $ticketId Ticket ID
     *
     * @return int Count of messages
     */
    public static function getCountByTicketId(int $ticketId): int
    {
        if ($ticketId <= 0) {
            return 0;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE ticket_id = :ticket_id');
        $stmt->execute(['ticket_id' => $ticketId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Get unread message metadata for a user since their last reply in a ticket.
     *
     * "Unread" here means non-internal messages created by other users after the
     * authenticated user's latest message in the same ticket.
     *
     * @param int $ticketId Ticket ID
     * @param string $userUuid User UUID
     *
     * @return array{unread_count:int,has_unread:bool}
     */
    public static function getUnreadSinceLastReply(int $ticketId, string $userUuid): array
    {
        if ($ticketId <= 0) {
            return ['unread_count' => 0, 'has_unread' => false];
        }
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return ['unread_count' => 0, 'has_unread' => false];
        }

        $pdo = Database::getPdoConnection();
        $sql = '
            SELECT COUNT(*) AS unread_count
            FROM ' . self::$table . ' tm
            WHERE tm.ticket_id = :ticket_id
              AND tm.is_internal = 0
              AND tm.user_uuid IS NOT NULL
              AND tm.user_uuid <> :user_uuid
              AND tm.created_at > COALESCE(
                  (
                      SELECT MAX(own.created_at)
                      FROM ' . self::$table . ' own
                      WHERE own.ticket_id = :ticket_id_own
                        AND own.user_uuid = :user_uuid_own
                  ),
                  "1970-01-01 00:00:00"
              )
        ';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'ticket_id' => $ticketId,
            'user_uuid' => $userUuid,
            'ticket_id_own' => $ticketId,
            'user_uuid_own' => $userUuid,
        ]);

        $unreadCount = (int) $stmt->fetchColumn();

        return [
            'unread_count' => $unreadCount,
            'has_unread' => $unreadCount > 0,
        ];
    }

    /**
     * Create a new message.
     *
     * @param array $data Message data
     *
     * @return int|false The new message's ID or false on failure
     */
    public static function create(array $data): int | false
    {
        $required = ['ticket_id', 'message'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                App::getInstance(true)->getLogger()->error("Missing required field: $field");

                return false;
            }
        }

        // Validate ticket exists
        if (!Ticket::getById($data['ticket_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid ticket_id: ' . $data['ticket_id']);

            return false;
        }

        // Validate user UUID if provided
        if (isset($data['user_uuid']) && $data['user_uuid'] !== null) {
            if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['user_uuid'])) {
                App::getInstance(true)->getLogger()->error('Invalid user_uuid format: ' . $data['user_uuid']);

                return false;
            }

            if (!User::getUserByUuid($data['user_uuid'])) {
                App::getInstance(true)->getLogger()->error('Invalid user_uuid: ' . $data['user_uuid']);

                return false;
            }
        }

        $fields = ['ticket_id', 'user_uuid', 'message', 'is_internal'];
        $insert = [];
        foreach ($fields as $field) {
            if ($field === 'is_internal') {
                $insert[$field] = isset($data[$field]) && $data[$field] ? 1 : 0;
            } elseif ($field === 'user_uuid' && (!isset($data[$field]) || $data[$field] === null)) {
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
     * Update a message by ID.
     *
     * @param int $id Message ID
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
        unset($data['id'], $data['ticket_id']);

        $fields = ['user_uuid', 'message', 'is_internal'];
        $set = [];
        $params = ['id' => $id];

        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                if ($field === 'is_internal') {
                    $params[$field] = $data[$field] ? 1 : 0;
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
     * Delete a message by ID.
     *
     * @param int $id Message ID
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
