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

/**
 * MailList service/model for CRUD operations on the featherpanel_mail_list table.
 */
class MailList
{
    private static string $table = 'featherpanel_mail_list';

    public static function create(array $data): int | false
    {
        $required = ['queue_id', 'user_uuid'];
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

    public static function getAll(bool $includeDeleted = false): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        if (!$includeDeleted) {
            $sql .= " WHERE deleted = 'false'";
        }
        $stmt = $pdo->query($sql);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
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

    public static function softDelete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . " SET deleted = 'true' WHERE id = :id";
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    public static function hardDelete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    public static function restore(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . " SET deleted = 'false' WHERE id = :id";
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    public static function getByUserUuid(string $userUuid): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE user_uuid = :user_uuid ORDER BY created_at DESC LIMIT 250');
        $stmt->execute(['user_uuid' => $userUuid]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function getByUserUuidPaginated(string $userUuid, ?string $search = null, int $limit = 10, int $offset = 0): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT ml.id, ml.queue_id, mq.subject, mq.body, mq.status, mq.created_at 
                FROM ' . self::$table . ' ml
                INNER JOIN featherpanel_mail_queue mq ON ml.queue_id = mq.id
                WHERE ml.user_uuid = :user_uuid';
        $params = ['user_uuid' => $userUuid];

        if ($search !== null && trim($search) !== '') {
            $sql .= ' AND (mq.subject LIKE :search OR mq.body LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        $sql .= ' ORDER BY mq.created_at DESC LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function getCountByUserUuid(string $userUuid, ?string $search = null): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) 
                FROM ' . self::$table . ' ml
                INNER JOIN featherpanel_mail_queue mq ON ml.queue_id = mq.id
                WHERE ml.user_uuid = :user_uuid';
        $params = ['user_uuid' => $userUuid];

        if ($search !== null && trim($search) !== '') {
            $sql .= ' AND (mq.subject LIKE :search OR mq.body LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    public static function deleteAllMailListsByUserId(string $userUuid): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE user_uuid = :user_uuid');

        return $stmt->execute(['user_uuid' => $userUuid]);
    }
}
