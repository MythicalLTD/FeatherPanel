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

class ChatConversation
{
    private static string $table = 'featherpanel_chatbot_conversations';

    /**
     * Create a new conversation.
     *
     * @param array $data Conversation data
     *
     * @return int|false Conversation ID or false on failure
     */
    public static function createConversation(array $data): int | false
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
     * Get conversation by ID.
     *
     * @param int $id Conversation ID
     *
     * @return array|null Conversation data or null if not found
     */
    public static function getConversationById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get conversations by user UUID.
     *
     * @param string $userUuid User UUID
     * @param int $limit Maximum number of results
     *
     * @return array Array of conversations
     */
    public static function getConversationsByUser(string $userUuid, int $limit = 50): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE user_uuid = :user_uuid ORDER BY updated_at DESC LIMIT :limit');
        $stmt->bindValue(':user_uuid', $userUuid);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Update conversation.
     *
     * @param int $id Conversation ID
     * @param array $data Data to update
     *
     * @return bool Success status
     */
    public static function updateConversation(int $id, array $data): bool
    {
        if (empty($data)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
        $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $data['id'] = $id;

        return $stmt->execute($data);
    }

    /**
     * Delete conversation.
     *
     * @param int $id Conversation ID
     *
     * @return bool Success status
     */
    public static function deleteConversation(int $id): bool
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

            return $stmt->execute(['id' => $id]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete conversation: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Delete all conversations for a user.
     *
     * @param string $userUuid User UUID
     *
     * @return bool Success status
     */
    public static function deleteUserConversations(string $userUuid): bool
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE user_uuid = :user_uuid');

            return $stmt->execute(['user_uuid' => $userUuid]);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete user conversations: ' . $e->getMessage());

            return false;
        }
    }
}
