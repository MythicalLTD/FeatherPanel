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
 * Bring-your-own backup storage destinations owned by a user.
 *
 * The provider config (endpoint, bucket, keys, OAuth refresh tokens) is stored
 * as encrypted JSON and never returned to the browser in clear.
 */
class UserStorageDestination
{
    /** OAuth consent in progress; invisible to the user and to backups until the callback completes. */
    public const STATUS_PENDING = 'pending';

    /** Pending rows older than this are dropped. */
    public const PENDING_TTL_SECONDS = 900;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_ERROR = 'error';
    public const STATUS_REVOKED = 'revoked';

    private static string $table = 'featherpanel_user_storage_destinations';

    /**
     * @param array<string, mixed> $config
     */
    public static function create(int $userId, string $name, string $provider, array $config, string $status = self::STATUS_ACTIVE): int | false
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('INSERT INTO ' . self::$table . ' (`uuid`, `user_id`, `name`, `provider`, `config`, `status`) VALUES (:uuid, :user_id, :name, :provider, :config, :status)');
        $ok = $stmt->execute([
            'uuid' => self::uuid(),
            'user_id' => $userId,
            'name' => $name,
            'provider' => $provider,
            'config' => self::encryptConfig($config),
            'status' => $status,
        ]);

        return $ok ? (int) $pdo->lastInsertId() : false;
    }

    /**
     * Includes soft-deleted rows so orphaned backups can still be described.
     */
    public static function getById(int $id, bool $withDeleted = false): ?array
    {
        $sql = 'SELECT * FROM ' . self::$table . ' WHERE id = :id' . ($withDeleted ? '' : ' AND deleted_at IS NULL') . ' LIMIT 1';
        $stmt = Database::getPdoConnection()->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public static function getForUser(int $id, int $userId, bool $withPending = false): ?array
    {
        $row = self::getById($id);
        if ($row === null || (int) $row['user_id'] !== $userId) {
            return null;
        }
        if (!$withPending && (string) $row['status'] === self::STATUS_PENDING) {
            return null;
        }

        return $row;
    }

    public static function getByUuidForUser(string $uuid, int $userId): ?array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid AND user_id = :u AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['uuid' => $uuid, 'u' => $userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /** Drop consent attempts the user never finished. They never held backups, so they are removed outright. */
    public static function purgeStalePending(): void
    {
        Database::getPdoConnection()->prepare('DELETE FROM ' . self::$table . ' WHERE status = :p AND created_at < (NOW() - INTERVAL ' . self::PENDING_TTL_SECONDS . ' SECOND)')->execute(['p' => self::STATUS_PENDING]);
    }

    /** A new consent attempt supersedes the user's unfinished ones, so an abandoned tab never blocks the limit. */
    public static function purgePendingForUser(int $userId): void
    {
        Database::getPdoConnection()->prepare('DELETE FROM ' . self::$table . ' WHERE user_id = :u AND status = :p')->execute(['u' => $userId, 'p' => self::STATUS_PENDING]);
    }

    public static function hardDeletePending(int $id): void
    {
        Database::getPdoConnection()->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id AND status = :p')->execute(['id' => $id, 'p' => self::STATUS_PENDING]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listForUser(int $userId): array
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT * FROM ' . self::$table . ' WHERE user_id = :u AND deleted_at IS NULL AND status <> \'pending\' ORDER BY id ASC');
        $stmt->execute(['u' => $userId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    public static function countForUser(int $userId): int
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE user_id = :u AND deleted_at IS NULL');
        $stmt->execute(['u' => $userId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @param array<string, mixed> $data name, config (array), status, last_error, last_tested_at
     */
    public static function update(int $id, array $data): bool
    {
        $allowed = ['name', 'config', 'status', 'last_error', 'last_tested_at'];
        $sets = [];
        $params = ['id' => $id];
        foreach ($allowed as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            $value = $data[$field];
            if ($field === 'config') {
                $value = self::encryptConfig((array) $value);
            }
            if ($field === 'last_error' && is_string($value)) {
                $value = mb_substr($value, 0, 500);
            }
            $sets[] = '`' . $field . '` = :' . $field;
            $params[$field] = $value;
        }
        if ($sets === []) {
            return true;
        }

        return Database::getPdoConnection()->prepare('UPDATE ' . self::$table . ' SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($params);
    }

    public static function softDelete(int $id): bool
    {
        return Database::getPdoConnection()->prepare('UPDATE ' . self::$table . ' SET deleted_at = NOW() WHERE id = :id')->execute(['id' => $id]);
    }

    public static function countBackups(int $id): int
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT COUNT(*) FROM featherpanel_server_backups WHERE destination_id = :id AND is_successful = 1 AND deleted_at IS NULL');
        $stmt->execute(['id' => $id]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @return array<string, mixed>
     */
    public static function config(array $row): array
    {
        $raw = (string) ($row['config'] ?? '');
        if ($raw === '') {
            return [];
        }
        try {
            $json = App::getInstance(true)->decryptValue($raw);
        } catch (\Throwable) {
            return [];
        }
        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, mixed> $config
     */
    private static function encryptConfig(array $config): string
    {
        return App::getInstance(true)->encryptValue((string) json_encode($config, JSON_UNESCAPED_SLASHES));
    }

    private static function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0F) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3F) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
