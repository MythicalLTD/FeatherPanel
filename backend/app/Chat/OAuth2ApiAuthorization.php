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

class OAuth2ApiAuthorization
{
    private static string $table = 'featherpanel_oauth2_api_authorizations';

    public static function createAuthorization(array $data): int | false
    {
        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $placeholders = array_map(fn ($field) => ':' . $field, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($data)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    public static function getByRequestToken(string $requestToken): ?array
    {
        if ($requestToken === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE request_token = :request_token LIMIT 1');
        $stmt->execute(['request_token' => $requestToken]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getByAuthCode(string $authCode): ?array
    {
        if ($authCode === '') {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE auth_code = :auth_code LIMIT 1');
        $stmt->execute(['auth_code' => $authCode]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function updateAuthorization(int $id, array $data): bool
    {
        if ($id <= 0 || empty($data)) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $set = implode(', ', array_map(fn ($field) => $field . ' = :' . $field, $fields));
        $sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $data['id'] = $id;

        return $stmt->execute($data);
    }

    public static function markExpiredPending(): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table . " SET status = 'expired' WHERE status = 'pending' AND expires_at < NOW()"
        );

        return $stmt->execute();
    }
}
