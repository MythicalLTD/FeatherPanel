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
        $type = (string) ($databaseHost['database_type'] ?? '');
        if ($type === 'mongodb') {
            self::mongoCreate($databaseHost, $databaseName, $username, $password);

            return;
        }
        if ($type === 'clickhouse') {
            self::chCreate($databaseHost, $databaseName, $username, $password);

            return;
        }
        $pdo = self::connect($databaseHost);
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
        $type = (string) ($databaseHost['database_type'] ?? '');
        if ($type === 'mongodb') {
            self::mongoDelete($databaseHost, $databaseName, $username);

            return;
        }
        if ($type === 'clickhouse') {
            self::chDelete($databaseHost, $databaseName, $username);

            return;
        }
        $pdo = self::connect($databaseHost);
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
        ?string $databaseName = null,
    ): void {
        $type = (string) ($databaseHost['database_type'] ?? '');
        if ($type === 'mongodb') {
            self::mongoUpdatePassword($databaseHost, (string) $databaseName, $username, $password);

            return;
        }
        if ($type === 'clickhouse') {
            self::chUpdatePassword($databaseHost, $username, $password);

            return;
        }
        $pdo = self::connect($databaseHost);
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

    /**
     * Generates a cryptographically random alphanumeric string.
     */
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
        if ($type === 'mongodb') {
            return self::dumpMongo(self::connectMongo($databaseHost), $databaseName);
        }
        if ($type === 'clickhouse') {
            return self::chDump($databaseHost, $databaseName);
        }
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
    /**
     * Imports a SQL/JSON dump into a customer database.
     *
     * MySQL/MariaDB/PostgreSQL imports connect with the database's own user
     * ($username/$password) to that database only, never with the host's
     * provisioning account, so the dump is limited to that user's grants.
     *
     * @param array<string, mixed> $databaseHost
     *
     * @throws \InvalidArgumentException when credentials are missing or a statement is not allowed
     */
    public static function importDatabase(array $databaseHost, string $databaseName, string $sql, string $username, string $password): void
    {
        if (($databaseHost['database_type'] ?? '') === 'mongodb') {
            self::importMongo(self::connectMongo($databaseHost), $databaseName, $sql);

            return;
        }
        if (($databaseHost['database_type'] ?? '') === 'clickhouse') {
            self::chImport($databaseHost, $databaseName, $sql);

            return;
        }
        $sql = trim($sql);
        if ($sql === '') {
            return;
        }
        if ($username === '') {
            throw new \InvalidArgumentException('Database credentials are required to import a dump');
        }

        $type = (string) ($databaseHost['database_type'] ?? '');
        $chunks = preg_split('/;\s*\n/', $sql) ?: [];
        $statements = [];
        foreach ($chunks as $chunk) {
            $stmt = trim($chunk);
            if ($stmt === '' || str_starts_with($stmt, '--')) {
                continue;
            }
            if (self::isUseOfDatabase($stmt, $databaseName)) {
                // Already connected to this database.
                continue;
            }
            self::assertImportStatementAllowed($stmt, $type);
            $statements[] = $stmt;
        }

        $tenantHost = $databaseHost;
        $tenantHost['database_username'] = $username;
        $tenantHost['database_password'] = $password;
        $pdo = self::connectToDatabase($tenantHost, $databaseName);
        foreach ($statements as $stmt) {
            $pdo->exec($stmt);
        }
    }

    /**
     * Rejects statements a database dump should never need (account, privilege,
     * database-level, server-wide and file-system operations).
     *
     * @throws \InvalidArgumentException
     */
    public static function assertImportStatementAllowed(string $statement, string $type): void
    {
        $patterns = [
            '/(^|;)\s*USE\s/i' => 'USE',
            '/\b(CREATE|DROP|ALTER|RENAME)\s+(USER|ROLE)\b/i' => 'user/role management',
            '/\bSET\s+(PASSWORD|ROLE|DEFAULT\s+ROLE)\b/i' => 'SET PASSWORD/ROLE',
            '/\b(GRANT|REVOKE)\b/i' => 'GRANT/REVOKE',
            '/\b(CREATE|DROP|ALTER)\s+(DATABASE|SCHEMA)\b/i' => 'CREATE/DROP DATABASE',
            '/\bINTO\s+(OUTFILE|DUMPFILE)\b/i' => 'INTO OUTFILE/DUMPFILE',
            '/\bLOAD\s+(DATA|XML)\b/i' => 'LOAD DATA',
            '/\bLOAD_FILE\s*\(/i' => 'LOAD_FILE',
            '/\bSET\s+(GLOBAL|PERSIST|PERSIST_ONLY)\b|@@(GLOBAL|PERSIST)\./i' => 'SET GLOBAL',
            '/\b(INSTALL|UNINSTALL)\s+(PLUGIN|SONAME|COMPONENT)\b/i' => 'plugin management',
        ];
        if ($type === 'postgresql') {
            $patterns += [
                '/^\s*\\\\/m' => 'psql meta-command',
                '/\bCOPY\b[^;]*\b(FROM|TO)\s+(PROGRAM\b|x\b)/i' => 'COPY to/from a file or program',
                '/\bALTER\s+SYSTEM\b/i' => 'ALTER SYSTEM',
                '/\bSET\s+SESSION\s+AUTHORIZATION\b/i' => 'SET SESSION AUTHORIZATION',
                '/\bCREATE\s+(OR\s+REPLACE\s+)?(EXTENSION|LANGUAGE)\b/i' => 'CREATE EXTENSION/LANGUAGE',
                '/\b(lo_import|lo_export|pg_read_file|pg_read_binary_file|pg_ls_dir|dblink\w*)\s*\(/i' => 'server file/connection functions',
            ];
        }

        // Check both string-escaping interpretations so a session sql_mode change cannot hide a statement.
        foreach ([true, false] as $backslashEscapes) {
            $normalized = self::normalizeImportStatement($statement, $type, $backslashEscapes);
            foreach ($patterns as $pattern => $label) {
                if (preg_match($pattern, $normalized) === 1) {
                    throw new \InvalidArgumentException('Dump contains a statement that is not allowed (' . $label . ')');
                }
            }
        }
    }

    /**
     * Validates a dumped `CREATE TABLE` statement and retargets it at `$target`.
     *
     * Accepts exactly one `CREATE TABLE <name> (<columns>) ENGINE = <local engine> ...`
     * statement. Rejects other statements, multiple statements, `AS` / `SELECT`
     * forms, cross-database lookups and engines that reach outside the database
     * (URL, File, S3, MySQL, remote, Distributed, Merge, Kafka, ...).
     *
     * @throws \InvalidArgumentException
     */
    public static function chSanitizeCreateTable(string $ddl, string $target): string
    {
        $ddl = trim($ddl);
        $ddl = rtrim($ddl, "; \t\r\n");
        if ($ddl === '') {
            throw new \InvalidArgumentException('ClickHouse dump entry has no table definition');
        }

        // Strip string literals and quoted identifiers before inspecting keywords
        // so data in DEFAULT / COMMENT clauses or column names cannot hide (or
        // fake) anything.
        $stripped = preg_replace("/'(?:[^'\\\\]|\\\\.|'')*'/s", "''", $ddl);
        $stripped = $stripped === null ? null : preg_replace('/`(?:[^`]|``)*`|"(?:[^"]|"")*"/', 'x', $stripped);
        if ($stripped === null || str_contains($stripped, ';') || str_contains($stripped, '--') || str_contains($stripped, '/*')) {
            throw new \InvalidArgumentException('ClickHouse dump entry must be a single CREATE TABLE statement');
        }

        $ident = '(?:`(?:[^`]|``)+`|"(?:[^"]|"")+"|[a-zA-Z_][a-zA-Z0-9_]*)';
        $prefix = '/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?' . $ident . '(?:\s*\.\s*' . $ident . ')?\s*(?=\()/i';
        if (!preg_match($prefix, $ddl, $m) || !preg_match($prefix, $stripped, $ms)) {
            throw new \InvalidArgumentException('ClickHouse dump entry must be a plain CREATE TABLE <name> (...) statement');
        }
        $body = substr($stripped, strlen($ms[0]));

        if (preg_match('/\b(SELECT|dictGet\w*|joinGet\w*|ATTACH|DETACH|DROP|ALTER|GRANT|REVOKE|SYSTEM|INSERT|RENAME|TRUNCATE|KILL)\b/i', $body) === 1) {
            throw new \InvalidArgumentException('ClickHouse dump entry contains a forbidden clause');
        }

        if (!preg_match('/\bENGINE\s*=\s*([A-Za-z]+)/', $body, $engine)) {
            throw new \InvalidArgumentException('ClickHouse dump entry has no ENGINE clause');
        }
        $allowedEngines = [
            'MergeTree', 'ReplacingMergeTree', 'SummingMergeTree', 'AggregatingMergeTree',
            'CollapsingMergeTree', 'VersionedCollapsingMergeTree', 'GraphiteMergeTree',
            'Log', 'TinyLog', 'StripeLog', 'Memory', 'Null', 'Set', 'Join',
        ];
        if (!in_array($engine[1], $allowedEngines, true)) {
            throw new \InvalidArgumentException('ClickHouse dump entry uses an unsupported table engine: ' . $engine[1]);
        }

        return 'CREATE TABLE IF NOT EXISTS ' . $target . ' ' . ltrim(substr($ddl, strlen($m[0])));
    }

    /**
     * Replaces string literals, quoted identifiers and non-executable comments
     * with placeholders in one left-to-right pass, so keyword checks cannot be
     * fooled by quoting or comment-splitting. MySQL executable comments
     * (`/*! ... *\/`, `/*M! ... *\/`) keep their contents.
     */
    private static function normalizeImportStatement(string $statement, string $type, bool $backslashEscapes): string
    {
        $string = $backslashEscapes ? "'(?:[^'\\\\]|\\\\.|'')*'" : "'(?:[^']|'')*'";
        $doubleQuoted = $backslashEscapes ? '"(?:[^"\\\\]|\\\\.|"")*"' : '"(?:[^"]|"")*"';
        $lineComment = $type === 'postgresql' ? '--[^\n]*' : '--(?=\s|$)[^\n]*|#[^\n]*';
        $pattern = '~(/\*M?!\d*|\*/)|(/\*.*?\*/|' . $lineComment . ')|(' . $string . '|' . $doubleQuoted . '|`(?:[^`]|``)*`)~s';

        return preg_replace_callback(
            $pattern,
            static fn (array $m): string => isset($m[3]) ? ' x ' : ' ',
            $statement
        ) ?? $statement;
    }

    /**
     * True when the statement is just `USE <databaseName>` (optionally quoted).
     */
    private static function isUseOfDatabase(string $statement, string $databaseName): bool
    {
        if (!preg_match('/^\s*USE\s+(`(?:[^`]|``)+`|"(?:[^"]|"")+"|[A-Za-z0-9_$]+)\s*;?\s*$/i', $statement, $m)) {
            return false;
        }
        $name = $m[1];
        if ($name[0] === '`' || $name[0] === '"') {
            $q = $name[0];
            $name = str_replace($q . $q, $q, substr($name, 1, -1));
        }

        return $name === $databaseName;
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

    /**
     * Exports a MySQL/MariaDB database to SQL (schema + rows) via PDO.
     */
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

    /**
     * Exports a PostgreSQL database to SQL (schema + rows) via PDO.
     */
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

    /**
     * Normalizes the MySQL host-scope part of a user (e.g. `%`, `localhost`).
     */
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

    /**
     * Quotes the remote-host part of a MySQL account.
     */
    private static function quoteRemoteMySQL(string $remote): string
    {
        return "'" . str_replace(['\\', "'"], ['\\\\', "\\'"], $remote) . "'";
    }

    private static function quoteIdentifier(string $identifier): string
    {
        return '"' . str_replace('"', '""', $identifier) . '"';
    }

    /**
     * Quotes a MySQL/MariaDB identifier with backticks.
     */
    private static function quoteIdentifierMySQL(string $identifier): string
    {
        return '`' . str_replace('`', '``', $identifier) . '`';
    }

    // ── MongoDB ─────────────────────────────────────────────────────────────

    /**
     * Opens an authenticated MongoDB driver manager from a database-host record.
     */
    private static function connectMongo(array $databaseHost): \MongoDB\Driver\Manager
    {
        if (!extension_loaded('mongodb')) {
            throw new \RuntimeException('PHP mongodb extension is not available on the panel host');
        }
        $host = (string) ($databaseHost['database_host'] ?? '');
        $port = (int) ($databaseHost['database_port'] ?? 27017);
        $user = rawurlencode((string) ($databaseHost['database_username'] ?? ''));
        $pass = rawurlencode((string) ($databaseHost['database_password'] ?? ''));

        return new \MongoDB\Driver\Manager(
            "mongodb://{$user}:{$pass}@{$host}:{$port}/admin?authSource=admin&serverSelectionTimeoutMS=10000"
        );
    }

    /**
     * Creates a MongoDB database user with readWrite on the given database.
     */
    private static function mongoCreate(array $databaseHost, string $databaseName, string $username, string $password): void
    {
        $mgr = self::connectMongo($databaseHost);
        // Materialize the database (MongoDB creates DBs lazily) + a readWrite user
        $mgr->executeCommand($databaseName, new \MongoDB\Driver\Command([
            'create' => '_panel_init',
        ]));
        $bw = new \MongoDB\Driver\BulkWrite();
        $bw->insert(['_id' => 'created_by_featherpanel', 'created_at' => gmdate('c')]);
        $mgr->executeBulkWrite("{$databaseName}._panel_init", $bw);
        $mgr->executeCommand($databaseName, new \MongoDB\Driver\Command([
            'createUser' => $username,
            'pwd' => $password,
            'roles' => [['role' => 'readWrite', 'db' => $databaseName]],
        ]));
    }

    /**
     * Drops a MongoDB user and its database.
     */
    private static function mongoDelete(array $databaseHost, string $databaseName, string $username): void
    {
        $mgr = self::connectMongo($databaseHost);
        try {
            $mgr->executeCommand($databaseName, new \MongoDB\Driver\Command(['dropUser' => $username]));
        } catch (\Throwable $e) {
            // user may not exist
        }
        $mgr->executeCommand($databaseName, new \MongoDB\Driver\Command(['dropDatabase' => 1]));
    }

    /**
     * Updates a MongoDB user password via updateUser.
     */
    private static function mongoUpdatePassword(array $databaseHost, string $databaseName, string $username, string $password): void
    {
        $mgr = self::connectMongo($databaseHost);
        $mgr->executeCommand($databaseName, new \MongoDB\Driver\Command([
            'updateUser' => $username,
            'pwd' => $password,
        ]));
    }

    /**
     * Exports every MongoDB collection as JSON documents.
     */
    private static function dumpMongo(\MongoDB\Driver\Manager $mgr, string $databaseName): string
    {
        $cols = $mgr->executeCommand($databaseName, new \MongoDB\Driver\Command(['listCollections' => 1]))->toArray();
        $out = ['featherpanel_mongo_dump' => true, 'database' => $databaseName, 'collections' => []];
        foreach ($cols as $col) {
            $name = (string) ($col->name ?? '');
            if ($name === '' || str_starts_with($name, 'system.')) {
                continue;
            }
            $docs = $mgr->executeQuery("{$databaseName}.{$name}", new \MongoDB\Driver\Query([]))->toArray();
            $out['collections'][$name] = $docs;
        }

        return json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    /**
     * Imports a JSON document dump ({"collection": [docs]}) into MongoDB.
     */
    private static function importMongo(\MongoDB\Driver\Manager $mgr, string $databaseName, string $json): void
    {
        $data = json_decode(trim($json), true);
        if (!is_array($data) || empty($data['featherpanel_mongo_dump']) || !is_array($data['collections'] ?? null)) {
            throw new \InvalidArgumentException('Invalid MongoDB dump format (expected FeatherPanel JSON dump)');
        }
        foreach ($data['collections'] as $name => $docs) {
            if (!is_array($docs) || !preg_match('/^[a-zA-Z0-9_.-]+$/', (string) $name)) {
                continue;
            }
            $bw = new \MongoDB\Driver\BulkWrite();
            $n = 0;
            foreach ($docs as $doc) {
                $bw->insert($doc);
                if (++$n % 500 === 0) {
                    $mgr->executeBulkWrite("{$databaseName}.{$name}", $bw);
                    $bw = new \MongoDB\Driver\BulkWrite();
                }
            }
            if ($n % 500) {
                $mgr->executeBulkWrite("{$databaseName}.{$name}", $bw);
            }
        }
    }

    // -- ClickHouse (HTTP(S) interface, see ClickHouseHttp) ---------------------

    /**
     * Executes a ClickHouse SQL statement over the HTTP(S) interface and returns the raw response body.
     *
     * Credentials only travel over verified HTTPS (plain HTTP is limited to
     * local/private hosts) and any ClickHouse error, including
     * one appended to an already-started 200 response, raises an exception.
     */
    private static function chQuery(array $databaseHost, string $sql, ?string $postData = null): string
    {
        return ClickHouseHttp::query(
            (string) ($databaseHost['database_host'] ?? ''),
            (int) ($databaseHost['database_port'] ?? 0),
            (string) ($databaseHost['database_username'] ?? 'default'),
            (string) ($databaseHost['database_password'] ?? ''),
            $postData !== null ? $sql . "\n" . $postData : $sql
        );
    }

    /**
     * Quotes a ClickHouse identifier (database/table name) with backticks.
     */
    private static function chIdent(string $name): string
    {
        return '`' . str_replace('`', '``', $name) . '`';
    }

    /**
     * Creates a ClickHouse database and user, granting full access on that database.
     */
    private static function chCreate(array $databaseHost, string $databaseName, string $username, string $password): void
    {
        $db = self::chIdent($databaseName);
        $user = self::chIdent($username);
        self::chQuery($databaseHost, "CREATE DATABASE IF NOT EXISTS {$db}");
        self::chQuery($databaseHost, "CREATE USER IF NOT EXISTS {$user} IDENTIFIED BY " . var_export($password, true));
        self::chQuery($databaseHost, "GRANT SELECT, INSERT, ALTER, CREATE, DROP, OPTIMIZE, SHOW, dictGet ON {$db}.* TO {$user}");
    }

    /**
     * Drops a ClickHouse database and its associated user.
     */
    private static function chDelete(array $databaseHost, string $databaseName, string $username): void
    {
        try {
            self::chQuery($databaseHost, 'DROP USER IF EXISTS ' . self::chIdent($username));
        } catch (\Throwable $e) {
            // user may not exist
        }
        self::chQuery($databaseHost, 'DROP DATABASE IF EXISTS ' . self::chIdent($databaseName));
    }

    /**
     * Changes a ClickHouse user password via ALTER USER.
     */
    private static function chUpdatePassword(array $databaseHost, string $username, string $password): void
    {
        self::chQuery(
            $databaseHost,
            'ALTER USER ' . self::chIdent($username) . ' IDENTIFIED BY ' . var_export($password, true)
        );
    }

    /**
     * Exports every table of a ClickHouse database as JSONEachRow, packed into one JSON object.
     */
    private static function chDump(array $databaseHost, string $databaseName): string
    {
        $tables = self::chQuery($databaseHost, 'SELECT name FROM system.tables WHERE database=' . var_export($databaseName, true) . ' FORMAT TSV');
        $out = ['featherpanel_clickhouse_dump' => true, 'database' => $databaseName, 'tables' => []];
        foreach (preg_split('/\r?\n/', trim($tables)) ?: [] as $table) {
            if ($table === '') {
                continue;
            }
            $ddl = self::chQuery($databaseHost, 'SHOW CREATE TABLE ' . self::chIdent($databaseName) . '.' . self::chIdent($table) . ' FORMAT TSVRaw');
            $data = self::chQuery($databaseHost, 'SELECT * FROM ' . self::chIdent($databaseName) . '.' . self::chIdent($table) . ' FORMAT JSONEachRow');
            $out['tables'][$table] = ['ddl' => $ddl, 'rows' => $data];
        }

        return json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    /**
     * Imports a chDump() JSON payload back into a ClickHouse database (JSONEachRow per table).
     *
     * The DDL comes from the uploaded file and runs with the host credentials,
     * so each entry must be a single plain `CREATE TABLE` with a local storage
     * engine; anything else rejects the whole import before it is executed.
     */
    private static function chImport(array $databaseHost, string $databaseName, string $json): void
    {
        $data = json_decode(trim($json), true);
        if (!is_array($data) || empty($data['featherpanel_clickhouse_dump']) || !is_array($data['tables'] ?? null)) {
            throw new \InvalidArgumentException('Invalid ClickHouse dump format (expected FeatherPanel JSON dump)');
        }

        // Validate everything first so a bad entry cannot leave a half-restored database.
        $plan = [];
        foreach ($data['tables'] as $name => $t) {
            $name = (string) $name;
            if (!is_array($t) || !preg_match('/^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/', $name)) {
                throw new \InvalidArgumentException('Invalid table entry in ClickHouse dump: ' . substr($name, 0, 64));
            }
            $target = self::chIdent($databaseName) . '.' . self::chIdent($name);
            $plan[] = [
                'target' => $target,
                'ddl' => self::chSanitizeCreateTable((string) ($t['ddl'] ?? ''), $target),
                'rows' => (string) ($t['rows'] ?? ''),
            ];
        }

        self::chQuery($databaseHost, 'CREATE DATABASE IF NOT EXISTS ' . self::chIdent($databaseName));
        foreach ($plan as $entry) {
            self::chQuery($databaseHost, $entry['ddl']);
            if (trim($entry['rows']) !== '') {
                self::chQuery($databaseHost, 'INSERT INTO ' . $entry['target'] . ' FORMAT JSONEachRow', $entry['rows']);
            }
        }
    }
}
