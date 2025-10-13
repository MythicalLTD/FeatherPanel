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
use App\Config\ConfigInterface;

/**
 * User service/model for CRUD operations on the featherpanel_users table.
 */
class User
{
    /**
     * @var string The users table name
     */
    private static string $table = 'featherpanel_users';

    /**
     * Create a new user.
     *
     * @param array $data Associative array of user fields (must include required fields)
     *
     * @return int|false The new user's ID or false on failure
     */
    public static function createUser(array $data): int|false
    {
        // Required fields for user creation
        $required = [
            'username',
            'first_name',
            'last_name',
            'email',
            'password',
            'uuid',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field]) || !is_string($data[$field]) || trim($data[$field]) === '') {
                return false;
            }
        }
        // Email validation
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        // UUID validation (basic)
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
            return false;
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

    /**
     * Fetch a user by ID.
     */
    public static function getUserById(int $id): ?array
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
     * Fetch a user by email.
     */
    public static function getUserByEmail(string $email): ?array
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get all users (optionally including deleted).
     */
    public static function getAllUsers(bool $includeDeleted = false): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        if (!$includeDeleted) {
            $sql .= " WHERE deleted = 'false'";
        }
        $stmt = $pdo->query($sql);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Search users with pagination, filtering, and field selection.
     *
     * @param int $page Page number (1-based)
     * @param int $limit Number of results per page
     * @param string $search Search term for username/email (optional)
     * @param bool $includeDeleted Include deleted users (default: false)
     * @param array $fields Fields to select (e.g. ['username', 'email']) (default: all)
     * @param string $sortBy Field to sort by (default: 'id')
     * @param string $sortOrder 'ASC' or 'DESC' (default: 'ASC')
     */
    public static function searchUsers(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        bool $includeDeleted = false,
        array $fields = [],
        string $sortBy = 'id',
        string $sortOrder = 'ASC',
    ): array {
        $pdo = Database::getPdoConnection();

        if (empty($fields)) {
            $selectFields = '*';
        } else {
            $selectFields = implode(', ', $fields);
        }

        $sql = "SELECT $selectFields FROM " . self::$table;
        $where = [];
        $params = [];

        if (!$includeDeleted) {
            $where[] = "deleted = 'false'";
        }

        if (!empty($search)) {
            $where[] = '(username LIKE :search OR email LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= " ORDER BY $sortBy $sortOrder";
        $offset = max(0, ($page - 1) * $limit);
        $sql .= ' LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);

        // Bind parameters
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value, \PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', (int) $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int) $offset, \PDO::PARAM_INT);

        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Update a user by ID.
     */
    public static function updateUser(string $uuid, array $data): bool
    {
        try {
            if (empty($data)) {
                App::getInstance(true)->getLogger()->error('No data to update');

                return false;
            }
            // Prevent updating primary key/id
            if (isset($data['uuid'])) {
                unset($data['uuid']);
            }
            if (isset($data['id'])) {
                unset($data['id']);
            }

            $columns = self::getColumns();
            $columns = array_map(fn ($c) => $c['Field'], $columns);
            $missing = array_diff(array_keys($data), $columns);
            if (!empty($missing)) {
                App::getInstance(true)->getLogger()->error('Invalid fields: ' . implode(', ', $missing));

                return false;
            }
            $pdo = Database::getPdoConnection();
            $fields = array_keys($data);
            if (empty($fields)) {
                App::getInstance(true)->getLogger()->error('No fields to update');

                return false;
            }
            $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
            $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE uuid = :uuid';
            $stmt = $pdo->prepare($sql);
            $data['uuid'] = $uuid;

            return $stmt->execute($data);
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to update user: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Soft-delete a user (mark as deleted).
     */
    public static function softDeleteUser(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . " SET deleted = 'true' WHERE id = :id";
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Hard-delete a user (permanently remove).
     */
    public static function hardDeleteUser(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'DELETE FROM ' . self::$table . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Restore a soft-deleted user.
     */
    public static function restoreUser(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . " SET deleted = 'false' WHERE id = :id";
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get a user by its username.
     */
    public static function getUserByUsername(string $username): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE username = :username LIMIT 1');
        $stmt->execute(['username' => $username]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get a user by its uuid.
     */
    public static function getUserByUuid(string $uuid): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get a user by its mail verify.
     */
    public static function getUserByMailVerify(string $mailVerify): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE mail_verify = :mail_verify LIMIT 1');
        $stmt->execute(['mail_verify' => $mailVerify]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getUserByExternalId(string $externalId): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE external_id = :external_id LIMIT 1');
        $stmt->execute(['external_id' => $externalId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get a user by its remember token.
     */
    public static function getUserByRememberToken(string $rememberToken): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE remember_token = :remember_token LIMIT 1');
        $stmt->execute(['remember_token' => $rememberToken]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get the total number of users.
     */
    public static function getCount(string $search = ''): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        if ($search !== '') {
            $sql .= ' WHERE username LIKE :search';
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['search' => '%' . $search . '%']);
        } else {
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
        }

        return (int) $stmt->fetchColumn();
    }

    /**
     * Generate a random account token.
     */
    public static function generateAccountToken(): string
    {
        $appName = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_NAME, 'featherpanel');
        $tokenID = strtolower($appName) . '_authtoken_' . bin2hex(random_bytes(16));

        return $tokenID;
    }
}
