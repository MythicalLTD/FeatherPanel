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
