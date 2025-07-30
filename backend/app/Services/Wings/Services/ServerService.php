<?php

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsConnection;

/**
 * Server Service for Wings API
 * 
 * Handles all server-related API endpoints including:
 * - Server management (create, delete, list)
 * - Server power operations (start, stop, restart, kill)
 * - Server logs and console
 * - Server configuration
 */
class ServerService
{
	private WingsConnection $connection;

	/**
	 * Create a new ServerService instance
	 * 
	 * @param WingsConnection $connection
	 */
	public function __construct(WingsConnection $connection)
	{
		$this->connection = $connection;
	}

	/**
	 * Get all servers
	 * 
	 * @return array
	 */
	public function getAllServers(): array
	{
		return $this->connection->get('/api/servers');
	}

	/**
	 * Get a specific server by UUID
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServer(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}");
	}

	/**
	 * Create a new server
	 * 
	 * @param array $serverData
	 * @return array
	 */
	public function createServer(array $serverData): array
	{
		return $this->connection->post('/api/servers', $serverData);
	}

	/**
	 * Delete a server
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function deleteServer(string $serverUuid): array
	{
		return $this->connection->delete("/api/servers/{$serverUuid}");
	}

	/**
	 * Start a server
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function startServer(string $serverUuid): array
	{
		return $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'start']);
	}

	/**
	 * Stop a server
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function stopServer(string $serverUuid): array
	{
		return $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'stop']);
	}

	/**
	 * Restart a server
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function restartServer(string $serverUuid): array
	{
		return $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'restart']);
	}

	/**
	 * Kill a server
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function killServer(string $serverUuid): array
	{
		return $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'kill']);
	}

	/**
	 * Get server logs
	 * 
	 * @param string $serverUuid
	 * @param int $lines Number of lines to get (default: 100)
	 * @return array
	 */
	public function getServerLogs(string $serverUuid, int $lines = 100): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/logs?lines={$lines}");
	}

	/**
	 * Get server console logs
	 * 
	 * @param string $serverUuid
	 * @param int $lines Number of lines to get (default: 100)
	 * @return array
	 */
	public function getServerConsoleLogs(string $serverUuid, int $lines = 100): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/logs/console?lines={$lines}");
	}

	/**
	 * Send command to server console
	 * 
	 * @param string $serverUuid
	 * @param string $command
	 * @return array
	 */
	public function sendCommand(string $serverUuid, string $command): array
	{
		return $this->connection->post("/api/servers/{$serverUuid}/console", ['command' => $command]);
	}

	/**
	 * Get server status
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServerStatus(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/status");
	}

	/**
	 * Get server resources (CPU, memory, disk)
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServerResources(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/resources");
	}

	/**
	 * Get server configuration
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServerConfig(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/config");
	}

	/**
	 * Update server configuration
	 * 
	 * @param string $serverUuid
	 * @param array $config
	 * @return array
	 */
	public function updateServerConfig(string $serverUuid, array $config): array
	{
		return $this->connection->put("/api/servers/{$serverUuid}/config", $config);
	}

	/**
	 * Install server
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function installServer(string $serverUuid): array
	{
		return $this->connection->post("/api/servers/{$serverUuid}/install");
	}

	/**
	 * Reinstall server
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function reinstallServer(string $serverUuid): array
	{
		return $this->connection->post("/api/servers/{$serverUuid}/reinstall");
	}

	/**
	 * Get server startup logs
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServerStartupLogs(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/logs/startup");
	}

	/**
	 * Get server error logs
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServerErrorLogs(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/logs/error");
	}

	/**
	 * Get server access logs
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServerAccessLogs(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/logs/access");
	}

	/**
	 * Get server performance data
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServerPerformance(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/performance");
	}

	/**
	 * Get server network information
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServerNetwork(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/network");
	}

	/**
	 * Get server environment variables
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServerEnvironment(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/environment");
	}

	/**
	 * Update server environment variables
	 * 
	 * @param string $serverUuid
	 * @param array $environment
	 * @return array
	 */
	public function updateServerEnvironment(string $serverUuid, array $environment): array
	{
		return $this->connection->put("/api/servers/{$serverUuid}/environment", $environment);
	}

	/**
	 * Get server startup parameters
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServerStartup(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/startup");
	}

	/**
	 * Update server startup parameters
	 * 
	 * @param string $serverUuid
	 * @param array $startup
	 * @return array
	 */
	public function updateServerStartup(string $serverUuid, array $startup): array
	{
		return $this->connection->put("/api/servers/{$serverUuid}/startup", $startup);
	}

	/**
	 * Get server variables
	 * 
	 * @param string $serverUuid
	 * @return array
	 */
	public function getServerVariables(string $serverUuid): array
	{
		return $this->connection->get("/api/servers/{$serverUuid}/variables");
	}

	/**
	 * Update server variables
	 * 
	 * @param string $serverUuid
	 * @param array $variables
	 * @return array
	 */
	public function updateServerVariables(string $serverUuid, array $variables): array
	{
		return $this->connection->put("/api/servers/{$serverUuid}/variables", $variables);
	}
}