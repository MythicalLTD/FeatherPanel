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

class ChatMessage
{
    private static string $table = 'featherpanel_chatbot_messages';

    /**
     * Create a new message.
     *
     * @param array $data Message data
     *
     * @return int|false Message ID or false on failure
     */
    public static function createMessage(array $data): int | false
    {
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
     * Get messages by conversation ID.
     *
     * @param int $conversationId Conversation ID
     * @param int $limit Maximum number of results
     *
     * @return array Array of messages
     */
    public static function getMessagesByConversation(int $conversationId, int $limit = 100): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE conversation_id = :conversation_id ORDER BY created_at ASC LIMIT :limit');
        $stmt->bindValue(':conversation_id', $conversationId);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get message count for a conversation.
     *
     * @param int $conversationId Conversation ID
     *
     * @return int Message count
     */
    public static function getMessageCount(int $conversationId): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE conversation_id = :conversation_id');
        $stmt->execute(['conversation_id' => $conversationId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Get message by ID.
     *
     * @param int $id Message ID
     *
     * @return array|null Message data or null if not found
     */
    public static function getMessageById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Delete messages by conversation ID.
     *
     * @param int $conversationId Conversation ID
     *
     * @return bool Success status
     */
    public static function deleteMessagesByConversation(int $conversationId): bool
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE conversation_id = :conversation_id');

            return $stmt->execute(['conversation_id' => $conversationId]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete messages: ' . $e->getMessage());

            return false;
        }
    }
}
