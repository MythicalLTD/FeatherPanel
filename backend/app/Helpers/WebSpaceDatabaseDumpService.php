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

use App\Chat\WebNode;
use App\Chat\DatabaseInstance;
use App\Chat\WebSpaceDatabase;

/**
 * Dump WebSpace databases into the site data dir and restore them after file backups.
 */
class WebSpaceDatabaseDumpService
{
    public const DUMPS_DIR = '.featherquilld/db-dumps';

    /**
     * @param array<string, mixed> $space
     *
     * @return list<array{database: string, file: string, bytes: int, error?: string}>
     */
    public static function writeDumpsToWebSpace(array $space): array
    {
        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if (!$webNode) {
            return [];
        }

        $uuid = (string) $space['uuid'];
        FeatherQuilldClient::createWebSpaceDirectory($webNode, $uuid, self::DUMPS_DIR);

        $results = [];
        foreach (WebSpaceDatabase::listByWebSpaceId((int) ($space['id'] ?? 0)) as $record) {
            $name = (string) ($record['database'] ?? '');
            $host = DatabaseInstance::getDatabaseById((int) ($record['database_host_id'] ?? 0));
            $file = self::DUMPS_DIR . '/' . self::safeFileName($name) . '.sql';
            if ($name === '' || !$host) {
                $results[] = ['database' => $name, 'file' => $file, 'bytes' => 0, 'error' => 'host missing'];
                continue;
            }

            try {
                $sql = RemoteDatabaseProvisioner::dumpDatabase($host, $name);
                $write = FeatherQuilldClient::writeWebSpaceFile($webNode, $uuid, $file, $sql);
                if (!$write['ok']) {
                    $results[] = ['database' => $name, 'file' => $file, 'bytes' => 0, 'error' => $write['error'] ?? 'write failed'];
                    continue;
                }
                $results[] = ['database' => $name, 'file' => $file, 'bytes' => strlen($sql)];
            } catch (\Throwable $e) {
                $results[] = ['database' => $name, 'file' => $file, 'bytes' => 0, 'error' => $e->getMessage()];
            }
        }

        return $results;
    }

    /**
     * @param array<string, mixed> $space
     *
     * @return list<array{database: string, file: string, error?: string}>
     */
    public static function importDumpsFromWebSpace(array $space): array
    {
        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if (!$webNode) {
            return [];
        }

        $uuid = (string) $space['uuid'];
        $results = [];
        foreach (WebSpaceDatabase::listByWebSpaceId((int) ($space['id'] ?? 0)) as $record) {
            $name = (string) ($record['database'] ?? '');
            $host = DatabaseInstance::getDatabaseById((int) ($record['database_host_id'] ?? 0));
            $file = self::DUMPS_DIR . '/' . self::safeFileName($name) . '.sql';
            if ($name === '' || !$host) {
                continue;
            }

            $read = FeatherQuilldClient::getWebSpaceFileContents($webNode, $uuid, $file);
            if (!$read['ok']) {
                $results[] = ['database' => $name, 'file' => $file, 'error' => 'dump not found'];
                continue;
            }

            $sql = is_string($read['body']) ? $read['body'] : '';
            if ($sql === '') {
                $results[] = ['database' => $name, 'file' => $file, 'error' => 'empty dump'];
                continue;
            }

            try {
                RemoteDatabaseProvisioner::importDatabase($host, $name, $sql);
                $results[] = ['database' => $name, 'file' => $file];
            } catch (\Throwable $e) {
                $results[] = ['database' => $name, 'file' => $file, 'error' => $e->getMessage()];
            }
        }

        return $results;
    }

    public static function safeFileName(string $databaseName): string
    {
        $name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $databaseName) ?? 'database';

        return $name !== '' ? $name : 'database';
    }
}
