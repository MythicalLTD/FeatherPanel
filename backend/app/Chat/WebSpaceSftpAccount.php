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
 * Extra SFTP accounts for a WebSpace (subdirectory jail). Username is account_name.uuidShort.
 */
class WebSpaceSftpAccount
{
    private static string $table = 'featherpanel_webspace_sftp_accounts';

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        $name = self::normalizeAccountName($data['account_name'] ?? '');
        if ($name === null || empty($data['webspace_id']) || empty($data['password'])) {
            return false;
        }

        $home = self::normalizeHome($data['home_relative'] ?? '');
        $now = date('Y-m-d H:i:s');
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . '
            (webspace_id, account_name, password, home_relative, enabled, created_at, updated_at)
            VALUES (:webspace_id, :account_name, :password, :home_relative, :enabled, :created_at, :updated_at)'
        );

        try {
            if (
                !$stmt->execute([
                    'webspace_id' => (int) $data['webspace_id'],
                    'account_name' => $name,
                    'password' => password_hash((string) $data['password'], PASSWORD_DEFAULT),
                    'home_relative' => $home,
                    'enabled' => !empty($data['enabled']) ? 1 : 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])
            ) {
                return false;
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('WebSpaceSftpAccount create failed: ' . $e->getMessage());

            return false;
        }

        return (int) $pdo->lastInsertId();
    }

    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? self::publicRow($row) : null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listByWebSpaceId(int $webspaceId): array
    {
        if ($webspaceId <= 0) {
            return [];
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT id, webspace_id, account_name, home_relative, enabled, created_at, updated_at
             FROM ' . self::$table . ' WHERE webspace_id = :webspace_id ORDER BY account_name ASC'
        );
        $stmt->execute(['webspace_id' => $webspaceId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map(static fn (array $row): array => self::publicRow($row), $rows);
    }

    public static function delete(int $id, int $webspaceId): bool
    {
        if ($id <= 0 || $webspaceId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id AND webspace_id = :webspace_id');

        return $stmt->execute(['id' => $id, 'webspace_id' => $webspaceId]);
    }

    public static function updatePassword(int $id, int $webspaceId, string $password): bool
    {
        if ($id <= 0 || $webspaceId <= 0 || $password === '') {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . '
             SET password = :password, updated_at = :updated_at
             WHERE id = :id AND webspace_id = :webspace_id'
        );

        return $stmt->execute([
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'updated_at' => date('Y-m-d H:i:s'),
            'id' => $id,
            'webspace_id' => $webspaceId,
        ]);
    }

    public static function updateHome(int $id, int $webspaceId, string $homeRelative): bool
    {
        if ($id <= 0 || $webspaceId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . '
             SET home_relative = :home_relative, updated_at = :updated_at
             WHERE id = :id AND webspace_id = :webspace_id'
        );

        return $stmt->execute([
            'home_relative' => self::normalizeHome($homeRelative),
            'updated_at' => date('Y-m-d H:i:s'),
            'id' => $id,
            'webspace_id' => $webspaceId,
        ]);
    }

    public static function setEnabled(int $id, int $webspaceId, bool $enabled): bool
    {
        if ($id <= 0 || $webspaceId <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . '
             SET enabled = :enabled, updated_at = :updated_at
             WHERE id = :id AND webspace_id = :webspace_id'
        );

        return $stmt->execute([
            'enabled' => $enabled ? 1 : 0,
            'updated_at' => date('Y-m-d H:i:s'),
            'id' => $id,
            'webspace_id' => $webspaceId,
        ]);
    }

    /**
     * Authenticate an extra SFTP account for a WebSpace.
     *
     * @return array{account: array<string, mixed>, root: string}|null
     */
    public static function authenticate(int $webspaceId, string $accountName, string $password): ?array
    {
        $name = self::normalizeAccountName($accountName);
        if ($name === null || $webspaceId <= 0 || $password === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . '
             WHERE webspace_id = :webspace_id AND account_name = :account_name LIMIT 1'
        );
        $stmt->execute(['webspace_id' => $webspaceId, 'account_name' => $name]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row || empty($row['enabled'])) {
            return null;
        }

        if (!password_verify($password, (string) ($row['password'] ?? ''))) {
            return null;
        }

        return [
            'account' => self::publicRow($row),
            'root' => self::normalizeHome($row['home_relative'] ?? ''),
        ];
    }

    public static function normalizeAccountName(mixed $raw): ?string
    {
        $name = strtolower(trim((string) $raw));
        if ($name === '' || strlen($name) > 32) {
            return null;
        }
        if (!preg_match('/^[a-z][a-z0-9_-]{1,31}$/', $name)) {
            return null;
        }

        return $name;
    }

    public static function normalizeHome(mixed $raw): string
    {
        $value = str_replace('\\', '/', trim((string) $raw));
        $value = trim($value, '/');
        if ($value === '' || $value === '.') {
            return '';
        }
        $parts = array_values(array_filter(explode('/', $value), static fn ($p) => $p !== '' && $p !== '.'));
        foreach ($parts as $part) {
            if ($part === '..' || str_contains($part, "\0")) {
                return '';
            }
        }

        return implode('/', $parts);
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private static function publicRow(array $row): array
    {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'webspace_id' => (int) ($row['webspace_id'] ?? 0),
            'account_name' => (string) ($row['account_name'] ?? ''),
            'home_relative' => (string) ($row['home_relative'] ?? ''),
            'enabled' => !empty($row['enabled']),
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }
}
