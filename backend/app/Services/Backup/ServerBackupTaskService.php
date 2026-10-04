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
use App\Chat\ServerActivity;
use App\Services\Wings\Wings;
use App\Helpers\BackupIgnoreHelper;
use App\Services\Database\ServerDatabaseDumpService;
use App\Services\Database\ServerDatabaseFilesystemBackupService;

/**
 * Shared "backup" task used by server schedules and lifecycle hooks.
 *
 * Understands the same payload as the schedule `backup` task (see
 * {@see ServerDatabaseDumpService::parseBackupPayload()}): server files, database dumps or a
 * full backup, and applies the same backup_limit / FIFO-rolling retention rules. Backups
 * created here are locked (is_locked = 1), exactly like scheduled backups.
 *
 * File archives are created asynchronously by the daemon: success here means the backup job was
 * accepted and its record created, not that the archive has finished.
 */
class ServerBackupTaskService
{
    public const STATUS_CREATED = 'created';
    public const STATUS_SKIPPED = 'skipped';

    public const SKIP_DISABLED = 'backups_disabled';
    public const SKIP_LIMIT = 'backup_limit_reached';
    public const SKIP_FIFO = 'fifo_rotation_failed';
    public const SKIP_NO_DATABASES = 'no_databases';

    /**
     * @param array<string, mixed> $server
     * @param string $payload schedule-style backup payload (JSON or legacy ignore patterns)
     * @param array{context?: string, name_prefix?: string} $options context = activity prefix ("schedule", "lifecycle")
     *
     * @throws \InvalidArgumentException on an invalid payload
     * @throws \Exception when the backup could not be started
     *
     * @return array{type: string, status: string, reason: string|null, backup_uuid: string|null, backup_id: int|null, name: string|null, details: array<string, mixed>}
     */
    public function run(Wings $wings, array $server, string $payload, array $options = []): array
    {
        $parsed = ServerDatabaseDumpService::parseBackupPayload($payload);

        if ($parsed['type'] === 'database') {
            return $this->runDatabaseBackup($wings, $server, $parsed, $options);
        }

        if ($parsed['type'] === 'full') {
            $skip = $this->acquireBackupSlot($wings, $server, 'full', $options);
            if ($skip !== null) {
                return $skip;
            }

            $name = $this->backupName($options, 'full backup');
            $result = $this->startFullBackup($wings, $server, $parsed, $name);
            $wingsBackup = $result['wings_backup'];
            $this->recordActivity($server, $options, 'full_backup_started', [
                'backup_uuid' => $wingsBackup['uuid'],
                'backup_id' => $wingsBackup['id'],
                'metadata_included' => $result['metadata_included'],
            ]);

            return $this->result('full', self::STATUS_CREATED, null, $wingsBackup['uuid'], $wingsBackup['id'], $wingsBackup['name'], [
                'metadata_included' => $result['metadata_included'],
                'databases_dumped' => count($result['backed_up']),
                'dump_errors' => $result['dump_errors'],
            ]);
        }

        return $this->runFilesBackup($wings, $server, $parsed['ignored_files'] !== '' ? $parsed['ignored_files'] : '[]', $options);
    }

    /**
     * Server files backup (the schedule `backup` task with type "files").
     *
     * @param array<string, mixed> $server
     * @param array{context?: string, name_prefix?: string} $options
     *
     * @return array{type: string, status: string, reason: string|null, backup_uuid: string|null, backup_id: int|null, name: string|null, details: array<string, mixed>}
     */
    public function runFilesBackup(Wings $wings, array $server, string $ignoredFiles, array $options = []): array
    {
        $ignoredFiles = BackupIgnoreHelper::normalizeForStorage($ignoredFiles);

        $skip = $this->acquireBackupSlot($wings, $server, 'files', $options);
        if ($skip !== null) {
            return $skip;
        }

        $backup = $this->startWingsBackup($wings, $server, $ignoredFiles, $this->backupName($options, 'backup'));
        $this->recordActivity($server, $options, 'backup_started', [
            'backup_uuid' => $backup['uuid'],
            'backup_id' => $backup['id'],
        ]);

        return $this->result('files', self::STATUS_CREATED, null, $backup['uuid'], $backup['id'], $backup['name']);
    }

    // --- Seams (database / daemon access), overridden in unit tests ---------------------------

    protected function countBackups(int $serverId): int
    {
        return count(Backup::getBackupsByServerId($serverId));
    }

    protected function isFifoRolling(array $server): bool
    {
        return BackupFifoEviction::isFifoRollingForServer($server);
    }

    /**
     * @return array{message: string, code: string, status: int}|null null on success
     */
    protected function evictOldestBackup(Wings $wings, array $server): ?array
    {
        return BackupFifoEviction::evictOldestWingsBackup((int) $server['id'], (string) $server['uuid'], $wings);
    }

    /**
     * @return array{id: int, uuid: string, name: string, adapter: string}
     */
    protected function startWingsBackup(Wings $wings, array $server, string $ignoredFiles, string $name): array
    {
        return ServerFullBackupService::createWingsBackup($wings, $server, $ignoredFiles, ['name' => $name]);
    }

    protected function startFullBackup(Wings $wings, array $server, array $parsed, string $name): array
    {
        return ServerFullBackupService::run($wings, $server, $parsed, ['name' => $name]);
    }

    protected function dumpDatabases(Wings $wings, array $server, array $parsed): array
    {
        return ServerDatabaseFilesystemBackupService::backup($wings, $server, $parsed);
    }

    protected function createActivity(array $data): void
    {
        ServerActivity::createActivity($data);
    }

    /**
     * @param array<string, mixed> $server
     * @param array<string, mixed> $parsed
     * @param array{context?: string, name_prefix?: string} $options
     */
    private function runDatabaseBackup(Wings $wings, array $server, array $parsed, array $options): array
    {
        $result = $this->dumpDatabases($wings, $server, $parsed);

        if ($result['backed_up'] === [] && $result['errors'] === []) {
            $this->recordActivity($server, $options, 'database_backup_skipped_empty', ['directory' => $parsed['directory']]);

            return $this->result('database', self::STATUS_SKIPPED, self::SKIP_NO_DATABASES);
        }

        $this->recordActivity($server, $options, 'database_backup', [
            'directory' => $parsed['directory'],
            'scope' => $parsed['databases'] === 'all' ? 'all' : 'specific',
            'backed_up' => $result['backed_up'],
            'errors' => $result['errors'],
        ]);

        if ($result['errors'] !== []) {
            throw new \Exception('Some database backups failed: ' . implode('; ', $result['errors']));
        }

        return $this->result('database', self::STATUS_CREATED, null, null, null, null, [
            'databases_dumped' => count($result['backed_up']),
        ]);
    }

    /**
     * Enforce backup_limit and FIFO rotation (same rules as scheduled backups).
     *
     * @param array<string, mixed> $server
     * @param array{context?: string, name_prefix?: string} $options
     *
     * @return array<string, mixed>|null a "skipped" result when no backup may be created, null to proceed
     */
    private function acquireBackupSlot(Wings $wings, array $server, string $type, array $options): ?array
    {
        $limit = (int) ($server['backup_limit'] ?? 0);
        if ($limit === 0) {
            $this->recordActivity($server, $options, 'backup_skipped_disabled', ['backup_limit' => 0]);

            return $this->result($type, self::STATUS_SKIPPED, self::SKIP_DISABLED);
        }

        $current = $this->countBackups((int) $server['id']);
        if ($current < $limit) {
            return null;
        }

        if (!$this->isFifoRolling($server)) {
            $this->recordActivity($server, $options, 'backup_skipped_limit', [
                'current_backups' => $current,
                'backup_limit' => $limit,
            ]);

            return $this->result($type, self::STATUS_SKIPPED, self::SKIP_LIMIT, null, null, null, [
                'current_backups' => $current,
                'backup_limit' => $limit,
            ]);
        }

        $evict = $this->evictOldestBackup($wings, $server);
        if ($evict !== null) {
            $this->recordActivity($server, $options, 'backup_skipped_fifo', [
                'current_backups' => $current,
                'backup_limit' => $limit,
                'error' => $evict['message'],
                'code' => $evict['code'],
            ]);

            return $this->result($type, self::STATUS_SKIPPED, self::SKIP_FIFO, null, null, null, [
                'error' => $evict['message'],
            ]);
        }

        return null;
    }

    /**
     * @param array{context?: string, name_prefix?: string} $options
     */
    private function backupName(array $options, string $suffix): string
    {
        $prefix = trim((string) ($options['name_prefix'] ?? 'Scheduled'));

        return $prefix . ' ' . $suffix . ' at ' . date('Y-m-d H:i:s');
    }

    /**
     * @param array<string, mixed> $server
     * @param array{context?: string, name_prefix?: string} $options
     * @param array<string, mixed> $metadata
     */
    private function recordActivity(array $server, array $options, string $event, array $metadata): void
    {
        if (!isset($server['id'], $server['node_id'])) {
            return;
        }

        $context = (string) ($options['context'] ?? 'schedule');
        $metadata[$context . '_triggered'] = true;
        $this->createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => $context . '_' . $event,
            'metadata' => json_encode($metadata),
        ]);
    }

    /**
     * @param array<string, mixed> $details
     */
    private function result(string $type, string $status, ?string $reason = null, ?string $uuid = null, ?int $id = null, ?string $name = null, array $details = []): array
    {
        return [
            'type' => $type,
            'status' => $status,
            'reason' => $reason,
            'backup_uuid' => $uuid,
            'backup_id' => $id,
            'name' => $name,
            'details' => $details,
        ];
    }
}
