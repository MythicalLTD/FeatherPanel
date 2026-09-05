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
 * ApiClient service/model for CRUD operations on the featherpanel_apikeys_client table.
 */
class ApiClient
{
    /**
     * @var string The API client table name
     */
    private static string $table = 'featherpanel_apikeys_client';

    /**
     * Create a new API client.
     *
     * @param array $data Associative array of API client fields (must include required fields)
     *
     * @return int|false The new API client's ID or false on failure
     */
    public static function createApiClient(array $data): int | false
    {
        // Required fields for API client creation
        $required = ['user_uuid', 'name', 'public_key', 'private_key'];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Missing required fields: ' . implode(', ', $missing) . ' for API client: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field]) || !is_string($data[$field]) || trim($data[$field]) === '') {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for API client: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                return false;
            }
        }

        // UUID validation (basic)
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['user_uuid'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid user_uuid: ' . $data['user_uuid'] . ' for API client: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Store a SHA-256 lookup hash of the plaintext private key alongside
        // the encrypted value, so getApiClientByPrivateKey() can still do an
        // exact-match WHERE lookup even though the stored private_key itself
        // is now ciphertext (non-deterministic per-encryption nonce, so it
        // can never be matched directly). The hash is a one-way, non-secret
        // index - it does not let anyone recover or forge the private key.
        $data['private_key_hash'] = hash('sha256', $data['private_key']);
        $data['private_key'] = App::getInstance(true)->encryptValue($data['private_key']);

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($data)) {
            return (int) $pdo->lastInsertId();
        }

        $sanitizedData = self::sanitizeDataForLogging($data);
        App::getInstance(true)->getLogger()->error('Failed to create API client: ' . $sql . ' for API client: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData) . ' and error: ' . json_encode($stmt->errorInfo()));

        return false;
    }

    /**
     * Fetch an API client by ID.
     */
    public static function getApiClientById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        return $row !== null ? self::decryptPrivateKey($row) : null;
    }

    /**
     * Fetch an API client by public key.
     */
    public static function getApiClientByPublicKey(string $publicKey): ?array
    {
        if (empty($publicKey)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE public_key = :public_key LIMIT 1');
        $stmt->execute(['public_key' => $publicKey]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        return $row !== null ? self::decryptPrivateKey($row) : null;
    }

    /**
     * Fetch an API client by private key.
     *
     * Looks up via the deterministic SHA-256 lookup hash (private_key is
     * stored encrypted and therefore cannot be matched directly with an
     * exact WHERE clause), then decrypts private_key before returning.
     */
    public static function getApiClientByPrivateKey(string $privateKey): ?array
    {
        if (empty($privateKey)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE private_key_hash = :private_key_hash LIMIT 1');
        $stmt->execute(['private_key_hash' => hash('sha256', $privateKey)]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        return $row !== null ? self::decryptPrivateKey($row) : null;
    }

    /**
     * Get all API clients.
     */
    public static function getAllApiClients(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT * FROM ' . self::$table . ' ORDER BY id ASC');

        return array_map([self::class, 'decryptPrivateKey'], $stmt->fetchAll(\PDO::FETCH_ASSOC));
    }

    /**
     * Get API clients by user UUID.
     */
    public static function getApiClientsByUserUuid(string $userUuid): array
    {
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE user_uuid = :user_uuid ORDER BY id ASC');
        $stmt->execute(['user_uuid' => $userUuid]);

        return array_map([self::class, 'decryptPrivateKey'], $stmt->fetchAll(\PDO::FETCH_ASSOC));
    }

    /**
     * Search API clients with pagination, filtering, and field selection.
     *
     * @param int $page Page number (1-based)
     * @param int $limit Number of results per page
     * @param string $search Search term for name (optional)
     * @param array $fields Fields to select (e.g. ['name', 'public_key']) (default: all)
     * @param string $sortBy Field to sort by (default: 'id')
     * @param string $sortOrder 'ASC' or 'DESC' (default: 'ASC')
     * @param string|null $userUuid Filter by user UUID (optional)
     */
    public static function searchApiClients(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        array $fields = [],
        string $sortBy = 'id',
        string $sortOrder = 'ASC',
        ?string $userUuid = null,
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

        if (!empty($search)) {
            $where[] = 'name LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        if ($userUuid !== null) {
            if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
                return [];
            }
            $where[] = 'user_uuid = :user_uuid';
            $params['user_uuid'] = $userUuid;
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

        return array_map([self::class, 'decryptPrivateKey'], $stmt->fetchAll(\PDO::FETCH_ASSOC));
    }

    /**
     * Update an API client by ID.
     */
    public static function updateApiClient(int $id, array $data): bool
    {
        try {
            if ($id <= 0) {
                return false;
            }
            if (empty($data)) {
                App::getInstance(true)->getLogger()->error('No data to update');

                return false;
            }
            // Prevent updating primary key/id
            if (isset($data['id'])) {
                unset($data['id']);
            }
            // Same treatment as createApiClient(): keep the lookup hash in
            // sync whenever the plaintext private key is rotated, and never
            // write plaintext private_key to the database.
            if (isset($data['private_key'])) {
                $data['private_key_hash'] = hash('sha256', $data['private_key']);
                $data['private_key'] = App::getInstance(true)->encryptValue($data['private_key']);
            }
            $columns = self::getColumns();
            $columns = array_map(fn ($c) => $c['Field'], $columns);
            $missing = array_diff(array_keys($data), $columns);
            if (!empty($missing)) {
                App::getInstance(true)->getLogger()->error('Missing fields: ' . implode(', ', $missing));

                return false;
            }
            $pdo = Database::getPdoConnection();
            $fields = array_keys($data);
            if (empty($fields)) {
                App::getInstance(true)->getLogger()->error('No fields to update');

                return false;
            }
            $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
            $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            $data['id'] = $id;

            return $stmt->execute($data);
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to update API client: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Hard-delete an API client.
     */
    public static function deleteApiClient(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get the total number of API clients.
     */
    public static function getCount(
        string $search = '',
        ?string $userUuid = null,
    ): int {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $where = [];
        $params = [];

        if ($search !== '') {
            $where[] = 'name LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        if ($userUuid !== null) {
            if (!preg_match('/^[a-f0-9\-]{36}$/i', $userUuid)) {
                return 0;
            }
            $where[] = 'user_uuid = :user_uuid';
            $params['user_uuid'] = $userUuid;
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
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
     * Get table columns.
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function deleteAllApiClientsByUserId(string $userUuid): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE user_uuid = :user_uuid');

        return $stmt->execute(['user_uuid' => $userUuid]);
    }

    /**
     * Decrypt an API client row's private_key in place, tolerating rows
     * that predate this migration (plaintext private_key, no
     * private_key_hash yet) by leaving them unchanged - decryptValue()
     * already no-ops on values that don't look like ciphertext.
     */
    private static function decryptPrivateKey(array $row): array
    {
        if (isset($row['private_key']) && $row['private_key'] !== '') {
            $row['private_key'] = App::getInstance(true)->decryptValue($row['private_key']);
        }

        return $row;
    }

    /**
     * Sanitize data for logging by excluding sensitive fields.
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sensitiveFields = ['private_key', 'public_key'];
        $sanitized = $data;

        foreach ($sensitiveFields as $field) {
            if (isset($sanitized[$field])) {
                $sanitized[$field] = '[REDACTED]';
            }
        }

        return $sanitized;
    }
}
