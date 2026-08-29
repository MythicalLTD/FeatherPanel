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

namespace App\Services\Database;

/**
 * Shared MySQL/MariaDB dump export and SQL import for interactive and scheduled use.
 */
class ServerDatabaseDumpService
{
    /**
     * Default interactive export row cap per table (UI download).
     */
    public const DEFAULT_MAX_ROWS_PER_TABLE = 10000;

    /**
     * Default directory for scheduled database dumps on the server filesystem.
     */
    public const DEFAULT_BACKUP_DIRECTORY = '/.featherpanel-database-backups';

    /**
     * Legacy dump directory (pre-.featherpanel-database-backups rename).
     */
    public const LEGACY_BACKUP_DIRECTORY = '/database-backups';

    /**
     * Parse a schedule `backup` (or legacy `database_backup`) task payload.
     *
     * Formats:
     * - Legacy files: plain ignore string / "[]" / empty → type=files
     * - Files JSON: {"type":"files","ignored_files":"*.log"}
     * - Database JSON: {"type":"database","databases":"all"|[1,2],"directory":"/.featherpanel-database-backups"}
     * - Full JSON: {"type":"full","ignored_files":"","databases":"all","directory":"/.featherpanel-database-backups","include_metadata":true,"include_encrypted":false,"include_activities":false}
     * - Legacy DB: {"database_id":1,"path":"/.featherpanel-database-backups/db.sql"}
     *
     * @throws \InvalidArgumentException
     *
     * @return array{
     *   type: 'files'|'database'|'full',
     *   ignored_files: string,
     *   databases: 'all'|list<int>,
     *   directory: string,
     *   include_metadata: bool,
     *   include_encrypted: bool,
     *   include_activities: bool
     * }
     */
    public static function parseBackupPayload(string $payload): array
    {
        $defaults = [
            'include_metadata' => false,
            'include_encrypted' => false,
            'include_activities' => false,
        ];

        $payload = trim($payload);

        // Empty / legacy Wings ignore patterns → server files backup
        if ($payload === '' || $payload === '[]') {
            return array_merge([
                'type' => 'files',
                'ignored_files' => $payload === '[]' ? '[]' : '',
                'databases' => [],
                'directory' => self::DEFAULT_BACKUP_DIRECTORY,
            ], $defaults);
        }

        $data = json_decode($payload, true);
        if (!is_array($data)) {
            // Non-JSON string is treated as gitignore-style ignore patterns
            return array_merge([
                'type' => 'files',
                'ignored_files' => $payload,
                'databases' => [],
                'directory' => self::DEFAULT_BACKUP_DIRECTORY,
            ], $defaults);
        }

        // Legacy single-database payload from database_backup action
        if (isset($data['database_id']) && !isset($data['type'])) {
            $databaseId = (int) $data['database_id'];
            if ($databaseId <= 0) {
                throw new \InvalidArgumentException('database_id must be a positive integer');
            }
            $directory = self::DEFAULT_BACKUP_DIRECTORY;
            if (!empty($data['path'])) {
                $path = self::normalizeServerPath((string) $data['path']);
                $directory = str_ends_with(strtolower($path), '.sql')
                    ? (dirname($path) === '\\' || dirname($path) === '.' ? self::DEFAULT_BACKUP_DIRECTORY : dirname($path))
                    : $path;
            }

            return array_merge([
                'type' => 'database',
                'ignored_files' => '',
                'databases' => [$databaseId],
                'directory' => self::normalizeDumpDirectory($directory),
            ], $defaults);
        }

        $type = isset($data['type']) ? strtolower(trim((string) $data['type'])) : 'files';
        if (!in_array($type, ['files', 'database', 'full'], true)) {
            throw new \InvalidArgumentException('Backup type must be "files", "database", or "full"');
        }

        $metaFlags = [
            'include_metadata' => !empty($data['include_metadata']),
            'include_encrypted' => !empty($data['include_encrypted']),
            'include_activities' => !empty($data['include_activities']),
        ];

        if ($type === 'files') {
            $ignored = $data['ignored_files'] ?? ($data['payload'] ?? '');
            if (is_array($ignored)) {
                $ignored = implode(',', $ignored);
            }

            return array_merge([
                'type' => 'files',
                'ignored_files' => is_string($ignored) ? $ignored : '',
                'databases' => [],
                'directory' => self::DEFAULT_BACKUP_DIRECTORY,
            ], $defaults);
        }

        $databases = $data['databases'] ?? ($type === 'full' ? 'all' : null);
        if ($databases === 'all' || $databases === '*' || $databases === true) {
            $databases = 'all';
        } elseif (is_array($databases)) {
            $ids = [];
            foreach ($databases as $id) {
                $id = (int) $id;
                if ($id > 0) {
                    $ids[] = $id;
                }
            }
            $ids = array_values(array_unique($ids));
            if ($ids === []) {
                throw new \InvalidArgumentException('Select at least one database, or use "all"');
            }
            $databases = $ids;
        } elseif (isset($data['database_id'])) {
            $id = (int) $data['database_id'];
            if ($id <= 0) {
                throw new \InvalidArgumentException('database_id must be a positive integer');
            }
            $databases = [$id];
        } elseif ($type === 'full') {
            $databases = 'all';
        } else {
            throw new \InvalidArgumentException('databases must be "all" or an array of database IDs');
        }

        $directory = isset($data['directory']) ? trim((string) $data['directory']) : '';
        if ($directory === '' && !empty($data['path'])) {
            $path = self::normalizeServerPath((string) $data['path']);
            $directory = str_ends_with(strtolower($path), '.sql') ? dirname($path) : $path;
        }
        if ($directory === '' || $directory === '.' || $directory === '\\') {
            $directory = self::DEFAULT_BACKUP_DIRECTORY;
        }
        $directory = self::normalizeDumpDirectory($directory);
        if (str_ends_with(strtolower($directory), '.sql')) {
            throw new \InvalidArgumentException('directory must be a folder path, not a .sql file');
        }

        if ($type === 'full') {
            $ignored = $data['ignored_files'] ?? '';
            if (is_array($ignored)) {
                $ignored = implode(',', $ignored);
            }
            // Full backups include metadata by default unless explicitly disabled
            if (!array_key_exists('include_metadata', $data)) {
                $metaFlags['include_metadata'] = true;
            }

            return array_merge([
                'type' => 'full',
                'ignored_files' => is_string($ignored) ? $ignored : '',
                'databases' => $databases,
                'directory' => $directory,
            ], $metaFlags);
        }

        return array_merge([
            'type' => 'database',
            'ignored_files' => '',
            'databases' => $databases,
            'directory' => $directory,
        ], $defaults);
    }

    /**
     * Build a dump file path under a directory for a database name.
     */
    public static function dumpPathInDirectory(string $directory, string $databaseName): string
    {
        $directory = self::normalizeServerPath($directory);
        $safe = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $databaseName) ?: 'database';

        return rtrim($directory, '/') . '/' . $safe . '_' . date('Y-m-d_H-i-s') . '.sql';
    }

    /**
     * Normalize a dump directory and remap the legacy /database-backups path.
     */
    public static function normalizeDumpDirectory(string $directory): string
    {
        $directory = self::normalizeServerPath($directory);
        if ($directory === self::LEGACY_BACKUP_DIRECTORY) {
            return self::DEFAULT_BACKUP_DIRECTORY;
        }

        return $directory;
    }

    /**
     * Normalize a server-relative file path and reject traversal.
     *
     * @throws \InvalidArgumentException
     */
    public static function normalizeServerPath(string $path): string
    {
        $path = str_replace('\\', '/', trim($path));
        if ($path === '' || str_contains($path, "\0")) {
            throw new \InvalidArgumentException('Invalid file path');
        }

        if (!str_starts_with($path, '/')) {
            $path = '/' . $path;
        }

        $segments = [];
        foreach (explode('/', $path) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }
            if ($segment === '..') {
                throw new \InvalidArgumentException('Path must not contain ".." segments');
            }
            $segments[] = $segment;
        }

        return '/' . implode('/', $segments);
    }

    /**
     * Build a default dump path under /.featherpanel-database-backups.
     */
    public static function defaultBackupPath(string $databaseName): string
    {
        return self::dumpPathInDirectory(self::DEFAULT_BACKUP_DIRECTORY, $databaseName);
    }

    /**
     * Export a MySQL/MariaDB database to SQL.
     *
     * @param array $database Row from ServerDatabase::getServerDatabaseWithDetails
     * @param int|null $maxRowsPerTable Cap rows per table; null = no cap (full dump)
     *
     * @throws \InvalidArgumentException|\PDOException|\RuntimeException
     *
     * @return array{sql: string, table_count: int, exported_at: string, filename: string}
     */
    public static function exportToSql(array $database, ?int $maxRowsPerTable = null): array
    {
        $type = $database['database_type'] ?? '';
        if (!in_array($type, ['mysql', 'mariadb'], true)) {
            throw new \InvalidArgumentException('SQL dump export is only supported for MySQL/MariaDB databases');
        }

        $options = [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION, \PDO::ATTR_TIMEOUT => 120];
        $dbPort = (int) $database['database_port'];
        $dsn = "mysql:host={$database['database_host']};port={$dbPort};dbname={$database['database']};charset=utf8mb4";
        $pdo = new \PDO($dsn, $database['username'], $database['password'], $options);

        $exportedAt = date('Y-m-d H:i:s');
        $lines = [
            '-- FeatherPanel SQL Dump',
            "-- Database: {$database['database']}",
            "-- Generated: {$exportedAt}",
            "-- Host: {$database['database_host']}:{$database['database_port']}",
            '',
            'SET FOREIGN_KEY_CHECKS=0;',
            "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';",
            "SET time_zone='+00:00';",
            '',
        ];

        $tables = $pdo->query('SHOW TABLES')->fetchAll(\PDO::FETCH_COLUMN);
        $tableCount = count($tables);

        foreach ($tables as $table) {
            $safeTable = self::quoteIdentifierMySQL($table);

            $lines[] = "-- Table: {$table}";
            $lines[] = "DROP TABLE IF EXISTS {$safeTable};";

            $createRow = $pdo->query("SHOW CREATE TABLE {$safeTable}")->fetch(\PDO::FETCH_NUM);
            $lines[] = $createRow[1] . ';';
            $lines[] = '';

            $selectSql = "SELECT * FROM {$safeTable}";
            if ($maxRowsPerTable !== null && $maxRowsPerTable > 0) {
                $selectSql .= ' LIMIT ' . (int) $maxRowsPerTable;
            }

            $rows = $pdo->query($selectSql)->fetchAll(\PDO::FETCH_ASSOC);
            if (!empty($rows)) {
                $columns = '(' . implode(', ', array_map(fn ($c) => self::quoteIdentifierMySQL($c), array_keys($rows[0]))) . ')';
                $chunks = array_chunk($rows, 250);
                foreach ($chunks as $chunk) {
                    $valuesList = array_map(function (array $row) use ($pdo): string {
                        $vals = array_map(function ($v) use ($pdo): string {
                            if ($v === null) {
                                return 'NULL';
                            }

                            return $pdo->quote((string) $v);
                        }, array_values($row));

                        return '(' . implode(', ', $vals) . ')';
                    }, $chunk);
                    $lines[] = "INSERT INTO {$safeTable} {$columns} VALUES";
                    $lines[] = implode(",\n", $valuesList) . ';';
                }
                $lines[] = '';
            }
        }

        $lines[] = 'SET FOREIGN_KEY_CHECKS=1;';
        $sql = implode("\n", $lines);
        $filename = $database['database'] . '_' . date('Y-m-d_H-i-s') . '.sql';

        return [
            'sql' => $sql,
            'table_count' => $tableCount,
            'exported_at' => $exportedAt,
            'filename' => $filename,
        ];
    }

    /**
     * Import SQL into a MySQL/MariaDB/PostgreSQL database.
     *
     * @param array $database Row from ServerDatabase::getServerDatabaseWithDetails
     *
     * @throws \InvalidArgumentException|\PDOException|\RuntimeException
     *
     * @return array{executed_statements: int, errors: array<int, string>, success: bool}
     */
    public static function importSql(array $database, string $sql, bool $ignoreErrors = false): array
    {
        $type = $database['database_type'] ?? '';
        if (!in_array($type, ['mysql', 'mariadb', 'postgresql'], true)) {
            throw new \InvalidArgumentException('SQL import is not supported for database type: ' . $type);
        }

        if ($sql === '') {
            throw new \InvalidArgumentException('Missing SQL content');
        }

        if (strlen($sql) > 50 * 1024 * 1024) {
            throw new \InvalidArgumentException('SQL content exceeds 50 MB limit');
        }

        $dbPort = (int) $database['database_port'];

        if (in_array($type, ['mysql', 'mariadb'], true)) {
            $options = [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 120,
                \PDO::MYSQL_ATTR_MULTI_STATEMENTS => false,
            ];
            $dsn = "mysql:host={$database['database_host']};port={$dbPort};dbname={$database['database']};charset=utf8mb4";
        } else {
            $options = [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION, \PDO::ATTR_TIMEOUT => 120];
            $dsn = "pgsql:host={$database['database_host']};port={$dbPort};dbname={$database['database']}";
        }

        $pdo = new \PDO($dsn, $database['username'], $database['password'], $options);

        $statements = self::splitSqlStatements($sql);
        $executed = 0;
        $errors = [];

        foreach ($statements as $statement) {
            $statement = trim($statement);
            if ($statement === '' || str_starts_with($statement, '--') || str_starts_with($statement, '#')) {
                continue;
            }
            if (self::isDangerousStatement($statement)) {
                $errors[] = 'Blocked dangerous statement: ' . mb_substr($statement, 0, 120);
                if (!$ignoreErrors) {
                    break;
                }
                continue;
            }
            try {
                $pdo->exec($statement);
                ++$executed;
            } catch (\PDOException $e) {
                $errors[] = $e->getMessage();
                if (!$ignoreErrors) {
                    break;
                }
            }
        }

        return [
            'executed_statements' => $executed,
            'errors' => $errors,
            'success' => empty($errors),
        ];
    }

    public static function quoteIdentifierMySQL(string $identifier): string
    {
        return '`' . str_replace('`', '``', $identifier) . '`';
    }

    public static function isDangerousStatement(string $sql): bool
    {
        $normalised = strtoupper(preg_replace('/\s+/', ' ', trim($sql)));
        $patterns = [
            'LOAD DATA ',
            'LOAD_FILE(',
            'INTO OUTFILE',
            'INTO DUMPFILE',
        ];
        foreach ($patterns as $pattern) {
            if (str_contains($normalised, $pattern)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<int, string>
     */
    public static function splitSqlStatements(string $sql): array
    {
        $statements = [];
        $current = '';
        $inSingleQuote = false;
        $inDoubleQuote = false;
        $inLineComment = false;
        $inBlockComment = false;
        $len = strlen($sql);

        for ($i = 0; $i < $len; ++$i) {
            $char = $sql[$i];
            $next = $i + 1 < $len ? $sql[$i + 1] : '';

            if ($inLineComment) {
                if ($char === "\n") {
                    $inLineComment = false;
                }
                continue;
            }

            if ($inBlockComment) {
                if ($char === '*' && $next === '/') {
                    $inBlockComment = false;
                    ++$i;
                }
                continue;
            }

            if (!$inSingleQuote && !$inDoubleQuote) {
                if ($char === '-' && $next === '-') {
                    $inLineComment = true;
                    ++$i;
                    continue;
                }
                if ($char === '#') {
                    $inLineComment = true;
                    continue;
                }
                if ($char === '/' && $next === '*') {
                    $inBlockComment = true;
                    ++$i;
                    continue;
                }
            }

            if ($char === "'" && !$inDoubleQuote) {
                if ($inSingleQuote && $next === "'") {
                    $current .= $char;
                    ++$i;
                    continue;
                }
                $inSingleQuote = !$inSingleQuote;
            } elseif ($char === '"' && !$inSingleQuote) {
                if ($inDoubleQuote && $next === '"') {
                    $current .= $char;
                    ++$i;
                    continue;
                }
                $inDoubleQuote = !$inDoubleQuote;
            }

            if ($char === ';' && !$inSingleQuote && !$inDoubleQuote) {
                $stmt = trim($current);
                if ($stmt !== '') {
                    $statements[] = $stmt;
                }
                $current = '';
            } else {
                $current .= $char;
            }
        }

        $last = trim($current);
        if ($last !== '') {
            $statements[] = $last;
        }

        return $statements;
    }
}
