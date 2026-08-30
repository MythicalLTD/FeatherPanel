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
        $max = strlen($chars) - 1;
        for ($i = 0; $i < $length; ++$i) {
            $result .= $chars[random_int(0, $max)];
        }

        return $result;
    }

    /**
     * Logical SQL dump of a customer database (MySQL/MariaDB/PostgreSQL).
     *
     * @param array<string, mixed> $databaseHost
     */
    public static function dumpDatabase(array $databaseHost, string $databaseName): string
    {
        $type = (string) ($databaseHost['database_type'] ?? '');
        $pdo = self::connectToDatabase($databaseHost, $databaseName);

        return match ($type) {
            'mysql', 'mariadb' => self::dumpMysql($pdo, $databaseName),
            'postgresql' => self::dumpPostgres($pdo, $databaseName),
            default => throw new \InvalidArgumentException('Unsupported database type: ' . $type),
        };
    }

    /**
     * @param array<string, mixed> $databaseHost
     */
    public static function importDatabase(array $databaseHost, string $databaseName, string $sql): void
    {
        $pdo = self::connectToDatabase($databaseHost, $databaseName);
        $sql = trim($sql);
        if ($sql === '') {
            return;
        }

        $chunks = preg_split('/;\s*\n/', $sql) ?: [];
        foreach ($chunks as $chunk) {
            $stmt = trim($chunk);
            if ($stmt === '' || str_starts_with($stmt, '--')) {
                continue;
            }
            $pdo->exec($stmt);
        }
    }

    /**
     * @param array<string, mixed> $databaseHost
     */
    private static function connectToDatabase(array $databaseHost, string $databaseName): \PDO
    {
        $options = [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_TIMEOUT => 30,
        ];

        $type = (string) ($databaseHost['database_type'] ?? '');
        $host = (string) ($databaseHost['database_host'] ?? '');
        $port = (int) ($databaseHost['database_port'] ?? 3306);
        $db = str_replace(['\\', ';'], '', $databaseName);

        $dsn = match ($type) {
            'mysql', 'mariadb' => "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
            'postgresql' => "pgsql:host={$host};port={$port};dbname={$db}",
            default => throw new \InvalidArgumentException('Unsupported database type: ' . $type),
        };

        return new \PDO(
            $dsn,
            (string) ($databaseHost['database_username'] ?? ''),
            (string) ($databaseHost['database_password'] ?? ''),
            $options,
        );
    }

    private static function dumpMysql(\PDO $pdo, string $databaseName): string
    {
        $out = "-- FeatherQuilld dump for `{$databaseName}`\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n";
        $tables = $pdo->query('SHOW TABLES')->fetchAll(\PDO::FETCH_COLUMN) ?: [];
        foreach ($tables as $table) {
            $table = (string) $table;
            $ident = self::quoteIdentifierMySQL($table);
            $create = $pdo->query("SHOW CREATE TABLE {$ident}")->fetch(\PDO::FETCH_ASSOC) ?: [];
            $ddl = (string) ($create['Create Table'] ?? $create['Create View'] ?? '');
            if ($ddl === '') {
                continue;
            }
            $out .= "DROP TABLE IF EXISTS {$ident};\n{$ddl};\n";
            $rows = $pdo->query("SELECT * FROM {$ident}");
            while ($row = $rows->fetch(\PDO::FETCH_ASSOC)) {
                $cols = implode(', ', array_map(static fn ($c) => self::quoteIdentifierMySQL((string) $c), array_keys($row)));
                $vals = implode(', ', array_map(static function ($v) use ($pdo) {
                    return $v === null ? 'NULL' : $pdo->quote((string) $v);
                }, array_values($row)));
                $out .= "INSERT INTO {$ident} ({$cols}) VALUES ({$vals});\n";
            }
            $out .= "\n";
        }

        return $out . "SET FOREIGN_KEY_CHECKS=1;\n";
    }

    private static function dumpPostgres(\PDO $pdo, string $databaseName): string
    {
        $out = "-- FeatherQuilld dump for \"{$databaseName}\"\n";
        $tables = $pdo->query(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        )->fetchAll(\PDO::FETCH_COLUMN) ?: [];
        foreach ($tables as $table) {
            $table = (string) $table;
            $ident = self::quoteIdentifier($table);
            $out .= "DROP TABLE IF EXISTS {$ident} CASCADE;\n";
            $cols = $pdo->query(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = " . $pdo->quote($table) . ' ORDER BY ordinal_position'
            )->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            $colSql = [];
            foreach ($cols as $col) {
                $colSql[] = self::quoteIdentifier((string) $col['column_name']) . ' ' . (string) $col['data_type'];
            }
            if ($colSql === []) {
                continue;
            }
            $out .= 'CREATE TABLE ' . $ident . ' (' . implode(', ', $colSql) . ");\n";
            $rows = $pdo->query("SELECT * FROM {$ident}");
            while ($row = $rows->fetch(\PDO::FETCH_ASSOC)) {
                $c = implode(', ', array_map(static fn ($n) => self::quoteIdentifier((string) $n), array_keys($row)));
                $vals = implode(', ', array_map(static function ($v) use ($pdo) {
                    return $v === null ? 'NULL' : $pdo->quote((string) $v);
                }, array_values($row)));
                $out .= "INSERT INTO {$ident} ({$c}) VALUES ({$vals});\n";
            }
            $out .= "\n";
        }

        return $out;
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
