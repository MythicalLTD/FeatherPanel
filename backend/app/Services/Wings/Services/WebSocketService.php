<?php

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsConnection;

/**
 * WebSocket Service for Wings API
 * 
 * Handles all WebSocket-related functionality including:
 * - WebSocket token generation
 * - WebSocket URL generation
 * - WebSocket connection management
 */
class WebSocketService
{
	private WingsConnection $connection;

	/**
	 * Create a new WebSocketService instance
	 * 
	 * @param WingsConnection $connection
	 */
	public function __construct(WingsConnection $connection)
	{
		$this->connection = $connection;
	}

	/**
	 * Generate WebSocket token
	 * 
	 * @param string $serverUuid
	 * @param string $userUuid
	 * @param array $permissions
	 * @return string
	 */
	public function generateWebSocketToken(string $serverUuid, string $userUuid, array $permissions = []): string
	{
		$tokenGenerator = $this->connection->getTokenGenerator();
		return $tokenGenerator->generateWebSocketToken($serverUuid, $userUuid, $permissions);
	}

	/**
	 * Generate WebSocket URL
	 * 
	 * @param string $serverUuid
	 * @param string $userUuid
	 * @param array $permissions
	 * @return string
	 */
	public function generateWebSocketUrl(string $serverUuid, string $userUuid, array $permissions = []): string
	{
		$tokenGenerator = $this->connection->getTokenGenerator();
		$baseUrl = $this->connection->getBaseUrl();

		return $tokenGenerator->generateWebSocketUrl($baseUrl, $serverUuid, $userUuid, $permissions);
	}

	/**
	 * Deny WebSocket tokens for a server
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function denyWebSocketTokens(string $serverUuid): array
	{
		return $this->connection->post("/api/servers/{$serverUuid}/ws/deny");
	}

	/**
	 * Get WebSocket connection status
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getWebSocketStatus(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/ws");
	}

	/**
	 * Check if WebSocket is connected
	 * 
	 * @param string $serverUuid
	 * @return bool
	 */
	public function isWebSocketConnected(string $serverUuid): bool
	{
		try {
			$status = $this->getWebSocketStatus($serverUuid);
			return $status['connected'] ?? false;
		} catch (\Exception $e) {
			return false;
		}
	}

	/**
	 * Get WebSocket connection count
	 * 
	 * @param string $serverUuid
	 * @return int
	 */
	public function getWebSocketConnectionCount(string $serverUuid): int
	{
		try {
			$status = $this->getWebSocketStatus($serverUuid);
			return $status['connections'] ?? 0;
		} catch (\Exception $e) {
			return 0;
		}
	}

	/**
	 * Get WebSocket permissions for a user
	 * 
	 * @param string $serverUuid
	 * @param string $userUuid
	 * @return array
	 */
	public function getWebSocketPermissions(string $serverUuid, string $userUuid): array
	{
		try {
			$status = $this->getWebSocketStatus($serverUuid);
			return $status['permissions'][$userUuid] ?? [];
		} catch (\Exception $e) {
			return [];
		}
	}

	/**
	 * Check if user has WebSocket permission
	 * 
	 * @param string $serverUuid
	 * @param string $userUuid
	 * @param string $permission
	 * @return bool
	 */
	public function hasWebSocketPermission(string $serverUuid, string $userUuid, string $permission): bool
	{
		$permissions = $this->getWebSocketPermissions($serverUuid, $userUuid);
		return in_array($permission, $permissions);
	}

	/**
	 * Check if user has console permission
	 * 
	 * @param string $serverUuid
	 * @param string $userUuid
	 * @return bool
	 */
	public function hasConsolePermission(string $serverUuid, string $userUuid): bool
	{
		return $this->hasWebSocketPermission($serverUuid, $userUuid, 'console');
	}

	/**
	 * Check if user has files permission
	 * 
	 * @param string $serverUuid
	 * @param string $userUuid
	 * @return bool
	 */
	public function hasFilesPermission(string $serverUuid, string $userUuid): bool
	{
		return $this->hasWebSocketPermission($serverUuid, $userUuid, 'files');
	}

	/**
	 * Check if user has admin permission
	 * 
	 * @param string $serverUuid
	 * @param string $userUuid
	 * @return bool
	 */
	public function hasAdminPermission(string $serverUuid, string $userUuid): bool
	{
		return $this->hasWebSocketPermission($serverUuid, $userUuid, 'admin');
	}

	/**
	 * Get WebSocket events
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getWebSocketEvents(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/ws/events");
	}

	/**
	 * Get WebSocket logs
	 * 
	 * @param string $serverUuid
	 * @param int $lines Number of lines to get (default: 100)
	 * @return array
	 */
	public function getWebSocketLogs(string $serverUuid, int $lines = 100): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/ws/logs?lines={$lines}");
	}

	/**
	 * Get WebSocket statistics
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getWebSocketStats(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/ws/stats");
	}

	/**
	 * Get WebSocket memory usage
	 * 
	 * @param string $serverUuid
	 * @return int
	 */
	public function getWebSocketMemoryUsage(string $serverUuid): int
	{
		try {
			$stats = $this->getWebSocketStats($serverUuid);
			return $stats['memory'] ?? 0;
		} catch (\Exception $e) {
			return 0;
		}
	}

	/**
	 * Get WebSocket CPU usage
	 * 
	 * @param string $serverUuid
	 * @return float
	 */
	public function getWebSocketCpuUsage(string $serverUuid): float
	{
		try {
			$stats = $this->getWebSocketStats($serverUuid);
			return $stats['cpu'] ?? 0.0;
		} catch (\Exception $e) {
			return 0.0;
		}
	}

	/**
	 * Get WebSocket uptime
	 * 
	 * @param string $serverUuid
	 * @return int
	 */
	public function getWebSocketUptime(string $serverUuid): int
	{
		try {
			$stats = $this->getWebSocketStats($serverUuid);
			return $stats['uptime'] ?? 0;
		} catch (\Exception $e) {
			return 0;
		}
	}

	/**
	 * Get WebSocket message count
	 * 
	 * @param string $serverUuid
	 * @return int
	 */
	public function getWebSocketMessageCount(string $serverUuid): int
	{
		try {
			$stats = $this->getWebSocketStats($serverUuid);
			return $stats['messages'] ?? 0;
		} catch (\Exception $e) {
			return 0;
		}
	}

	/**
	 * Get WebSocket error count
	 * 
	 * @param string $serverUuid
	 * @return int
	 */
	public function getWebSocketErrorCount(string $serverUuid): int
	{
		try {
			$stats = $this->getWebSocketStats($serverUuid);
			return $stats['errors'] ?? 0;
		} catch (\Exception $e) {
			return 0;
		}
	}
}