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
 * KnowledgebaseArticle service/model for CRUD operations on the featherpanel_knowledgebase_articles table.
 */
class KnowledgebaseArticle
{
    private static string $table = 'featherpanel_knowledgebase_articles';

    /**
     * Get all articles with optional filters and pagination.
     *
     * @param int $page Page number
     * @param int $limit Number of records per page
     * @param string $search Search term
     * @param int|null $categoryId Filter by category ID
     * @param string|null $status Filter by status
     * @param bool|null $pinned Filter by pinned status
     *
     * @return array Array of articles
     */
    public static function searchArticles(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        ?int $categoryId = null,
        ?string $status = null,
        ?bool $pinned = null,
    ): array {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;
        $params = [];

        $sql = 'SELECT * FROM ' . self::$table . ' WHERE 1=1';

        if (!empty($search)) {
            $sql .= ' AND (title LIKE :search OR content LIKE :search OR slug LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($categoryId !== null && $categoryId > 0) {
            $sql .= ' AND category_id = :category_id';
            $params['category_id'] = $categoryId;
        }

        if ($status !== null && in_array($status, ['draft', 'published', 'archived'], true)) {
            $sql .= ' AND status = :status';
            $params['status'] = $status;
        }

        if ($pinned !== null) {
            $sql .= ' AND pinned = :pinned';
            $params['pinned'] = $pinned ? 'true' : 'false';
        }

        $sql .= ' ORDER BY pinned DESC, published_at DESC, created_at DESC LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get article by ID.
     *
     * @param int $id Article ID
     *
     * @return array|null Article data or null if not found
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
     * Get article by slug.
     *
     * @param string $slug Article slug
     *
     * @return array|null Article data or null if not found
     */
    public static function getBySlug(string $slug): ?array
    {
        if (trim($slug) === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE slug = :slug LIMIT 1');
        $stmt->execute(['slug' => $slug]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get articles by category ID.
     *
     * @param int $categoryId Category ID
     * @param int $limit Number of records
     *
     * @return array Array of articles
     */
    public static function getByCategoryId(int $categoryId, int $limit = 100): array
    {
        if ($categoryId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE category_id = :category_id ORDER BY pinned DESC, published_at DESC, created_at DESC LIMIT :limit'
        );
        $stmt->bindValue('category_id', $categoryId, \PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get articles by author ID.
     *
     * @param int $authorId Author ID
     * @param int $limit Number of records
     *
     * @return array Array of articles
     */
    public static function getByAuthorId(int $authorId, int $limit = 100): array
    {
        if ($authorId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE author_id = :author_id ORDER BY created_at DESC LIMIT :limit'
        );
        $stmt->bindValue('author_id', $authorId, \PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get count of articles.
     *
     * @param string $search Search term
     * @param int|null $categoryId Filter by category ID
     * @param string|null $status Filter by status
     * @param bool|null $pinned Filter by pinned status
     *
     * @return int Count of articles
     */
    public static function getCount(
        string $search = '',
        ?int $categoryId = null,
        ?string $status = null,
        ?bool $pinned = null,
    ): int {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table . ' WHERE 1=1';
        $params = [];

        if (!empty($search)) {
            $sql .= ' AND (title LIKE :search OR content LIKE :search OR slug LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($categoryId !== null && $categoryId > 0) {
            $sql .= ' AND category_id = :category_id';
            $params['category_id'] = $categoryId;
        }

        if ($status !== null && in_array($status, ['draft', 'published', 'archived'], true)) {
            $sql .= ' AND status = :status';
            $params['status'] = $status;
        }

        if ($pinned !== null) {
            $sql .= ' AND pinned = :pinned';
            $params['pinned'] = $pinned ? 'true' : 'false';
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
     * Create a new article.
     *
     * @param array $data Article data
     *
     * @return int|false The new article's ID or false on failure
     */
    public static function create(array $data): int | false
    {
        $required = ['category_id', 'title', 'slug', 'content', 'author_id'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                App::getInstance(true)->getLogger()->error("Missing required field: $field");

                return false;
            }
        }

        // Validate category_id exists
        if (!KnowledgebaseCategory::getById($data['category_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid category_id: ' . $data['category_id']);

            return false;
        }

        // Validate author_id exists
        if (!User::getUserById($data['author_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid author_id: ' . $data['author_id']);

            return false;
        }

        $fields = ['category_id', 'title', 'slug', 'icon', 'content', 'author_id', 'status', 'pinned', 'published_at'];
        $insert = [];
        foreach ($fields as $field) {
            if ($field === 'status') {
                $insert[$field] = isset($data[$field]) && in_array($data[$field], ['draft', 'published', 'archived'], true)
                    ? $data[$field]
                    : 'draft';
            } elseif ($field === 'pinned') {
                $insert[$field] = isset($data[$field]) && $data[$field] === true ? 'true' : 'false';
            } elseif ($field === 'published_at') {
                $insert[$field] = $data[$field] ?? null;
            } elseif ($field === 'category_id' || $field === 'author_id') {
                $insert[$field] = is_numeric($data[$field]) ? (int) $data[$field] : null;
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
     * Update an article by ID.
     *
     * @param int $id Article ID
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

        // Validate category_id if provided
        if (isset($data['category_id']) && !KnowledgebaseCategory::getById($data['category_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid category_id: ' . $data['category_id']);

            return false;
        }

        // Validate author_id if provided
        if (isset($data['author_id']) && !User::getUserById($data['author_id'])) {
            App::getInstance(true)->getLogger()->error('Invalid author_id: ' . $data['author_id']);

            return false;
        }

        $fields = ['category_id', 'title', 'slug', 'icon', 'content', 'author_id', 'status', 'pinned', 'published_at'];
        $set = [];
        $params = ['id' => $id];

        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                if ($field === 'status') {
                    if (in_array($data[$field], ['draft', 'published', 'archived'], true)) {
                        $params[$field] = $data[$field];
                        $set[] = "`$field` = :$field";
                    }
                } elseif ($field === 'pinned') {
                    $params[$field] = $data[$field] === true ? 'true' : 'false';
                    $set[] = "`$field` = :$field";
                } elseif ($field === 'category_id' || $field === 'author_id') {
                    if (is_numeric($data[$field])) {
                        $params[$field] = (int) $data[$field];
                        $set[] = "`$field` = :$field";
                    }
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
     * Delete an article by ID.
     *
     * @param int $id Article ID
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
