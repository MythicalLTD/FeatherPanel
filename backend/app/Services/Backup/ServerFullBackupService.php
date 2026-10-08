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

namespace App\Services\Backup;

use App\Chat\Backup;
use App\Services\Wings\Wings;
use App\Helpers\BackupIgnoreHelper;
use App\Services\Database\ServerDatabaseFilesystemBackupService;

/**
 * Orchestrate a full server backup: DB dumps → optional metadata → Wings archive.
 */
class ServerFullBackupService
{
    /**
     * @param array{
     *   type: string,
     *   ignored_files: string,
     *   databases: 'all'|list<int>,
     *   directory: string,
     *   include_metadata: bool,
     *   include_encrypted: bool,
     *   include_activities: bool
     * } $parsed
     * @param array{name?: string, uuid?: string} $options
     *
     * @return array{
     *   wings_backup: array{id: int, uuid: string, name: string, adapter: string},
     *   backed_up: list<array<string, mixed>>,
     *   dump_errors: list<string>,
     *   metadata_included: bool,
     *   metadata_path: string|null,
     *   metadata_size_bytes: int|null
     * }
     */
    public static function run(Wings $wings, array $server, array $parsed, array $options = []): array
    {
        $dumpResult = ['backed_up' => [], 'errors' => []];
        try {
            $dumpResult = ServerDatabaseFilesystemBackupService::backup($wings, $server, $parsed);
        } catch (\RuntimeException $e) {
            // Full backups still proceed to metadata + Wings when every dump fails
            if (str_starts_with($e->getMessage(), 'All database backups failed')) {
                $dumpResult = ['backed_up' => [], 'errors' => [$e->getMessage()]];
            } else {
                throw $e;
            }
        }

        $metadataIncluded = false;
        $metadataPath = null;
        $metadataSize = null;
        if (!empty($parsed['include_metadata'])) {
            $meta = ServerMetadataBackupService::writeToServer(
                $wings,
                $server,
                !empty($parsed['include_encrypted']),
                !empty($parsed['include_activities'])
            );
            $metadataIncluded = true;
            $metadataPath = $meta['path'];
            $metadataSize = $meta['size_bytes'];
        }

        $wingsBackup = self::createWingsBackup(
            $wings,
            $server,
            $parsed['ignored_files'] !== '' ? $parsed['ignored_files'] : '[]',
            $options
        );

        return [
            'wings_backup' => $wingsBackup,
            'backed_up' => $dumpResult['backed_up'],
            'dump_errors' => $dumpResult['errors'],
            'metadata_included' => $metadataIncluded,
            'metadata_path' => $metadataPath,
            'metadata_size_bytes' => $metadataSize,
        ];
    }

    /**
     * Create a Wings file backup record and start the daemon job.
     *
     * Caller must already enforce backup_limit / FIFO.
     *
     * @param array{name?: string, uuid?: string} $options
     *
     * @return array{id: int, uuid: string, name: string, adapter: string}
     */
    public static function createWingsBackup(Wings $wings, array $server, string $ignoredFiles = '[]', array $options = []): array
    {
        $ignoredFiles = BackupIgnoreHelper::normalizeForStorage($ignoredFiles);
        $backupUuid = $options['uuid'] ?? self::generateUuid();
        $backupName = trim((string) ($options['name'] ?? ''));
        if ($backupName === '') {
            $backupName = 'Full backup at ' . date('Y-m-d H:i:s');
        }

        $adapter = BackupAdapterResolver::resolveDefault($wings);
        $backupId = Backup::createBackup([
            'server_id' => (int) $server['id'],
            'uuid' => $backupUuid,
            'name' => $backupName,
            'ignored_files' => $ignoredFiles,
            'disk' => $adapter,
            'is_successful' => 0,
            'is_locked' => 1,
        ]);

        if (!$backupId) {
            throw new \RuntimeException('Failed to create backup record');
        }

        $daemonAdapter = BackupAdapterResolver::toDaemonAdapter($adapter, $wings);
        $response = $wings->getServer()->createBackup(
            (string) $server['uuid'],
            $daemonAdapter,
            $backupUuid,
            $ignoredFiles
        );

        if (!$response->isSuccessful()) {
            Backup::deleteBackup($backupId);
            throw new \RuntimeException('Failed to initiate Wings backup: ' . $response->getError());
        }

        return [
            'id' => (int) $backupId,
            'uuid' => $backupUuid,
            'name' => $backupName,
            'adapter' => $adapter,
        ];
    }

    private static function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0F) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3F) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
