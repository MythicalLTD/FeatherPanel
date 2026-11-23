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
 * Brings the grants of existing MySQL/MariaDB databases (server and WebSpace databases) in line
 * with how new ones are granted: on the escaped database name, so a grant covers exactly one
 * database. Runs once from `php cli migrate`.
 *
 * Hosts that cannot be reached are logged and skipped so an update never fails because of them;
 * the step stays pending and is retried on the next migrate run until every database was handled.
 */
final class DatabaseGrantRepair
{
    /**
     * Row written to featherpanel_migrations once every database was handled.
     */
    public const MARKER = 'php:2026-11-23-database-grant-names';

    /**
     * @param list<array<string, mixed>> $hosts database host rows (decrypted password)
     * @param list<array{database_host_id: int|string, database: string, username: string, remote?: string}> $databases
     * @param callable(array<string, mixed>): \PDO $connect opens a connection to a host row
     * @param callable(string): void $log receives one line per problem
     *
     * @return array{updated: int, unchanged: int, skipped: int, failed: int, too_long: int, complete: bool}
     */
    public static function run(array $hosts, array $databases, callable $connect, callable $log): array
    {
        $stats = ['updated' => 0, 'unchanged' => 0, 'skipped' => 0, 'failed' => 0, 'too_long' => 0, 'complete' => true];

        $hostsById = [];
        foreach ($hosts as $host) {
            $type = (string) ($host['database_type'] ?? '');
            if ($type === 'mysql' || $type === 'mariadb') {
                $hostsById[(int) $host['id']] = $host;
            }
        }

        $byHost = [];
        foreach ($databases as $database) {
            $hostId = (int) $database['database_host_id'];
            if (isset($hostsById[$hostId])) {
                $byHost[$hostId][] = $database;
            }
        }

        foreach ($byHost as $hostId => $rows) {
            $host = $hostsById[$hostId];
            try {
                $pdo = $connect($host);
            } catch (\Throwable $e) {
                $stats['skipped'] += count($rows);
                $stats['complete'] = false;
                $log('Could not reach database host #' . $hostId . ' (' . ($host['name'] ?? '') . '); ' . count($rows) . ' database(s) will be retried on the next migrate: ' . $e->getMessage());
                continue;
            }

            foreach ($rows as $row) {
                $name = (string) $row['database'];
                try {
                    $changed = RemoteDatabaseProvisioner::reissueMySQLGrant(
                        $pdo,
                        $name,
                        (string) $row['username'],
                        (string) ($row['remote'] ?? '%'),
                    );
                    ++$stats[$changed ? 'updated' : 'unchanged'];
                } catch (\InvalidArgumentException $e) {
                    // The name does not fit once escaped (or the stored host part is unusable);
                    // keep the existing grant so the owner does not lose access.
                    ++$stats['too_long'];
                    $log('Left the grant of database ' . $name . ' on host #' . $hostId . ' unchanged: ' . $e->getMessage() . '. Recreate it with a shorter name.');
                } catch (\Throwable $e) {
                    ++$stats['failed'];
                    $stats['complete'] = false;
                    $log('Could not update the grant of database ' . $name . ' on host #' . $hostId . ': ' . $e->getMessage());
                }
            }
        }

        return $stats;
    }

    /**
     * Loads hosts and databases from the panel database and runs the repair.
     *
     * @param callable(string): void $log
     *
     * @return array{updated: int, unchanged: int, skipped: int, failed: int, too_long: int, complete: bool}
     */
    public static function runForPanel(\PDO $panel, callable $log): array
    {
        $hosts = [];
        $stmt = $panel->query("SELECT * FROM `featherpanel_databases` WHERE `database_type` IN ('mysql', 'mariadb')");
        foreach ($stmt !== false ? $stmt->fetchAll(\PDO::FETCH_ASSOC) : [] as $host) {
            if (isset($host['database_password']) && is_string($host['database_password']) && $host['database_password'] !== '') {
                try {
                    $host['database_password'] = \App\App::getInstance(true)->decryptValue($host['database_password']);
                } catch (\Throwable) {
                    // Leave as is; connecting will fail and the host is retried next time.
                }
            }
            $hosts[] = $host;
        }

        $databases = [];
        // Server databases are always granted to user@'%'.
        $stmt = $panel->query('SELECT `database_host_id`, `database`, `username` FROM `featherpanel_server_databases`');
        foreach ($stmt !== false ? $stmt->fetchAll(\PDO::FETCH_ASSOC) : [] as $row) {
            $row['remote'] = '%';
            $databases[] = $row;
        }

        try {
            $stmt = $panel->query('SELECT `database_host_id`, `database`, `username`, `remote` FROM `featherpanel_webspace_databases`');
            foreach ($stmt !== false ? $stmt->fetchAll(\PDO::FETCH_ASSOC) : [] as $row) {
                $databases[] = $row;
            }
        } catch (\PDOException $e) {
            // Only a missing WebSpaces table is fine (1146 / 42S02); any other failure must keep
            // the step pending instead of marking it done without those databases.
            $code = (int) ($e->errorInfo[1] ?? 0);
            if ($code !== 1146 && (string) $e->getCode() !== '42S02') {
                throw $e;
            }
        }

        return self::run($hosts, $databases, [RemoteDatabaseProvisioner::class, 'connectHost'], $log);
    }
}
