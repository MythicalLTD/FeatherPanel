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
 * UserSshKey service/model for CRUD operations on the featherpanel_user_ssh_keys table.
 */
class UserSshKey
{
    /**
     * @var string The user_ssh_keys table name
     */
    private static string $table = 'featherpanel_user_ssh_keys';

    /**
     * Create a new user SSH key.
     *
     * @param array $data Associative array of SSH key fields (must include required fields)
     *
     * @return int|false The new SSH key's ID or false on failure
     */
    public static function createUserSshKey(array $data): int | false
    {
        // Required fields for SSH key creation
        $required = [
            'user_id',
            'name',
            'public_key',
        ];

        $columns = self::getColumns();
        $columns = array_map(fn ($c) => $c['Field'], $columns);
        $missing = array_diff($required, $columns);
        if (!empty($missing)) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Missing required fields: ' . implode(', ', $missing) . ' for SSH key: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $sanitizedData = self::sanitizeDataForLogging($data);
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for SSH key: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                return false;
            }

            // Special validation for different field types
            if ($field === 'user_id') {
                if (!is_numeric($data[$field]) || (int) $data[$field] <= 0) {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Invalid ' . $field . ': ' . $data[$field] . ' for SSH key: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            } else {
                // String fields validation
                if (!is_string($data[$field]) || trim($data[$field]) === '') {
                    $sanitizedData = self::sanitizeDataForLogging($data);
                    App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for SSH key: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

                    return false;
                }
            }
        }

        // Validate that the user exists
        $user = User::getUserById((int) $data['user_id']);
        if (!$user) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('User not found for SSH key creation: ' . $data['user_id'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Validate SSH public key format (basic validation)
        if (!self::isValidSshPublicKey($data['public_key'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('Invalid SSH public key format for SSH key: ' . $data['name'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Auto-generate fingerprint if not provided or invalid
        if (!isset($data['fingerprint']) || !self::isValidFingerprint($data['fingerprint'])) {
            $data['fingerprint'] = self::generateFingerprint($data['public_key']);
        }

        // Check if fingerprint already exists for this user
        if (self::getUserSshKeyByFingerprint($data['fingerprint'], (int) $data['user_id'])) {
            $sanitizedData = self::sanitizeDataForLogging($data);
            App::getInstance(true)->getLogger()->error('SSH key with fingerprint already exists for user: ' . $data['user_id'] . ' with data: ' . json_encode($sanitizedData));

            return false;
        }

        // Build explicit fields and insert arrays (same pattern as Location.php)
        $fields = ['user_id', 'name', 'public_key', 'fingerprint'];
        $insert = [];
        foreach ($fields as $field) {
            $insert[$field] = $data[$field] ?? null;
        }

        // Handle optional ID for migrations (EXACT same pattern as Location.php)
        $hasId = false;
        if (isset($data['id'])) {
            // Accept both int and numeric string IDs
            if (is_int($data['id']) || (is_string($data['id']) && ctype_digit((string) $data['id']))) {
                $idValue = (int) $data['id'];
                if ($idValue > 0) {
                    $insert['id'] = $idValue;
                    $fields[] = 'id';
                    $hasId = true;
                }
            }
        }

        $pdo = Database::getPdoConnection();
        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($insert)) {
            return $hasId ? $insert['id'] : (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Fetch an SSH key by ID.
     */
    public static function getUserSshKeyById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Fetch an SSH key by fingerprint.
     */
    public static function getUserSshKeyByFingerprint(string $fingerprint, ?int $userId = null): ?array
    {
        if (empty($fingerprint)) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table . ' WHERE fingerprint = :fingerprint AND deleted_at IS NULL';
        $params = ['fingerprint' => $fingerprint];

        if ($userId !== null) {
            $sql .= ' AND user_id = :user_id';
            $params['user_id'] = $userId;
        }

        $sql .= ' LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get all SSH keys for a specific user.
     */
    public static function getUserSshKeysByUserId(int $userId, bool $includeDeleted = false): array
    {
        if ($userId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table . ' WHERE user_id = :user_id';

        if (!$includeDeleted) {
            $sql .= ' AND deleted_at IS NULL';
        }

        $sql .= ' ORDER BY created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get all SSH keys (optionally including deleted).
     */
    public static function getAllUserSshKeys(bool $includeDeleted = false): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT * FROM ' . self::$table;
        if (!$includeDeleted) {
            $sql .= ' WHERE deleted_at IS NULL';
        }
        $sql .= ' ORDER BY created_at DESC';
        $stmt = $pdo->query($sql);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Search SSH keys with pagination, filtering, and field selection.
     *
     * @param int $page Page number (1-based)
     * @param int $limit Number of results per page
     * @param string $search Search term for name/fingerprint (optional)
     * @param int $userId Filter by specific user ID (optional)
     * @param bool $includeDeleted Include deleted SSH keys (default: false)
     * @param array $fields Fields to select (e.g. ['name', 'fingerprint']) (default: all)
     * @param string $sortBy Field to sort by (default: 'created_at')
     * @param string $sortOrder 'ASC' or 'DESC' (default: 'DESC')
     */
    public static function searchUserSshKeys(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        ?int $userId = null,
        bool $includeDeleted = false,
        array $fields = [],
        string $sortBy = 'created_at',
        string $sortOrder = 'DESC',
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
            $where[] = 'deleted_at IS NULL';
        }

        if ($userId !== null) {
            $where[] = 'user_id = :user_id';
            $params['user_id'] = $userId;
        }

        if (!empty($search)) {
            $where[] = '(name LIKE :search OR fingerprint LIKE :search)';
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
     * Update an SSH key by ID.
     */
    public static function updateUserSshKey(int $id, array $data): bool
    {
        try {
            if (empty($data)) {
                App::getInstance(true)->getLogger()->error('No data to update for SSH key ID: ' . $id);

                return false;
            }

            // Prevent updating primary key/id
            if (isset($data['id'])) {
                unset($data['id']);
            }

            // Validate the SSH key exists
            $existingKey = self::getUserSshKeyById($id);
            if (!$existingKey) {
                App::getInstance(true)->getLogger()->error('SSH key not found for update: ' . $id);

                return false;
            }

            // Validate SSH public key format if being updated
            if (isset($data['public_key']) && !self::isValidSshPublicKey($data['public_key'])) {
                App::getInstance(true)->getLogger()->error('Invalid SSH public key format for update: ' . $id);

                return false;
            }

            // Auto-generate fingerprint if being updated and invalid
            if (isset($data['fingerprint']) && !self::isValidFingerprint($data['fingerprint'])) {
                // Use existing public key if not being updated, otherwise use the new one
                $publicKeyToUse = $data['public_key'] ?? $existingKey['public_key'];
                $data['fingerprint'] = self::generateFingerprint($publicKeyToUse);
            }

            // Check if fingerprint already exists for another key (if fingerprint is being updated)
            if (isset($data['fingerprint'])) {
                $existingKeyWithFingerprint = self::getUserSshKeyByFingerprint($data['fingerprint'], $existingKey['user_id']);
                if ($existingKeyWithFingerprint && $existingKeyWithFingerprint['id'] !== $id) {
                    App::getInstance(true)->getLogger()->error('SSH key with fingerprint already exists for user: ' . $existingKey['user_id']);

                    return false;
                }
            }

            $pdo = Database::getPdoConnection();
            $fields = array_keys($data);
            $setClause = implode(', ', array_map(fn ($f) => $f . ' = :' . $f, $fields));
            $sql = 'UPDATE ' . self::$table . ' SET ' . $setClause . ' WHERE id = :id';
            $data['id'] = $id;
            $stmt = $pdo->prepare($sql);

            return $stmt->execute($data);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Error updating SSH key: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Soft delete an SSH key by ID.
     */
    public static function deleteUserSshKey(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        // Validate the SSH key exists
        $existingKey = self::getUserSshKeyById($id);
        if (!$existingKey) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . ' SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Hard delete an SSH key by ID.
     */
    public static function hardDeleteUserSshKey(int $id): bool
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
     * Restore a soft-deleted SSH key.
     */
    public static function restoreUserSshKey(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . ' SET deleted_at = NULL WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Get SSH keys by name for a specific user.
     */
    public static function getUserSshKeysByName(string $name, int $userId): array
    {
        if (empty($name) || $userId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE name = :name AND user_id = :user_id AND deleted_at IS NULL');
        $stmt->execute(['name' => $name, 'user_id' => $userId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get SSH keys by public key content.
     */
    public static function getUserSshKeysByPublicKey(string $publicKey): array
    {
        if (empty($publicKey)) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE public_key = :public_key AND deleted_at IS NULL');
        $stmt->execute(['public_key' => $publicKey]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get the table columns.
     */
    public static function getColumns(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . self::$table);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get the total number of SSH keys.
     */
    public static function getCount(string $search = '', ?int $userId = null): int
    {
        $pdo = Database::getPdoConnection();
        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        $where = [];
        $params = [];

        if ($userId !== null) {
            $where[] = 'user_id = :user_id';
            $params['user_id'] = $userId;
        }

        if (!empty($search)) {
            $where[] = '(name LIKE :search OR fingerprint LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Validate SSH public key format.
     * Accepts both PEM-style public keys and OpenSSH one-line authorized_keys formats.
     */
    public static function isValidSshPublicKey(string $publicKey): bool
    {
        $trimmedKey = trim($publicKey);

        // 1) Accept PEM public keys: -----BEGIN PUBLIC KEY----- ... -----END PUBLIC KEY-----
        $pemHeaders = [
            ['start' => '-----BEGIN PUBLIC KEY-----', 'end' => '-----END PUBLIC KEY-----'],
            ['start' => '-----BEGIN RSA PUBLIC KEY-----', 'end' => '-----END RSA PUBLIC KEY-----'],
        ];
        foreach ($pemHeaders as $headers) {
            if (str_starts_with($trimmedKey, $headers['start']) && str_ends_with($trimmedKey, $headers['end'])) {
                $content = str_replace([$headers['start'], $headers['end']], '', $trimmedKey);
                $content = trim($content);
                $content = preg_replace('/\s+/', '', $content);

                // base64 validity and minimal length
                return base64_decode($content, true) !== false && strlen($content) >= 100;
            }
        }

        // 2) Accept OpenSSH authorized_keys one-line formats (e.g., ssh-ed25519 AAAA... [comment])
        $opensshPattern = '/^(?:ssh-(?:rsa|ed25519)|ecdsa-sha2-nistp(?:256|384|521)|sk-ecdsa-sha2-nistp256@openssh\.com|sk-ssh-ed25519@openssh\.com)\s+([A-Za-z0-9+\/]+={0,3})(?:\s+[^\n\r]*)?$/';
        if (preg_match($opensshPattern, $trimmedKey, $matches) === 1) {
            $base64Blob = $matches[1];

            return base64_decode($base64Blob, true) !== false && strlen($base64Blob) >= 50;
        }

        return false;
    }

    /**
     * Generate SHA256 fingerprint from public key content.
     */
    public static function generateFingerprint(string $publicKey): string
    {
        $trimmedKey = trim($publicKey);

        // Determine material to hash depending on format
        $material = '';

        // PEM formats
        if (str_starts_with($trimmedKey, '-----BEGIN PUBLIC KEY-----') && str_ends_with($trimmedKey, '-----END PUBLIC KEY-----')) {
            $material = str_replace(['-----BEGIN PUBLIC KEY-----', '-----END PUBLIC KEY-----'], '', $trimmedKey);
            $material = preg_replace('/\s+/', '', $material);
        } elseif (str_starts_with($trimmedKey, '-----BEGIN RSA PUBLIC KEY-----') && str_ends_with($trimmedKey, '-----END RSA PUBLIC KEY-----')) {
            $material = str_replace(['-----BEGIN RSA PUBLIC KEY-----', '-----END RSA PUBLIC KEY-----'], '', $trimmedKey);
            $material = preg_replace('/\s+/', '', $material);
        } else {
            // OpenSSH one-line formats: take the base64 blob (2nd field)
            $parts = preg_split('/\s+/', $trimmedKey);
            if (count($parts) >= 2) {
                $material = $parts[1];
            }
        }

        // Fallback: if we couldn't parse anything, hash the raw trimmed key
        if ($material === '') {
            $material = $trimmedKey;
        }

        $hash = hash('sha256', $material, false);

        $formattedHash = '';
        for ($i = 0; $i < strlen($hash); $i += 2) {
            if ($i > 0) {
                $formattedHash .= ':';
            }
            $formattedHash .= substr($hash, $i, 2);
        }

        return $formattedHash;
    }

    /**
     * Validate fingerprint format (SHA256 hash).
     */
    private static function isValidFingerprint(string $fingerprint): bool
    {
        // Remove colons and check if it's a valid SHA256 hash
        $cleanFingerprint = str_replace(':', '', $fingerprint);

        // SHA256 hash is 64 characters long and contains only hexadecimal characters
        return strlen($cleanFingerprint) === 64 && ctype_xdigit($cleanFingerprint);
    }

    /**
     * Sanitize data for logging (remove sensitive information).
     */
    private static function sanitizeDataForLogging(array $data): array
    {
        $sanitized = $data;

        // Remove sensitive fields from logging
        $sensitiveFields = ['public_key', 'fingerprint'];
        foreach ($sensitiveFields as $field) {
            if (isset($sanitized[$field])) {
                $sanitized[$field] = '[REDACTED]';
            }
        }

        return $sanitized;
    }
}
