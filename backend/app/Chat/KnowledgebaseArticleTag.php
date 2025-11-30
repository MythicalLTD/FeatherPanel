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
 * KnowledgebaseArticleTag service/model for CRUD operations on the featherpanel_knowledgebase_articles_tags table.
 */
class KnowledgebaseArticleTag
{
    private static string $table = 'featherpanel_knowledgebase_articles_tags';

    /**
     * Get all tags for an article.
     *
     * @param int $articleId Article ID
     *
     * @return array Array of tags
     */
    public static function getByArticleId(int $articleId): array
    {
        if ($articleId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE article_id = :article_id ORDER BY tag_name ASC'
        );
        $stmt->execute(['article_id' => $articleId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get all articles with a specific tag.
     *
     * @param string $tagName Tag name
     * @param int $limit Number of records
     *
     * @return array Array of article IDs
     */
    public static function getArticleIdsByTag(string $tagName, int $limit = 100): array
    {
        if (trim($tagName) === '') {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT DISTINCT article_id FROM ' . self::$table . ' WHERE tag_name = :tag_name LIMIT :limit'
        );
        $stmt->bindValue('tag_name', $tagName);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(fn ($row) => (int) $row['article_id'], $results);
    }

    /**
     * Get all unique tag names.
     *
     * @param int $limit Number of records
     *
     * @return array Array of tag names
     */
    public static function getAllTagNames(int $limit = 1000): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT DISTINCT tag_name FROM ' . self::$table . ' ORDER BY tag_name ASC LIMIT :limit'
        );
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(fn ($row) => $row['tag_name'], $results);
    }

    /**
     * Get tag by ID.
     *
     * @param int $id Tag ID
     *
     * @return array|null Tag data or null if not found
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
     * Create a new tag.
     *
     * @param array $data Tag data
     *
     * @return int|false The new tag's ID or false on failure
     */
    public static function create(array $data): int | false
    {
        $required = ['article_id', 'tag_name'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                App::getInstance(true)->getLogger()->error("Missing required field: $field");

                return false;
            }
        }

        // Validate article_id exists
        if (!KnowledgebaseArticle::getById($data['article_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid article_id: ' . $data['article_id']);

            return false;
        }

        // Check if tag already exists for this article
        $existing = self::getByArticleId($data['article_id']);
        foreach ($existing as $tag) {
            if ($tag['tag_name'] === $data['tag_name']) {
                App::getInstance(true)->getLogger()->error('Tag already exists for this article');

                return false;
            }
        }

        $pdo = Database::getPdoConnection();
        $sql = 'INSERT INTO ' . self::$table . ' (`article_id`, `tag_name`) VALUES (:article_id, :tag_name)';
        $stmt = $pdo->prepare($sql);

        if (
            $stmt->execute([
                'article_id' => (int) $data['article_id'],
                'tag_name' => trim($data['tag_name']),
            ])
        ) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Delete a tag by ID.
     *
     * @param int $id Tag ID
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
     * Delete all tags for an article.
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

    /**
     * Delete a specific tag from an article.
     *
     * @param int $articleId Article ID
     * @param string $tagName Tag name
     *
     * @return bool True on success, false on failure
     */
    public static function deleteByArticleIdAndTag(int $articleId, string $tagName): bool
    {
        if ($articleId <= 0 || trim($tagName) === '') {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'DELETE FROM ' . self::$table . ' WHERE article_id = :article_id AND tag_name = :tag_name'
        );

        return $stmt->execute([
            'article_id' => $articleId,
            'tag_name' => trim($tagName),
        ]);
    }
}
