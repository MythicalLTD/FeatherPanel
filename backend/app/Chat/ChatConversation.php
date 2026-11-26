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
    private static ?array $columns = null;

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
        $data = Database::filterColumns(self::$table, $data);
        if ($data === []) {
            return false;
        }
        $fields = array_keys($data);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (`' . implode('`, `', $fields) . '`) VALUES (' . implode(',', $placeholders) . ')';
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
     * @param string|null $scope Optional scope filter (server|vds|webspace|dashboard)
     *
     * @return array Array of conversations
     */
    public static function getConversationsByUser(string $userUuid, int $limit = 50, ?string $scope = null): array
    {
        $pdo = Database::getPdoConnection();
        $hasScope = self::hasColumn('scope');
        $sql = 'SELECT * FROM ' . self::$table . ' WHERE user_uuid = :user_uuid';
        if ($hasScope && $scope !== null && $scope !== '') {
            $sql .= ' AND scope = :scope';
        }
        $sql .= ' ORDER BY updated_at DESC LIMIT :limit';
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':user_uuid', $userUuid);
        if ($hasScope && $scope !== null && $scope !== '') {
            $stmt->bindValue(':scope', $scope);
        }
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get conversations for a user limited to one of several scopes.
     *
     * @param list<string> $scopes
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getConversationsByUserScopes(string $userUuid, array $scopes, int $limit = 50): array
    {
        $scopes = array_values(array_filter(array_map('strval', $scopes), static fn (string $s): bool => $s !== ''));
        if ($scopes === [] || !self::hasColumn('scope')) {
            return self::getConversationsByUser($userUuid, $limit);
        }
        if (count($scopes) === 1) {
            return self::getConversationsByUser($userUuid, $limit, $scopes[0]);
        }

        $pdo = Database::getPdoConnection();
        $placeholders = [];
        $params = ['user_uuid' => $userUuid];
        foreach ($scopes as $i => $scope) {
            $key = 'scope_' . $i;
            $placeholders[] = ':' . $key;
            $params[$key] = $scope;
        }
        $sql = 'SELECT * FROM ' . self::$table
            . ' WHERE user_uuid = :user_uuid AND scope IN (' . implode(', ', $placeholders) . ')'
            . ' ORDER BY updated_at DESC LIMIT :limit';
        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Whether a conversation belongs to any of the expected scopes.
     *
     * @param list<string> $expectedScopes
     */
    public static function matchesAnyScope(?array $conversation, array $expectedScopes): bool
    {
        if ($conversation === null) {
            return false;
        }
        if (!self::hasColumn('scope')) {
            return true;
        }
        $scope = (string) ($conversation['scope'] ?? 'server');

        return in_array($scope, $expectedScopes, true);
    }

    /**
     * Whether a conversation belongs to the expected scope (missing column = always ok).
     */
    public static function matchesScope(?array $conversation, string $expectedScope): bool
    {
        if ($conversation === null) {
            return false;
        }
        if (!self::hasColumn('scope')) {
            return true;
        }
        $scope = (string) ($conversation['scope'] ?? 'server');

        return $scope === $expectedScope;
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
        $data = array_intersect_key($data, array_flip(self::getColumns()));
        if (empty($data)) {
            return false;
        }
        $fields = array_keys($data);
        $set = implode(', ', array_map(fn ($f) => "`$f` = :$f", $fields));
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

    public static function hasColumn(string $column): bool
    {
        return in_array($column, self::getColumns(), true);
    }

    private static function getColumns(): array
    {
        if (self::$columns !== null) {
            return self::$columns;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SHOW COLUMNS FROM ' . self::$table);
        self::$columns = array_map(static fn (array $column): string => $column['Field'], $stmt->fetchAll(\PDO::FETCH_ASSOC));

        return self::$columns;
    }
}
