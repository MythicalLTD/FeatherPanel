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
