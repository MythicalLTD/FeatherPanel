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

use App\Chat\ServerDatabase;
use App\Services\Wings\Wings;

/**
 * Write MySQL/MariaDB dumps onto a server's filesystem via Wings.
 */
class ServerDatabaseFilesystemBackupService
{
    /**
     * @param array{type: string, ignored_files: string, databases: 'all'|list<int>, directory: string} $parsed
     *
     * @throws \Exception when nothing could be backed up
     *
     * @return array{backed_up: list<array<string, mixed>>, errors: list<string>}
     */
    public static function backup(Wings $wings, array $server, array $parsed): array
    {
        $allDatabases = ServerDatabase::getServerDatabasesWithDetailsByServerId((int) $server['id']);
        $targets = [];

        if ($parsed['databases'] === 'all') {
            foreach ($allDatabases as $database) {
                $type = strtolower((string) ($database['database_type'] ?? ''));
                if (in_array($type, ['mysql', 'mariadb'], true)) {
                    $targets[] = $database;
                }
            }
        } else {
            $wanted = array_map('intval', $parsed['databases']);
            foreach ($allDatabases as $database) {
                if (!in_array((int) $database['id'], $wanted, true)) {
                    continue;
                }
                $type = strtolower((string) ($database['database_type'] ?? ''));
                if (!in_array($type, ['mysql', 'mariadb'], true)) {
                    throw new \InvalidArgumentException('Database backup only supports MySQL/MariaDB: ' . $database['database']);
                }
                $targets[] = $database;
            }
            if (count($targets) !== count($wanted)) {
                throw new \InvalidArgumentException('One or more selected databases were not found on this server');
            }
        }

        if ($targets === []) {
            return ['backed_up' => [], 'errors' => []];
        }

        $backedUp = [];
        $errors = [];

        foreach ($targets as $database) {
            try {
                $path = ServerDatabaseDumpService::dumpPathInDirectory(
                    $parsed['directory'],
                    (string) $database['database']
                );
                $dump = ServerDatabaseDumpService::exportToSql($database, null);
                self::ensureServerDirectoryExists($wings, (string) $server['uuid'], $path);

                $writeResponse = $wings->getServer()->writeFile((string) $server['uuid'], $path, $dump['sql']);
                if (!$writeResponse->isSuccessful()) {
                    throw new \RuntimeException('Failed to write dump file: ' . $writeResponse->getError());
                }

                $backedUp[] = [
                    'database_id' => (int) $database['id'],
                    'database_name' => $database['database'],
                    'path' => $path,
                    'table_count' => $dump['table_count'],
                    'size_bytes' => strlen($dump['sql']),
                ];
            } catch (\Throwable $e) {
                $errors[] = $database['database'] . ': ' . $e->getMessage();
            }
        }

        if ($backedUp === []) {
            throw new \RuntimeException('All database backups failed: ' . implode('; ', $errors));
        }

        return [
            'backed_up' => $backedUp,
            'errors' => $errors,
        ];
    }

    public static function ensureServerDirectoryExists(Wings $wings, string $serverUuid, string $filePath): void
    {
        $dir = dirname($filePath);
        if ($dir === '/' || $dir === '.' || $dir === '') {
            return;
        }

        $parts = array_values(array_filter(explode('/', trim($dir, '/')), static fn ($p) => $p !== ''));
        $current = '/';
        foreach ($parts as $part) {
            $wings->getServer()->createDirectory($serverUuid, $part, $current);
            $current = $current === '/' ? '/' . $part : $current . '/' . $part;
        }
    }
}
