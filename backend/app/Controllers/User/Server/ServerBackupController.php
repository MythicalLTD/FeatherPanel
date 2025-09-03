<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Node;
use App\Chat\Backup;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Helpers\ServerGateway;
use App\Services\Wings\Wings;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerBackupController
{
	/**
	 * Centralized check using ServerGateway with current request user.
	 */
	private function userCanAccessServer(Request $request, array $server): bool
	{
		$currentUser = $request->get('user');
		if (!$currentUser || !isset($currentUser['uuid'])) {
			return false;
		}

		return ServerGateway::canUserAccessServer($currentUser['uuid'], $server['uuid']);
	}

	/**
	 * Get all backups for a server.
	 *
	 * @param Request $request The HTTP request
	 * @param string $serverUuid The server UUID
	 *
	 * @return Response The HTTP response
	 */
	public function getBackups(Request $request, string $serverUuid): Response
	{
		// Get server info
		$server = Server::getServerByUuid($serverUuid);
		if (!$server) {
			return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
		}

		if (!$this->userCanAccessServer($request, $server)) {
			return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
		}

		// Get page and per_page from query parameters
		$page = max(1, (int) $request->query->get('page', 1));
		$perPage = max(1, min(100, (int) $request->query->get('per_page', 20)));

		// Get backups from database
		$backups = Backup::getBackupsByServerId($server['id']);
		if (empty($backups)) {
			$backups = [];
		}

		// Apply pagination manually since we're getting all backups
		$total = count($backups);
		$offset = ($page - 1) * $perPage;
		$paginatedBackups = array_slice($backups, $offset, $perPage);

		return ApiResponse::success([
			'data' => $paginatedBackups,
			'pagination' => [
				'current_page' => $page,
				'per_page' => $perPage,
				'total' => $total,
				'last_page' => ceil($total / $perPage),
				'from' => $offset + 1,
				'to' => min($offset + $perPage, $total),
			],
		]);
	}

	/**
	 * Get a specific backup.
	 *
	 * @param Request $request The HTTP request
	 * @param string $serverUuid The server UUID
	 * @param string $backupUuid The backup UUID
	 *
	 * @return Response The HTTP response
	 */
	public function getBackup(Request $request, string $serverUuid, string $backupUuid): Response
	{
		// Get server info
		$server = Server::getServerByUuid($serverUuid);
		if (!$server) {
			return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
		}

		if (!$this->userCanAccessServer($request, $server)) {
			return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
		}

		// Get backup info
		$backup = Backup::getBackupByUuid($backupUuid);
		if (!$backup) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		// Verify backup belongs to this server
		if ($backup['server_id'] != $server['id']) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		return ApiResponse::success($backup);
	}

	/**
	 * Create a new backup.
	 *
	 * @param Request $request The HTTP request
	 * @param string $serverUuid The server UUID
	 *
	 * @return Response The HTTP response
	 */
	public function createBackup(Request $request, string $serverUuid): Response
	{
		// Get server info
		$server = Server::getServerByUuid($serverUuid);
		if (!$server) {
			return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
		}

		if (!$this->userCanAccessServer($request, $server)) {
			return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
		}

		// Check backup limit
		$currentBackups = count(Backup::getBackupsByServerId($server['id']));
		$backupLimit = (int) ($server['backup_limit'] ?? 1);

		if ($currentBackups >= $backupLimit) {
			return ApiResponse::error('Backup limit reached', 'BACKUP_LIMIT_REACHED', 400);
		}

		// Parse request body
		$body = json_decode($request->getContent(), true);
		if (!$body) {
			return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
		}

		// Always use Wings adapter
		$adapter = 'wings';

		// Generate backup UUID if not provided
		$backupUuid = $body['uuid'] ?? $this->generateUuid();

		// Generate backup name if not provided
		$backupName = $body['name'] ?? 'Backup at ' . date('Y-m-d H:i:s');

		// Get ignore files
		$ignoredFiles = $body['ignore'] ?? '[]';

		// Create backup record in database
		$backupData = [
			'server_id' => $server['id'],
			'uuid' => $backupUuid,
			'name' => $backupName,
			'ignored_files' => $ignoredFiles,
			'disk' => 'wings', // Default to wings for now
			'is_successful' => 0,
			'is_locked' => 1, // Lock while backup is in progress
		];

		$backupId = Backup::createBackup($backupData);
		if (!$backupId) {
			return ApiResponse::error('Failed to create backup record', 'CREATION_FAILED', 500);
		}

		// Get node information
		$node = Node::getNodeById($server['node_id']);
		if (!$node) {
			return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
		}

		$scheme = $node['scheme'];
		$host = $node['fqdn'];
		$port = $node['daemonListen'];
		$token = $node['daemon_token'];

		$timeout = (int) 30;
		try {
			$wings = new Wings(
				$host,
				$port,
				$scheme,
				$token,
				$timeout
			);

			// Initiate backup on Wings
			$response = $wings->getServer()->createBackup($serverUuid, $adapter, $backupUuid, $ignoredFiles);

			if (!$response->isSuccessful()) {
				// Rollback database record
				Backup::deleteBackup($backupId);

				$error = $response->getError();
				if ($response->getStatusCode() === 400) {
					return ApiResponse::error('Invalid server configuration: ' . $error, 'INVALID_SERVER_CONFIG', 400);
				} elseif ($response->getStatusCode() === 401) {
					return ApiResponse::error('Unauthorized access to Wings daemon', 'WINGS_UNAUTHORIZED', 401);
				} elseif ($response->getStatusCode() === 403) {
					return ApiResponse::error('Forbidden access to Wings daemon', 'WINGS_FORBIDDEN', 403);
				} elseif ($response->getStatusCode() === 422) {
					return ApiResponse::error('Invalid server data: ' . $error, 'INVALID_SERVER_DATA', 422);
				}

				return ApiResponse::error('Failed to initiate backup on Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
			}
		} catch (\Exception $e) {
			// Rollback database record
			Backup::deleteBackup($backupId);
			App::getInstance(true)->getLogger()->error('Failed to initiate backup on Wings: ' . $e->getMessage());

			return ApiResponse::error('Failed to initiate backup on Wings: ' . $e->getMessage(), 'FAILED_TO_INITIATE_BACKUP_ON_WINGS', 500);
		}

		// Log activity
		ServerActivity::createActivity([
			'server_id' => $server['id'],
			'node_id' => $server['node_id'],
			'event' => 'backup_created',
			'metadata' => json_encode([
				'backup_uuid' => $backupUuid,
				'adapter' => $adapter,
				'backup_name' => $backupName,
			]),
		]);

		return ApiResponse::success([
			'id' => $backupId,
			'uuid' => $backupUuid,
			'name' => $backupName,
			'adapter' => $adapter,
		], 'Backup initiated successfully', 202);
	}

	/**
	 * Restore a backup.
	 *
	 * @param Request $request The HTTP request
	 * @param string $serverUuid The server UUID
	 * @param string $backupUuid The backup UUID
	 *
	 * @return Response The HTTP response
	 */
	public function restoreBackup(Request $request, string $serverUuid, string $backupUuid): Response
	{
		// Get server info
		$server = Server::getServerByUuid($serverUuid);
		if (!$server) {
			return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
		}

		// Get backup info
		$backup = Backup::getBackupByUuid($backupUuid);
		if (!$backup) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		// Verify backup belongs to this server
		if ($backup['server_id'] != $server['id']) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		// Check if backup is locked
		if ($backup['is_locked'] == 1) {
			return ApiResponse::error('Backup is currently locked. Please unlock it first.', 'BACKUP_LOCKED', 423);
		}

		// Parse request body
		$body = json_decode($request->getContent(), true);
		if (!$body) {
			return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
		}

		// Always use Wings adapter
		$adapter = 'wings';

		$truncateDirectory = $body['truncate_directory'] ?? false;
		$downloadUrl = $body['download_url'] ?? null;

		// Get node information
		$node = Node::getNodeById($server['node_id']);
		if (!$node) {
			return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
		}

		$scheme = $node['scheme'];
		$host = $node['fqdn'];
		$port = $node['daemonListen'];
		$token = $node['daemon_token'];

		$timeout = (int) 30;
		try {
			$wings = new Wings(
				$host,
				$port,
				$scheme,
				$token,
				$timeout
			);

			// Initiate restore on Wings
			$response = $wings->getServer()->restoreBackup($serverUuid, $backupUuid, $adapter, $truncateDirectory, $downloadUrl);

			if (!$response->isSuccessful()) {
				$error = $response->getError();
				if ($response->getStatusCode() === 400) {
					return ApiResponse::error('Invalid server configuration: ' . $error, 'INVALID_SERVER_CONFIG', 400);
				} elseif ($response->getStatusCode() === 401) {
					return ApiResponse::error('Unauthorized access to Wings daemon', 'WINGS_UNAUTHORIZED', 401);
				} elseif ($response->getStatusCode() === 403) {
					return ApiResponse::error('Forbidden access to Wings daemon', 'WINGS_FORBIDDEN', 403);
				} elseif ($response->getStatusCode() === 422) {
					return ApiResponse::error('Invalid server data: ' . $error, 'INVALID_SERVER_DATA', 422);
				}

				return ApiResponse::error('Failed to initiate restore on Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
			}
		} catch (\Exception $e) {
			App::getInstance(true)->getLogger()->error('Failed to initiate restore on Wings: ' . $e->getMessage());

			return ApiResponse::error('Failed to initiate restore on Wings: ' . $e->getMessage(), 'FAILED_TO_INITIATE_RESTORE_ON_WINGS', 500);
		}

		// Log activity
		ServerActivity::createActivity([
			'server_id' => $server['id'],
			'node_id' => $server['node_id'],
			'event' => 'backup_restored',
			'metadata' => json_encode([
				'backup_uuid' => $backupUuid,
				'adapter' => $adapter,
				'truncate_directory' => $truncateDirectory,
			]),
		]);

		return ApiResponse::success(null, 'Backup restoration initiated successfully', 202);
	}

	/**
	 * Lock a backup to prevent deletion and restoration.
	 *
	 * @param Request $request The HTTP request
	 * @param string $serverUuid The server UUID
	 * @param string $backupUuid The backup UUID
	 *
	 * @return Response The HTTP response
	 */
	public function lockBackup(Request $request, string $serverUuid, string $backupUuid): Response
	{
		// Get server info
		$server = Server::getServerByUuid($serverUuid);
		if (!$server) {
			return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
		}

		if (!$this->userCanAccessServer($request, $server)) {
			return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
		}

		// Get backup info
		$backup = Backup::getBackupByUuid($backupUuid);
		if (!$backup) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		// Verify backup belongs to this server
		if ($backup['server_id'] != $server['id']) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		// Update backup to locked status
		if (!Backup::updateBackup($backup['id'], ['is_locked' => 1])) {
			return ApiResponse::error('Failed to lock backup', 'LOCK_FAILED', 500);
		}

		// Log activity
		ServerActivity::createActivity([
			'server_id' => $server['id'],
			'node_id' => $server['node_id'],
			'event' => 'backup_locked',
			'metadata' => json_encode([
				'backup_uuid' => $backupUuid,
				'backup_name' => $backup['name'],
			]),
		]);

		return ApiResponse::success(null, 'Backup locked successfully', 200);
	}

	/**
	 * Unlock a backup to allow deletion and restoration.
	 *
	 * @param Request $request The HTTP request
	 * @param string $serverUuid The server UUID
	 * @param string $backupUuid The backup UUID
	 *
	 * @return Response The HTTP response
	 */
	public function unlockBackup(Request $request, string $serverUuid, string $backupUuid): Response
	{
		// Get server info
		$server = Server::getServerByUuid($serverUuid);
		if (!$server) {
			return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
		}

		if (!$this->userCanAccessServer($request, $server)) {
			return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
		}

		// Get backup info
		$backup = Backup::getBackupByUuid($backupUuid);
		if (!$backup) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		// Verify backup belongs to this server
		if ($backup['server_id'] != $server['id']) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		// Update backup to unlocked status
		if (!Backup::updateBackup($backup['id'], ['is_locked' => 0])) {
			return ApiResponse::error('Failed to unlock backup', 'UNLOCK_FAILED', 500);
		}

		// Log activity
		ServerActivity::createActivity([
			'server_id' => $server['id'],
			'node_id' => $server['node_id'],
			'event' => 'backup_unlocked',
			'metadata' => json_encode([
				'backup_uuid' => $backupUuid,
				'backup_name' => $backup['name'],
			]),
		]);

		return ApiResponse::success(null, 'Backup unlocked successfully', 200);
	}

	/**
	 * Delete a backup.
	 *
	 * @param Request $request The HTTP request
	 * @param string $serverUuid The server UUID
	 * @param string $backupUuid The backup UUID
	 *
	 * @return Response The HTTP response
	 */
	public function deleteBackup(Request $request, string $serverUuid, string $backupUuid): Response
	{
		// Get server info
		$server = Server::getServerByUuid($serverUuid);
		if (!$server) {
			return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
		}

		// Get backup info
		$backup = Backup::getBackupByUuid($backupUuid);
		if (!$backup) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		// Verify backup belongs to this server
		if ($backup['server_id'] != $server['id']) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		// Check if backup is locked
		if ($backup['is_locked'] == 1) {
			return ApiResponse::error('Backup is currently locked. Please unlock it first.', 'BACKUP_LOCKED', 423);
		}

		// Get node information
		$node = Node::getNodeById($server['node_id']);
		if (!$node) {
			return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
		}

		$scheme = $node['scheme'];
		$host = $node['fqdn'];
		$port = $node['daemonListen'];
		$token = $node['daemon_token'];

		$timeout = (int) 30;
		try {
			$wings = new Wings(
				$host,
				$port,
				$scheme,
				$token,
				$timeout
			);

			// Delete backup on Wings
			$response = $wings->getServer()->deleteBackup($serverUuid, $backupUuid);

			if (!$response->isSuccessful()) {
				$error = $response->getError();
				if ($response->getStatusCode() === 400) {
					return ApiResponse::error('Invalid server configuration: ' . $error, 'INVALID_SERVER_CONFIG', 400);
				} elseif ($response->getStatusCode() === 401) {
					return ApiResponse::error('Unauthorized access to Wings daemon', 'WINGS_UNAUTHORIZED', 401);
				} elseif ($response->getStatusCode() === 403) {
					return ApiResponse::error('Forbidden access to Wings daemon', 'WINGS_FORBIDDEN', 403);
				} elseif ($response->getStatusCode() === 422) {
					return ApiResponse::error('Invalid server data: ' . $error, 'INVALID_SERVER_DATA', 422);
				}

				return ApiResponse::error('Failed to delete backup on Wings: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
			}
		} catch (\Exception $e) {
			App::getInstance(true)->getLogger()->error('Failed to delete backup on Wings: ' . $e->getMessage());

			return ApiResponse::error('Failed to delete backup on Wings: ' . $e->getMessage(), 'FAILED_TO_DELETE_BACKUP_ON_WINGS', 500);
		}

		// Delete backup record from database
		if (!Backup::deleteBackup($backup['id'])) {
			return ApiResponse::error('Failed to delete backup record', 'DELETION_FAILED', 500);
		}

		// Log activity
		ServerActivity::createActivity([
			'server_id' => $server['id'],
			'node_id' => $server['node_id'],
			'event' => 'backup_deleted',
			'metadata' => json_encode([
				'backup_uuid' => $backupUuid,
				'backup_name' => $backup['name'],
			]),
		]);

		return ApiResponse::success(null, 'Backup deleted successfully');
	}

	/**
	 * Get backup download URL.
	 *
	 * @param Request $request The HTTP request
	 * @param string $serverUuid The server UUID
	 * @param string $backupUuid The backup UUID
	 *
	 * @return Response The HTTP response
	 */
	public function getBackupDownloadUrl(Request $request, string $serverUuid, string $backupUuid): Response
	{
		// Get server info
		$server = Server::getServerByUuid($serverUuid);
		if (!$server) {
			return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
		}

		// TODO: Add user permission check here
		// if (!$this->userCanAccessServer($request, $server)) {
		//     return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
		// }

		// Get backup info
		$backup = Backup::getBackupByUuid($backupUuid);
		if (!$backup) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		// Verify backup belongs to this server
		if ($backup['server_id'] != $server['id']) {
			return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
		}

		// Get node info
		$node = Node::getNodeById($server['node_id']);
		if (!$node) {
			return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
		}

		// Get authenticated user for permissions
		$user = $request->get('user');
		if (!$user) {
			return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
		}

		try {
			$scheme = $node['scheme'];
			$host = $node['fqdn'];
			$port = $node['daemonListen'];
			$token = $node['daemon_token'];

			// Create JWT service instance
			$jwtService = new \App\Services\Wings\Services\JwtService(
				$token, // Node secret
				App::getInstance(true)->getConfig()->getSetting(\App\Config\ConfigInterface::APP_URL, 'https://devsv.mythical.systems'), // Panel URL
				$scheme . '://' . $host . ':' . $port // Wings URL
			);

			// Get user permissions (you'll need to implement this based on your permission system)
			$permissions = ['backup.download']; // Basic backup download permission

			// Generate backup download token
			$jwtToken = $jwtService->generateBackupToken(
				$serverUuid,
				$user['uuid'],
				$permissions,
				$backupUuid,
				'download'
			);

			// Construct the download URL
			$baseUrl = rtrim($scheme . '://' . $host . ':' . $port, '/');
			$downloadUrl = "{$baseUrl}/download/backup?token={$jwtToken}&server={$serverUuid}&backup={$backupUuid}";

			return ApiResponse::success([
				'download_url' => $downloadUrl,
				'expires_in' => 300, // 5 minutes
			]);
		} catch (\Exception $e) {
			return ApiResponse::error('Failed to generate download URL: ' . $e->getMessage(), 'DOWNLOAD_URL_GENERATION_FAILED', 500);
		}
	}

	/**
	 * Generate a UUID v4.
	 *
	 * @return string The generated UUID
	 */
	private function generateUuid(): string
	{
		return sprintf(
			'%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
			mt_rand(0, 0xFFFF),
			mt_rand(0, 0xFFFF),
			mt_rand(0, 0xFFFF),
			mt_rand(0, 0x0FFF) | 0x4000,
			mt_rand(0, 0x3FFF) | 0x8000,
			mt_rand(0, 0xFFFF),
			mt_rand(0, 0xFFFF),
			mt_rand(0, 0xFFFF)
		);
	}
}
