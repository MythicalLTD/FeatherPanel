<?php

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsConnection;

/**
 * Backup Service for Wings API
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
	 * Create a new BackupService instance
	 * 
	 * @param WingsConnection $connection
	 */
	public function __construct(WingsConnection $connection)
	{
		$this->connection = $connection;
	}

	/**
	 * Get all backups for a server
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getAllBackups(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/backups");
	}

	/**
	 * Get a specific backup
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return array
	 */
	public function getBackup(string $serverUuid, string $backupUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/backups/{$backupUuid}");
	}

	/**
	 * Create a new backup
	 * 
	 * @param string $serverUuid
	 * @param array $backupData
	 * @return array
	 */
	public function createBackup(string $serverUuid, array $backupData = []): array
	{
		return $this->connection->post("/api/servers/{$serverUuid}/backups", $backupData);
	}

	/**
	 * Delete a backup
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return array
	 */
	public function deleteBackup(string $serverUuid, string $backupUuid): array
	{
		return $this->connection->delete("/api/servers/{$serverUuid}/backups/{$backupUuid}");
	}

	/**
	 * Restore a backup
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @param array $restoreData
	 * @return array
	 */
	public function restoreBackup(string $serverUuid, string $backupUuid, array $restoreData = []): array
	{
		return $this->connection->post("/api/servers/{$serverUuid}/backups/{$backupUuid}/restore", $restoreData);
	}

	/**
	 * Get backup download URL
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return string
	 */
	public function getBackupDownloadUrl(string $serverUuid, string $backupUuid): string
	{
		$tokenGenerator = $this->connection->getTokenGenerator();
		$baseUrl = $this->connection->getBaseUrl();

		return $tokenGenerator->generateBackupDownloadUrl($baseUrl, $serverUuid, $backupUuid);
	}

	/**
	 * Get backup download token
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return string
	 */
	public function getBackupDownloadToken(string $serverUuid, string $backupUuid): string
	{
		$tokenGenerator = $this->connection->getTokenGenerator();
		return $tokenGenerator->generateBackupDownloadToken($serverUuid, $backupUuid);
	}

	/**
	 * Get backup logs
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return array
	 */
	public function getBackupLogs(string $serverUuid, string $backupUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/backups/{$backupUuid}/logs");
	}

	/**
	 * Get backup size
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return array
	 */
	public function getBackupSize(string $serverUuid, string $backupUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/backups/{$backupUuid}/size");
	}

	/**
	 * Get backup information
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return array
	 */
	public function getBackupInfo(string $serverUuid, string $backupUuid): array
	{
		return $this->getBackup($serverUuid, $backupUuid);
	}

	/**
	 * Check if backup exists
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return bool
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
	 * Get backup status
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return string
	 */
	public function getBackupStatus(string $serverUuid, string $backupUuid): string
	{
		$backup = $this->getBackup($serverUuid, $backupUuid);
		return $backup['status'] ?? 'unknown';
	}

	/**
	 * Check if backup is completed
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return bool
	 */
	public function isBackupCompleted(string $serverUuid, string $backupUuid): bool
	{
		return $this->getBackupStatus($serverUuid, $backupUuid) === 'completed';
	}

	/**
	 * Check if backup is failed
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return bool
	 */
	public function isBackupFailed(string $serverUuid, string $backupUuid): bool
	{
		return $this->getBackupStatus($serverUuid, $backupUuid) === 'failed';
	}

	/**
	 * Check if backup is in progress
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return bool
	 */
	public function isBackupInProgress(string $serverUuid, string $backupUuid): bool
	{
		return $this->getBackupStatus($serverUuid, $backupUuid) === 'in_progress';
	}

	/**
	 * Get backup creation date
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return string
	 */
	public function getBackupCreatedAt(string $serverUuid, string $backupUuid): string
	{
		$backup = $this->getBackup($serverUuid, $backupUuid);
		return $backup['created_at'] ?? '';
	}

	/**
	 * Get backup completion date
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return string
	 */
	public function getBackupCompletedAt(string $serverUuid, string $backupUuid): string
	{
		$backup = $this->getBackup($serverUuid, $backupUuid);
		return $backup['completed_at'] ?? '';
	}

	/**
	 * Get backup name
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return string
	 */
	public function getBackupName(string $serverUuid, string $backupUuid): string
	{
		$backup = $this->getBackup($serverUuid, $backupUuid);
		return $backup['name'] ?? '';
	}

	/**
	 * Get backup description
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return string
	 */
	public function getBackupDescription(string $serverUuid, string $backupUuid): string
	{
		$backup = $this->getBackup($serverUuid, $backupUuid);
		return $backup['description'] ?? '';
	}

	/**
	 * Get backup size in bytes
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return int
	 */
	public function getBackupSizeBytes(string $serverUuid, string $backupUuid): int
	{
		$size = $this->getBackupSize($serverUuid, $backupUuid);
		return $size['size'] ?? 0;
	}

	/**
	 * Get backup size in MB
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return float
	 */
	public function getBackupSizeMB(string $serverUuid, string $backupUuid): float
	{
		$bytes = $this->getBackupSizeBytes($serverUuid, $backupUuid);
		return round($bytes / 1024 / 1024, 2);
	}

	/**
	 * Get backup size in GB
	 * 
	 * @param string $serverUuid
	 * @param string $backupUuid
	 * @return float
	 */
	public function getBackupSizeGB(string $serverUuid, string $backupUuid): float
	{
		$bytes = $this->getBackupSizeBytes($serverUuid, $backupUuid);
		return round($bytes / 1024 / 1024 / 1024, 2);
	}

	/**
	 * Get completed backups
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getCompletedBackups(string $serverUuid): array
	{
		$backups = $this->getAllBackups($serverUuid);
		return array_filter($backups, function ($backup) {
			return $backup['status'] === 'completed';
		});
	}

	/**
	 * Get failed backups
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getFailedBackups(string $serverUuid): array
	{
		$backups = $this->getAllBackups($serverUuid);
		return array_filter($backups, function ($backup) {
			return $backup['status'] === 'failed';
		});
	}

	/**
	 * Get in-progress backups
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getInProgressBackups(string $serverUuid): array
	{
		$backups = $this->getAllBackups($serverUuid);
		return array_filter($backups, function ($backup) {
			return $backup['status'] === 'in_progress';
		});
	}
}