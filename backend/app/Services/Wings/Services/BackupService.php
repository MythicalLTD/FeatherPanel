<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsConnection;

/**
 * Backup Service for Wings API.
 *
 * Handles all backup-related API endpoints including:
 * - Backup creation and management
 * - Backup restoration
 * - Backup listing and information
 * - Backup download URLs
 */
class BackupService
{
    private WingsConnection $connection;

    /**
     * Create a new BackupService instance.
     */
    public function __construct(WingsConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * Get all backups for a server.
     */
    public function getAllBackups(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/backups");
    }

    /**
     * Get a specific backup.
     */
    public function getBackup(string $serverUuid, string $backupUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/backups/{$backupUuid}");
    }

    /**
     * Create a new backup.
     */
    public function createBackup(string $serverUuid, array $backupData = []): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/backups", $backupData);
    }

    /**
     * Delete a backup.
     */
    public function deleteBackup(string $serverUuid, string $backupUuid): array
    {
        return $this->connection->delete("/api/servers/{$serverUuid}/backups/{$backupUuid}");
    }

    /**
     * Restore a backup.
     */
    public function restoreBackup(string $serverUuid, string $backupUuid, array $restoreData = []): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/backups/{$backupUuid}/restore", $restoreData);
    }

    /**
     * Get backup download URL.
     */
    public function getBackupDownloadUrl(string $serverUuid, string $backupUuid): string
    {
        $tokenGenerator = $this->connection->getTokenGenerator();
        $baseUrl = $this->connection->getBaseUrl();

        return $tokenGenerator->generateBackupDownloadUrl($baseUrl, $serverUuid, $backupUuid);
    }

    /**
     * Get backup download token.
     */
    public function getBackupDownloadToken(string $serverUuid, string $backupUuid): string
    {
        $tokenGenerator = $this->connection->getTokenGenerator();

        return $tokenGenerator->generateBackupDownloadToken($serverUuid, $backupUuid);
    }

    /**
     * Get backup logs.
     */
    public function getBackupLogs(string $serverUuid, string $backupUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/backups/{$backupUuid}/logs");
    }

    /**
     * Get backup size.
     */
    public function getBackupSize(string $serverUuid, string $backupUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/backups/{$backupUuid}/size");
    }

    /**
     * Get backup information.
     */
    public function getBackupInfo(string $serverUuid, string $backupUuid): array
    {
        return $this->getBackup($serverUuid, $backupUuid);
    }

    /**
     * Check if backup exists.
     */
    public function backupExists(string $serverUuid, string $backupUuid): bool
    {
        try {
            $this->getBackup($serverUuid, $backupUuid);

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get backup status.
     */
    public function getBackupStatus(string $serverUuid, string $backupUuid): string
    {
        $backup = $this->getBackup($serverUuid, $backupUuid);

        return $backup['status'] ?? 'unknown';
    }

    /**
     * Check if backup is completed.
     */
    public function isBackupCompleted(string $serverUuid, string $backupUuid): bool
    {
        return $this->getBackupStatus($serverUuid, $backupUuid) === 'completed';
    }

    /**
     * Check if backup is failed.
     */
    public function isBackupFailed(string $serverUuid, string $backupUuid): bool
    {
        return $this->getBackupStatus($serverUuid, $backupUuid) === 'failed';
    }

    /**
     * Check if backup is in progress.
     */
    public function isBackupInProgress(string $serverUuid, string $backupUuid): bool
    {
        return $this->getBackupStatus($serverUuid, $backupUuid) === 'in_progress';
    }

    /**
     * Get backup creation date.
     */
    public function getBackupCreatedAt(string $serverUuid, string $backupUuid): string
    {
        $backup = $this->getBackup($serverUuid, $backupUuid);

        return $backup['created_at'] ?? '';
    }

    /**
     * Get backup completion date.
     */
    public function getBackupCompletedAt(string $serverUuid, string $backupUuid): string
    {
        $backup = $this->getBackup($serverUuid, $backupUuid);

        return $backup['completed_at'] ?? '';
    }

    /**
     * Get backup name.
     */
    public function getBackupName(string $serverUuid, string $backupUuid): string
    {
        $backup = $this->getBackup($serverUuid, $backupUuid);

        return $backup['name'] ?? '';
    }

    /**
     * Get backup description.
     */
    public function getBackupDescription(string $serverUuid, string $backupUuid): string
    {
        $backup = $this->getBackup($serverUuid, $backupUuid);

        return $backup['description'] ?? '';
    }

    /**
     * Get backup size in bytes.
     */
    public function getBackupSizeBytes(string $serverUuid, string $backupUuid): int
    {
        $size = $this->getBackupSize($serverUuid, $backupUuid);

        return $size['size'] ?? 0;
    }

    /**
     * Get backup size in MB.
     */
    public function getBackupSizeMB(string $serverUuid, string $backupUuid): float
    {
        $bytes = $this->getBackupSizeBytes($serverUuid, $backupUuid);

        return round($bytes / 1024 / 1024, 2);
    }

    /**
     * Get backup size in GB.
     */
    public function getBackupSizeGB(string $serverUuid, string $backupUuid): float
    {
        $bytes = $this->getBackupSizeBytes($serverUuid, $backupUuid);

        return round($bytes / 1024 / 1024 / 1024, 2);
    }

    /**
     * Get completed backups.
     */
    public function getCompletedBackups(string $serverUuid): array
    {
        $backups = $this->getAllBackups($serverUuid);

        return array_filter($backups, function ($backup) {
            return $backup['status'] === 'completed';
        });
    }

    /**
     * Get failed backups.
     */
    public function getFailedBackups(string $serverUuid): array
    {
        $backups = $this->getAllBackups($serverUuid);

        return array_filter($backups, function ($backup) {
            return $backup['status'] === 'failed';
        });
    }

    /**
     * Get in-progress backups.
     */
    public function getInProgressBackups(string $serverUuid): array
    {
        $backups = $this->getAllBackups($serverUuid);

        return array_filter($backups, function ($backup) {
            return $backup['status'] === 'in_progress';
        });
    }
}
