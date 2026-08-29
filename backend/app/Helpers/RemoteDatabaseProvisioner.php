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

namespace App\Helpers;

/**
 * Creates/deletes/resets databases on external MySQL/MariaDB/PostgreSQL hosts.
 */
class RemoteDatabaseProvisioner
{
    /**
     * @param array<string, mixed> $databaseHost
     */
    public static function create(
        array $databaseHost,
        string $databaseName,
        string $username,
        string $password,
        string $remote = '%',
        int $maxConnections = 0,
    ): void {
        $pdo = self::connect($databaseHost);
        $type = (string) ($databaseHost['database_type'] ?? '');
        $remote = self::normalizeRemote($remote);

        switch ($type) {
            case 'mysql':
            case 'mariadb':
                $safeDbName = self::quoteIdentifierMySQL($databaseName);
                $safeUser = self::quoteIdentifierMySQL($username);
                $safeRemote = self::quoteRemoteMySQL($remote);
                $maxClause = $maxConnections > 0 ? ' WITH MAX_USER_CONNECTIONS ' . $maxConnections : '';
                $pdo->exec("CREATE DATABASE IF NOT EXISTS {$safeDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $pdo->exec(
                    "CREATE USER IF NOT EXISTS {$safeUser}@{$safeRemote} IDENTIFIED BY " . $pdo->quote($password) . $maxClause
                );
                $pdo->exec("GRANT ALL PRIVILEGES ON {$safeDbName}.* TO {$safeUser}@{$safeRemote}");
                if ($maxConnections > 0) {
                    $pdo->exec(
                        'ALTER USER ' . $safeUser . '@' . $safeRemote . ' WITH MAX_USER_CONNECTIONS ' . $maxConnections
                    );
                }
                $pdo->exec('FLUSH PRIVILEGES');
                break;

            case 'postgresql':
                // PostgreSQL roles are not host-scoped; remote is ignored. Connection limits via CONNECTION LIMIT.
                $safeDbName = self::quoteIdentifier($databaseName);
                $safeUser = self::quoteIdentifier($username);
                $limitClause = $maxConnections > 0 ? ' CONNECTION LIMIT ' . $maxConnections : '';
                $pdo->exec("CREATE DATABASE {$safeDbName} WITH ENCODING 'UTF8'");
                $pdo->exec(
                    "CREATE USER {$safeUser} WITH PASSWORD " . $pdo->quote($password) . $limitClause
                );
                $pdo->exec("GRANT ALL PRIVILEGES ON DATABASE {$safeDbName} TO {$safeUser}");
                break;

            default:
                throw new \InvalidArgumentException('Unsupported database type: ' . $type);
        }
    }

    /**
     * @param array<string, mixed> $databaseHost
     */
    public static function delete(
        array $databaseHost,
        string $databaseName,
        string $username,
        string $remote = '%',
    ): void {
        $pdo = self::connect($databaseHost);
        $type = (string) ($databaseHost['database_type'] ?? '');
        $remote = self::normalizeRemote($remote);

        switch ($type) {
            case 'mysql':
            case 'mariadb':
                $safeDbName = self::quoteIdentifierMySQL($databaseName);
                $safeUser = self::quoteIdentifierMySQL($username);
                $safeRemote = self::quoteRemoteMySQL($remote);
                $pdo->exec("REVOKE ALL PRIVILEGES ON {$safeDbName}.* FROM {$safeUser}@{$safeRemote}");
                $pdo->exec("DROP USER IF EXISTS {$safeUser}@{$safeRemote}");
                $pdo->exec("DROP DATABASE IF EXISTS {$safeDbName}");
                $pdo->exec('FLUSH PRIVILEGES');
                break;

            case 'postgresql':
                $safeDbName = self::quoteIdentifier($databaseName);
                $safeUser = self::quoteIdentifier($username);
                $pdo->exec("REVOKE ALL PRIVILEGES ON DATABASE {$safeDbName} FROM {$safeUser}");
                $pdo->exec("DROP USER IF EXISTS {$safeUser}");
                $pdo->exec("DROP DATABASE IF EXISTS {$safeDbName}");
                break;

            default:
                throw new \InvalidArgumentException('Unsupported database type: ' . $type);
        }
    }

    /**
     * @param array<string, mixed> $databaseHost
     */
    public static function resetPassword(
        array $databaseHost,
        string $username,
        string $password,
        string $remote = '%',
        int $maxConnections = 0,
    ): void {
        $pdo = self::connect($databaseHost);
        $type = (string) ($databaseHost['database_type'] ?? '');
        $remote = self::normalizeRemote($remote);

        switch ($type) {
            case 'mysql':
            case 'mariadb':
                $safeUser = self::quoteIdentifierMySQL($username);
                $safeRemote = self::quoteRemoteMySQL($remote);
                $pdo->exec('ALTER USER ' . $safeUser . '@' . $safeRemote . ' IDENTIFIED BY ' . $pdo->quote($password));
                if ($maxConnections > 0) {
                    $pdo->exec(
                        'ALTER USER ' . $safeUser . '@' . $safeRemote . ' WITH MAX_USER_CONNECTIONS ' . $maxConnections
                    );
                }
                $pdo->exec('FLUSH PRIVILEGES');
                break;

            case 'postgresql':
                $safeUser = self::quoteIdentifier($username);
                $pdo->exec('ALTER USER ' . $safeUser . ' WITH PASSWORD ' . $pdo->quote($password));
                if ($maxConnections > 0) {
                    $pdo->exec('ALTER USER ' . $safeUser . ' WITH CONNECTION LIMIT ' . $maxConnections);
                }
                break;

            default:
                throw new \InvalidArgumentException('Unsupported database type: ' . $type);
        }
    }

    public static function generateRandomString(int $length): string
    {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $result = '';
        for ($i = 0; $i < $length; ++$i) {
            $result .= $chars[random_int(0, strlen($chars) - 1)];
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $databaseHost
     */
    private static function connect(array $databaseHost): \PDO
    {
        $options = [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_TIMEOUT => 10,
        ];

        $type = (string) ($databaseHost['database_type'] ?? '');
        $host = (string) ($databaseHost['database_host'] ?? '');
        $port = (int) ($databaseHost['database_port'] ?? 3306);

        $dsn = match ($type) {
            'mysql', 'mariadb' => "mysql:host={$host};port={$port}",
            'postgresql' => "pgsql:host={$host};port={$port}",
            default => throw new \InvalidArgumentException('Unsupported database type: ' . $type),
        };

        return new \PDO(
            $dsn,
            (string) ($databaseHost['database_username'] ?? ''),
            (string) ($databaseHost['database_password'] ?? ''),
            $options,
        );
    }

    private static function normalizeRemote(string $remote): string
    {
        $remote = trim($remote);
        if ($remote === '') {
            return '%';
        }

        // Disallow injection characters in host pattern.
        if (!preg_match('/^[a-zA-Z0-9.\-%:_]+$/', $remote)) {
            throw new \InvalidArgumentException('Invalid remote host pattern');
        }

        return $remote;
    }

    private static function quoteRemoteMySQL(string $remote): string
    {
        return "'" . str_replace(['\\', "'"], ['\\\\', "\\'"], $remote) . "'";
    }

    private static function quoteIdentifier(string $identifier): string
    {
        return '"' . str_replace('"', '""', $identifier) . '"';
    }

    private static function quoteIdentifierMySQL(string $identifier): string
    {
        return '`' . str_replace('`', '``', $identifier) . '`';
    }
}
