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

class Image
{
    private static string $table = 'featherpanel_images';

    public static function getAll(?string $search = null, int $limit = 10, int $offset = 0): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        $params = [];

        if ($search !== null) {
            $sql .= ' WHERE name LIKE :search OR url LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        $sql .= ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';
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

    public static function getById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getByName(string $name): ?array
    {
        if (empty($name)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE name = :name LIMIT 1');
        $stmt->execute(['name' => $name]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getByUrl(string $url): ?array
    {
        if (empty($url)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE url = :url LIMIT 1');
        $stmt->execute(['url' => $url]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function create(array $data): int|false
    {
        $required = ['name', 'url'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                return false;
            }
        }

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

    public static function update(int $id, array $data): bool
    {
        if ($id <= 0 || empty($data)) {
            return false;
        }

        unset($data['id']);
        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);

        if (empty($fields)) {
            return false;
        }

        $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
        $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $data['id'] = $id;

        return $stmt->execute($data);
    }

    public static function delete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    public static function getCount(?string $search = null): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $params = [];

        if ($search !== null) {
            $sql .= ' WHERE name LIKE :search OR url LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        $stmt = $pdo->prepare($sql);
        if (!empty($params)) {
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
        }
        $stmt->execute();

        return (int) $stmt->fetchColumn();
    }

    public static function searchImages(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        array $fields = ['id', 'name', 'url', 'created_at', 'updated_at'],
        string $sortBy = 'created_at',
        string $sortOrder = 'DESC',
    ): array {
        $offset = ($page - 1) * $limit;
        $pdo = Database::getPdoConnection();

        $fieldList = implode(', ', $fields);
        $sql = "SELECT {$fieldList} FROM " . self::$table;
        $params = [];

        if (!empty($search)) {
            $sql .= ' WHERE name LIKE :search OR url LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        $sql .= " ORDER BY {$sortBy} {$sortOrder} LIMIT :limit OFFSET :offset";
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
}
