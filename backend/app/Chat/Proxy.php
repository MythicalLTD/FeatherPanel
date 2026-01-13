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

class Proxy
{
    private static string $table = 'featherpanel_server_proxies';

    /**
     * Get all proxies for a server.
     */
    public static function getByServerId(int $serverId): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id ORDER BY created_at DESC');
        $stmt->execute(['server_id' => $serverId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get proxy by ID.
     */
    public static function getById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get proxy by server ID, domain, and port.
     */
    public static function getByServerDomainPort(int $serverId, string $domain, int $port): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE server_id = :server_id AND domain = :domain AND port = :port LIMIT 1');
        $stmt->execute([
            'server_id' => $serverId,
            'domain' => $domain,
            'port' => $port,
        ]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Create a new proxy.
     *
     * @param array<string,mixed> $data
     */
    public static function create(array $data): int | false
    {
        $fields = [
            'server_id',
            'domain',
            'ip',
            'port',
            'ssl',
            'use_lets_encrypt',
            'client_email',
            'ssl_cert',
            'ssl_key',
        ];

        $insert = [];
        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $insert[$field] = $data[$field];
            } else {
                // Set defaults
                if ($field === 'ssl' || $field === 'use_lets_encrypt') {
                    $insert[$field] = 0;
                } else {
                    $insert[$field] = null;
                }
            }
        }

        $pdo = Database::getPdoConnection();
        $fieldList = '`' . implode('`, `', $fields) . '`';
        $placeholders = ':' . implode(', :', $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . $fieldList . ') VALUES (' . $placeholders . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($insert)) {
            return (int) $pdo->lastInsertId();
        }

        return false;
    }

    /**
     * Delete a proxy by ID.
     */
    public static function delete(int $id): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Delete a proxy by server ID, domain, and port.
     */
    public static function deleteByServerDomainPort(int $serverId, string $domain, int $port): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE server_id = :server_id AND domain = :domain AND port = :port');

        return $stmt->execute([
            'server_id' => $serverId,
            'domain' => $domain,
            'port' => $port,
        ]);
    }

    /**
     * Count proxies for a server.
     */
    public static function countByServer(int $serverId): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE server_id = :server_id');
        $stmt->execute(['server_id' => $serverId]);

        return (int) $stmt->fetchColumn();
    }
}
