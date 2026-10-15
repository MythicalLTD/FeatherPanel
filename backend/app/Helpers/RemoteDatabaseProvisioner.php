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
    ): void {
        $type = (string) ($databaseHost['database_type'] ?? '');
        if ($type === 'mongodb') {
            self::mongoUpdatePassword($databaseHost, $databaseName, $username, $password);

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
    public static function importDatabase(array $databaseHost, string $databaseName, string $sql): void
    {
        if (($databaseHost['database_type'] ?? '') === 'mongodb') {
            self::importMongo(self::connectMongo($databaseHost), $databaseName, $sql);

            return;
        }
        if (($databaseHost['database_type'] ?? '') === 'clickhouse') {
            self::chImport($databaseHost, $databaseName, $sql);

            return;
        }
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

    // -- ClickHouse (HTTP interface on port 8123) --------------------------------

    /**
     * Executes a ClickHouse SQL statement over the HTTP interface and returns the raw response body.
     */
    private static function chQuery(array $databaseHost, string $sql, ?string $postData = null): string
    {
        $host = (string) ($databaseHost['database_host'] ?? '');
        $port = (int) ($databaseHost['database_port'] ?? 8123);
        $user = (string) ($databaseHost['database_username'] ?? 'default');
        $pass = (string) ($databaseHost['database_password'] ?? '');

        $url = "http://{$host}:{$port}/?query=" . urlencode($sql);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_USERPWD => "{$user}:{$pass}",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_POST => $postData !== null,
            CURLOPT_POSTFIELDS => $postData,
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);

        if ($body === false || $code >= 400) {
            throw new \RuntimeException('ClickHouse query failed (HTTP ' . $code . '): ' . ($err !== '' ? $err : (string) $body));
        }

        return (string) $body;
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
        $tables = self::chQuery($databaseHost, "SELECT name FROM system.tables WHERE database=" . var_export($databaseName, true) . ' FORMAT TSV');
        $out = ['featherpanel_clickhouse_dump' => true, 'database' => $databaseName, 'tables' => []];
        foreach (preg_split('/\s+/', trim($tables)) ?: [] as $table) {
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
     */
    private static function chImport(array $databaseHost, string $databaseName, string $json): void
    {
        $data = json_decode(trim($json), true);
        if (!is_array($data) || empty($data['featherpanel_clickhouse_dump']) || !is_array($data['tables'] ?? null)) {
            throw new \InvalidArgumentException('Invalid ClickHouse dump format (expected FeatherPanel JSON dump)');
        }
        self::chQuery($databaseHost, 'CREATE DATABASE IF NOT EXISTS ' . self::chIdent($databaseName));
        foreach ($data['tables'] as $name => $t) {
            if (!is_array($t) || !preg_match('/^[a-zA-Z0-9_.-]+$/', (string) $name)) {
                continue;
            }
            $ddl = (string) ($t['ddl'] ?? '');
            $ddl = preg_replace('/^CREATE TABLE\s+\S+/i', 'CREATE TABLE IF NOT EXISTS ' . self::chIdent($databaseName) . '.' . self::chIdent($name), $ddl);
            self::chQuery($databaseHost, $ddl);
            $rows = (string) ($t['rows'] ?? '');
            if (trim($rows) !== '') {
                self::chQuery(
                    $databaseHost,
                    'INSERT INTO ' . self::chIdent($databaseName) . '.' . self::chIdent($name) . ' FORMAT JSONEachRow',
                    $rows
                );
            }
        }
    }
}
