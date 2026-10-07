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
use App\Helpers\UUIDUtils;

/**
 * Remote destinations for node-level backups (SFTP / S3).
 */
class NodeBackupDestination
{
    public const TYPE_SFTP = 'sftp';
    public const TYPE_S3 = 's3';

    /** @var list<string> */
    public const TYPES = [self::TYPE_SFTP, self::TYPE_S3];

    private static string $table = 'featherpanel_node_backup_destinations';

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $required = ['name', 'type', 'credentials'];
        foreach ($required as $field) {
            if (!array_key_exists($field, $data)) {
                App::getInstance(true)->getLogger()->error('NodeBackupDestination: missing required field ' . $field);

                return false;
            }
            if ($field !== 'credentials' && is_string($data[$field]) && trim($data[$field]) === '') {
                App::getInstance(true)->getLogger()->error('NodeBackupDestination: missing required field ' . $field);

                return false;
            }
        }

        $type = (string) $data['type'];
        if (!in_array($type, self::TYPES, true)) {
            App::getInstance(true)->getLogger()->error('NodeBackupDestination: invalid type ' . $type);

            return false;
        }

        $encrypted = self::encryptCredentials($data['credentials']);
        if ($encrypted === null) {
            App::getInstance(true)->getLogger()->error('NodeBackupDestination: failed to encrypt credentials');

            return false;
        }

        $isMirror = self::normalizeBooleanFlag($data['is_mirror'] ?? 0);
        if ($isMirror === null) {
            App::getInstance(true)->getLogger()->error('NodeBackupDestination: invalid is_mirror');

            return false;
        }

        $mirrorOf = isset($data['mirror_of']) ? (int) $data['mirror_of'] : null;
        if ($mirrorOf !== null && $mirrorOf <= 0) {
            $mirrorOf = null;
        }
        if ($isMirror === 1) {
            if ($mirrorOf === null || !self::getById($mirrorOf)) {
                App::getInstance(true)->getLogger()->error('NodeBackupDestination: invalid mirror_of for mirror destination');

                return false;
            }
        } else {
            $mirrorOf = null;
        }

        $uuid = isset($data['uuid']) && is_string($data['uuid']) && UUIDUtils::isValid($data['uuid'])
            ? $data['uuid']
            : UUIDUtils::generateV4();

        $now = gmdate('Y-m-d H:i:s');
        $insert = [
            'uuid' => $uuid,
            'name' => trim((string) $data['name']),
            'type' => $type,
            'credentials_encrypted' => $encrypted,
            'base_path' => trim((string) ($data['base_path'] ?? '')),
            'is_mirror' => $isMirror,
            'mirror_of' => $mirrorOf,
            'last_tested_at' => $data['last_tested_at'] ?? null,
            'last_test_ok' => array_key_exists('last_test_ok', $data)
                ? self::normalizeBooleanFlag($data['last_test_ok'])
                : null,
            'last_test_error' => $data['last_test_error'] ?? null,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $pdo = Database::getPdoConnection();
        try {
            $fields = array_keys($insert);
            $placeholders = array_map(fn ($f) => ':' . $f, $fields);
            $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
            $stmt = $pdo->prepare($sql);
            if (!$stmt->execute($insert)) {
                return false;
            }

            return (int) $pdo->lastInsertId();
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('NodeBackupDestination create failed: ' . $e->getMessage());

            return false;
        }
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

    public static function getByUuid(string $uuid): ?array
    {
        if (!UUIDUtils::isValid($uuid)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Decrypt credentials JSON from a destination row.
     *
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    public static function getCredentialsDecrypted(array $row): array
    {
        $encrypted = (string) ($row['credentials_encrypted'] ?? '');
        if ($encrypted === '') {
            return [];
        }

        try {
            $plain = App::getInstance(true)->decryptValue($encrypted);
            if ($plain === '' || $plain === false || $plain === null) {
                return [];
            }
            $decoded = json_decode((string) $plain, true);

            return is_array($decoded) ? $decoded : [];
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('NodeBackupDestination decrypt failed: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * @return array{destinations: list<array<string, mixed>>, total: int}
     */
    public static function search(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        string $sortBy = 'id',
        string $sortOrder = 'DESC',
        ?string $type = null,
    ): array {
        $allowedSort = ['id', 'name', 'type', 'is_mirror', 'created_at', 'updated_at', 'last_tested_at'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'id';
        }
        $sortOrder = strtoupper($sortOrder) === 'ASC' ? 'ASC' : 'DESC';
        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $pdo = Database::getPdoConnection();
        $where = [];
        $params = [];
        if ($search !== '') {
            $where[] = 'name LIKE :search';
            $params['search'] = '%' . $search . '%';
        }
        if ($type !== null && $type !== '') {
            if (!in_array($type, self::TYPES, true)) {
                return ['destinations' => [], 'total' => 0];
            }
            $where[] = 'type = :type';
            $params['type'] = $type;
        }
        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . $whereSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $limit;
        $sql = 'SELECT * FROM ' . self::$table . $whereSql . " ORDER BY $sortBy $sortOrder LIMIT :limit OFFSET :offset";
        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return [
            'destinations' => $stmt->fetchAll(\PDO::FETCH_ASSOC),
            'total' => $total,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listAll(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT * FROM ' . self::$table . ' ORDER BY name ASC');

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function update(int $id, array $data): bool
    {
        if ($id <= 0) {
            return false;
        }
        $existing = self::getById($id);
        if (!$existing) {
            return false;
        }

        unset($data['id'], $data['uuid'], $data['created_at'], $data['credentials_encrypted']);

        if (isset($data['type']) && !in_array((string) $data['type'], self::TYPES, true)) {
            App::getInstance(true)->getLogger()->error('NodeBackupDestination: invalid type on update');

            return false;
        }

        if (array_key_exists('credentials', $data)) {
            $encrypted = self::encryptCredentials($data['credentials']);
            unset($data['credentials']);
            if ($encrypted === null) {
                App::getInstance(true)->getLogger()->error('NodeBackupDestination: failed to encrypt credentials on update');

                return false;
            }
            $data['credentials_encrypted'] = $encrypted;
        }

        if (array_key_exists('is_mirror', $data)) {
            $normalized = self::normalizeBooleanFlag($data['is_mirror']);
            if ($normalized === null) {
                return false;
            }
            $data['is_mirror'] = $normalized;
        }

        if (array_key_exists('last_test_ok', $data) && $data['last_test_ok'] !== null) {
            $normalized = self::normalizeBooleanFlag($data['last_test_ok']);
            if ($normalized === null) {
                return false;
            }
            $data['last_test_ok'] = $normalized;
        }

        $isMirror = (int) ($data['is_mirror'] ?? $existing['is_mirror'] ?? 0);
        if ($isMirror === 1) {
            $mirrorOf = array_key_exists('mirror_of', $data)
                ? (int) $data['mirror_of']
                : (int) ($existing['mirror_of'] ?? 0);
            if ($mirrorOf <= 0 || $mirrorOf === $id || !self::getById($mirrorOf)) {
                App::getInstance(true)->getLogger()->error('NodeBackupDestination: invalid mirror_of on update');

                return false;
            }
            $data['mirror_of'] = $mirrorOf;
        } elseif (array_key_exists('is_mirror', $data) || array_key_exists('mirror_of', $data)) {
            $data['mirror_of'] = null;
        }

        if (array_key_exists('name', $data)) {
            $data['name'] = trim((string) $data['name']);
        }
        if (array_key_exists('base_path', $data)) {
            $data['base_path'] = trim((string) $data['base_path']);
        }

        $data['updated_at'] = gmdate('Y-m-d H:i:s');
        if ($data === []) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        try {
            $fields = array_keys($data);
            $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
            $params = $data;
            $params['id'] = $id;
            $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id');

            return $stmt->execute($params);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('NodeBackupDestination update failed: ' . $e->getMessage());

            return false;
        }
    }

    public static function delete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        try {
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

            return $stmt->execute(['id' => $id]);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('NodeBackupDestination delete failed: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * @param array<string, mixed>|string $credentials
     */
    private static function encryptCredentials(mixed $credentials): ?string
    {
        try {
            if (is_array($credentials)) {
                $json = json_encode($credentials, JSON_THROW_ON_ERROR);
            } elseif (is_string($credentials)) {
                $trimmed = trim($credentials);
                if ($trimmed === '') {
                    return null;
                }
                // Validate JSON when a string is provided.
                json_decode($trimmed, true, 512, JSON_THROW_ON_ERROR);
                $json = $trimmed;
            } else {
                return null;
            }

            return App::getInstance(true)->encryptValue($json);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('NodeBackupDestination encryptCredentials: ' . $e->getMessage());

            return null;
        }
    }

    private static function normalizeBooleanFlag(mixed $value): ?int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_int($value)) {
            return $value === 1 ? 1 : ($value === 0 ? 0 : null);
        }
        if (is_string($value)) {
            $lower = strtolower(trim($value));
            if (in_array($lower, ['1', 'true', 'yes', 'on'], true)) {
                return 1;
            }
            if (in_array($lower, ['0', 'false', 'no', 'off'], true)) {
                return 0;
            }
        }

        return null;
    }
}
