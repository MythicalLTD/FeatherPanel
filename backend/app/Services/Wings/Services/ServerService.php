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

use App\Services\Wings\WingsResponse;
use App\Services\Wings\WingsConnection;

/**
 * Server Service for Wings API.
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
	 * Create a new ServerService instance.
	 */
	public function __construct(WingsConnection $connection)
	{
		$this->connection = $connection;
	}

	/**
	 * Get all servers.
	 */
	public function getAllServers(): WingsResponse
	{
		try {
			$response = $this->connection->get('/api/servers');
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get a specific server by UUID.
	 */
		public function getServer(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Create a new server.
	 */
	public function createServer(array $serverData): WingsResponse
	{
		try {
			$response = $this->connection->post('/api/servers', $serverData);

			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Delete a server.
	 */
	public function deleteServer(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->delete("/api/servers/{$serverUuid}");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Start a server.
	 */
	public function startServer(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'start']);
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Stop a server.
	 */
	public function stopServer(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'stop']);
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Restart a server.
	 */
	public function restartServer(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'restart']);
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Kill a server.
	 */
	public function killServer(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'kill']);
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server logs.
	 *
	 * @param int $lines Number of lines to get (default: 100)
	 */
	public function getServerLogs(string $serverUuid, int $lines = 100): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/logs?lines={$lines}");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server console logs.
	 *
	 * @param int $lines Number of lines to get (default: 100)
	 */
	public function getServerConsoleLogs(string $serverUuid, int $lines = 100): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/logs/console?lines={$lines}");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Send command to server console.
	 */
	public function sendCommand(string $serverUuid, string $command): WingsResponse
	{
		try {
			$response = $this->connection->post("/api/servers/{$serverUuid}/console", ['command' => $command]);
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server status.
	 */
	public function getServerStatus(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/status");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server resources (CPU, memory, disk).
	 */
	public function getServerResources(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/resources");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server configuration.
	 */
	public function getServerConfig(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/config");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Update server configuration.
	 */
	public function updateServerConfig(string $serverUuid, array $config): WingsResponse
	{
		try {
			$response = $this->connection->put("/api/servers/{$serverUuid}/config", $config);
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Install server.
	 */
	public function installServer(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->post("/api/servers/{$serverUuid}/install");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Reinstall server.
	 */
	public function reinstallServer(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->post("/api/servers/{$serverUuid}/reinstall");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server startup logs.
	 */
	public function getServerStartupLogs(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/logs/startup");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server error logs.
	 */
	public function getServerErrorLogs(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/logs/error");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server access logs.
	 */
	public function getServerAccessLogs(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/logs/access");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server performance data.
	 */
	public function getServerPerformance(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/performance");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server network information.
	 */
	public function getServerNetwork(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/network");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server environment variables.
	 */
	public function getServerEnvironment(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/environment");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Update server environment variables.
	 */
	public function updateServerEnvironment(string $serverUuid, array $environment): WingsResponse
	{
		try {
			$response = $this->connection->put("/api/servers/{$serverUuid}/environment", $environment);
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server startup parameters.
	 */
	public function getServerStartup(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/startup");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Update server startup parameters.
	 */
	public function updateServerStartup(string $serverUuid, array $startup): WingsResponse
	{
		try {
			$response = $this->connection->put("/api/servers/{$serverUuid}/startup", $startup);
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Get server variables.
	 */
	public function getServerVariables(string $serverUuid): WingsResponse
	{
		try {
			$response = $this->connection->get("/api/servers/{$serverUuid}/variables");
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}

	/**
	 * Update server variables.
	 */
	public function updateServerVariables(string $serverUuid, array $variables): WingsResponse
	{
		try {
			$response = $this->connection->put("/api/servers/{$serverUuid}/variables", $variables);
			return new WingsResponse($response, 200);
		} catch (\Exception $e) {
			return new WingsResponse(['error' => $e->getMessage()], 500);
		}
	}
}
