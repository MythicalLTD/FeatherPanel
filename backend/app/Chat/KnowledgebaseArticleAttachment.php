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
 * KnowledgebaseArticleAttachment service/model for CRUD operations on the featherpanel_knowledgebase_articles_attachments table.
 */
class KnowledgebaseArticleAttachment
{
    private static string $table = 'featherpanel_knowledgebase_articles_attachments';

    /**
     * Get all attachments for an article.
     *
     * @param int $articleId Article ID
     * @param bool|null $userDownloadable If true, only return user-downloadable attachments. If false, only non-downloadable. If null, return all.
     *
     * @return array Array of attachments
     */
    public static function getByArticleId(int $articleId, ?bool $userDownloadable = null): array
    {
        if ($articleId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table . ' WHERE article_id = :article_id';
        $params = ['article_id' => $articleId];

        if ($userDownloadable !== null) {
            $sql .= ' AND user_downloadable = :user_downloadable';
            $params['user_downloadable'] = $userDownloadable ? 1 : 0;
        }

        $sql .= ' ORDER BY created_at DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

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
     * Create a new attachment.
     *
     * @param array $data Attachment data
     *
     * @return int|false The new attachment's ID or false on failure
     */
    public static function create(array $data): int | false
    {
        $required = ['article_id', 'file_name', 'file_path', 'file_size', 'file_type'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                App::getInstance(true)->getLogger()->error("Missing required field: $field");

                return false;
            }
        }

        // Validate article_id exists
        if (!KnowledgebaseArticle::getById($data['article_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid article_id: ' . $data['article_id']);

            return false;
        }

        // Validate file_size is numeric
        if (!is_numeric($data['file_size']) || $data['file_size'] < 0) {
            App::getInstance(true)->getLogger()->error('Invalid file_size: ' . $data['file_size']);

            return false;
        }

        $fields = ['article_id', 'file_name', 'file_path', 'file_size', 'file_type', 'user_downloadable'];
        $insert = [];
        foreach ($fields as $field) {
            if ($field === 'article_id' || $field === 'file_size') {
                $insert[$field] = is_numeric($data[$field]) ? (int) $data[$field] : null;
            } elseif ($field === 'user_downloadable') {
                $insert[$field] = isset($data[$field]) ? (int) filter_var($data[$field], FILTER_VALIDATE_BOOLEAN) : 0;
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

        $fields = ['file_name', 'file_path', 'file_size', 'file_type', 'user_downloadable'];
        $set = [];
        $params = ['id' => $id];

        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                if ($field === 'file_size') {
                    if (is_numeric($data[$field]) && $data[$field] >= 0) {
                        $params[$field] = (int) $data[$field];
                        $set[] = "`$field` = :$field";
                    }
                } elseif ($field === 'user_downloadable') {
                    $params[$field] = (int) filter_var($data[$field], FILTER_VALIDATE_BOOLEAN);
                    $set[] = "`$field` = :$field";
                } else {
                    $params[$field] = $data[$field];
                    $set[] = "`$field` = :$field";
                }
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

    /**
     * Delete all attachments for an article.
     *
     * @param int $articleId Article ID
     *
     * @return bool True on success, false on failure
     */
    public static function deleteByArticleId(int $articleId): bool
    {
        if ($articleId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE article_id = :article_id');

        return $stmt->execute(['article_id' => $articleId]);
    }
}
