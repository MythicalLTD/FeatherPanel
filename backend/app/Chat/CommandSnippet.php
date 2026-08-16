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

/**
 * Command snippet model for Calagopus-compatible account snippets.
 */
class CommandSnippet
{
    private static string $table = 'featherpanel_command_snippets';

    /**
     * Create a command snippet.
     *
     * @param array{uuid:string,user_uuid:string,name:string,command:string,eggs:array<string>|string} $data
     */
    public static function create(array $data): int | false
    {
        if (
            !self::isUuid($data['uuid'] ?? '')
            || !self::isUuid($data['user_uuid'] ?? '')
            || !is_string($data['name'] ?? null)
            || trim($data['name']) === ''
            || strlen($data['name']) > 191
            || !is_string($data['command'] ?? null)
        ) {
            return false;
        }

        $eggs = self::normalizeEggs($data['eggs'] ?? []);
        if ($eggs === null) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table
            . ' (`uuid`, `user_uuid`, `name`, `command`, `eggs`)'
            . ' VALUES (:uuid, :user_uuid, :name, :command, :eggs)'
        );
        $success = $stmt->execute([
            'uuid' => $data['uuid'],
            'user_uuid' => $data['user_uuid'],
            'name' => trim($data['name']),
            'command' => $data['command'],
            'eggs' => json_encode($eggs, JSON_UNESCAPED_SLASHES),
        ]);

        return $success ? (int) $pdo->lastInsertId() : false;
    }

    public static function getByUuid(string $uuid): ?array
    {
        if (!self::isUuid($uuid)) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return is_array($row) ? self::decodeRow($row) : null;
    }

    /**
     * @return array{total:int,data:list<array<string,mixed>>}
     */
    public static function listByUserUuid(
        string $userUuid,
        int $page = 1,
        int $perPage = 100,
        ?string $search = null,
    ): array {
        if (!self::isUuid($userUuid)) {
            return ['total' => 0, 'data' => []];
        }

        $page = max(1, $page);
        $perPage = min(100, max(1, $perPage));
        $search = trim((string) $search);
        $where = 'user_uuid = :user_uuid';
        $params = ['user_uuid' => $userUuid];
        if ($search !== '') {
            $where .= ' AND (name LIKE :search OR command LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        $pdo = Database::getPdoConnection();
        $count = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE ' . $where);
        $count->execute($params);

        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE ' . $where
            . ' ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset'
        );
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value, \PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', ($page - 1) * $perPage, \PDO::PARAM_INT);
        $stmt->execute();

        return [
            'total' => (int) $count->fetchColumn(),
            'data' => array_map(
                static fn (array $row): array => self::decodeRow($row),
                $stmt->fetchAll(\PDO::FETCH_ASSOC)
            ),
        ];
    }

    public static function updateByUuid(string $uuid, array $data): bool
    {
        if (!self::isUuid($uuid)) {
            return false;
        }

        $update = [];
        if (array_key_exists('name', $data)) {
            if (!is_string($data['name']) || trim($data['name']) === '' || strlen($data['name']) > 191) {
                return false;
            }
            $update['name'] = trim($data['name']);
        }
        if (array_key_exists('command', $data)) {
            if (!is_string($data['command'])) {
                return false;
            }
            $update['command'] = $data['command'];
        }
        if (array_key_exists('eggs', $data)) {
            $eggs = self::normalizeEggs($data['eggs']);
            if ($eggs === null) {
                return false;
            }
            $update['eggs'] = json_encode($eggs, JSON_UNESCAPED_SLASHES);
        }
        if ($update === []) {
            return false;
        }

        $set = implode(', ', array_map(static fn (string $field): string => "`{$field}` = :{$field}", array_keys($update)));
        $update['uuid'] = $uuid;
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET ' . $set . ' WHERE uuid = :uuid');

        return $stmt->execute($update);
    }

    public static function deleteByUuid(string $uuid): bool
    {
        if (!self::isUuid($uuid)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE uuid = :uuid');

        return $stmt->execute(['uuid' => $uuid]);
    }

    private static function decodeRow(array $row): array
    {
        $decoded = json_decode((string) ($row['eggs'] ?? '[]'), true);
        $row['eggs'] = is_array($decoded) ? array_values($decoded) : [];

        return $row;
    }

    /**
     * @return list<string>|null
     */
    private static function normalizeEggs(mixed $eggs): ?array
    {
        if (is_string($eggs)) {
            $eggs = json_decode($eggs, true);
        }
        if (!is_array($eggs)) {
            return null;
        }

        $normalized = [];
        foreach ($eggs as $egg) {
            if (!is_string($egg) || !self::isUuid($egg)) {
                return null;
            }
            $normalized[] = strtolower($egg);
        }

        return array_values(array_unique($normalized));
    }

    private static function isUuid(mixed $value): bool
    {
        return is_string($value) && preg_match('/^[a-f0-9-]{36}$/i', $value) === 1;
    }
}
