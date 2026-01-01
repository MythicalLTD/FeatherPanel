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
 * TicketPriority service/model for CRUD operations on the featherpanel_ticket_priorities table.
 */
class TicketPriority
{
    private static string $table = 'featherpanel_ticket_priorities';

    /**
     * Get all priorities with optional search and pagination.
     *
     * @param string|null $search Search term
     * @param int $limit Number of records per page
     * @param int $offset Offset for pagination
     *
     * @return array Array of priorities
     */
    public static function getAll(?string $search = null, int $limit = 10, int $offset = 0): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $params = [];

        if ($search !== null && trim($search) !== '') {
            $sql .= ' WHERE name LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        $sql .= ' ORDER BY name ASC LIMIT :limit OFFSET :offset';
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
     * Get priority by ID.
     *
     * @param int $id Priority ID
     *
     * @return array|null Priority data or null if not found
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
     * Get count of priorities.
     *
     * @param string|null $search Search term
     *
     * @return int Count of priorities
     */
    public static function getCount(?string $search = null): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $params = [];

        if ($search !== null && trim($search) !== '') {
            $sql .= ' WHERE name LIKE :search';
            $params['search'] = '%' . $search . '%';
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
     * Create a new priority.
     *
     * @param array $data Priority data
     *
     * @return int|false The new priority's ID or false on failure
     */
    public static function create(array $data): int | false
    {
        $required = ['name'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                App::getInstance(true)->getLogger()->error("Missing required field: $field");

                return false;
            }
        }

        $fields = ['name', 'color'];
        $insert = [];
        foreach ($fields as $field) {
            if ($field === 'color') {
                $insert[$field] = $data[$field] ?? '#000000';
            } else {
                $insert[$field] = $data[$field];
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
     * Update a priority by ID.
     *
     * @param int $id Priority ID
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

        $fields = ['name', 'color'];
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
     * Delete a priority by ID.
     *
     * @param int $id Priority ID
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
