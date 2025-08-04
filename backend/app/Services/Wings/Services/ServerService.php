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
    public function getAllServers(): array
    {
        return $this->connection->get('/api/servers');
    }

    /**
     * Get a specific server by UUID.
     */
    public function getServer(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}");
    }

    /**
     * Create a new server.
     */
    public function createServer(array $serverData): array
    {
        return $this->connection->post('/api/servers', $serverData);
    }

    /**
     * Delete a server.
     */
    public function deleteServer(string $serverUuid): array
    {
        return $this->connection->delete("/api/servers/{$serverUuid}");
    }

    /**
     * Start a server.
     */
    public function startServer(string $serverUuid): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'start']);
    }

    /**
     * Stop a server.
     */
    public function stopServer(string $serverUuid): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'stop']);
    }

    /**
     * Restart a server.
     */
    public function restartServer(string $serverUuid): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'restart']);
    }

    /**
     * Kill a server.
     */
    public function killServer(string $serverUuid): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/power", ['signal' => 'kill']);
    }

    /**
     * Get server logs.
     *
     * @param int $lines Number of lines to get (default: 100)
     */
    public function getServerLogs(string $serverUuid, int $lines = 100): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/logs?lines={$lines}");
    }

    /**
     * Get server console logs.
     *
     * @param int $lines Number of lines to get (default: 100)
     */
    public function getServerConsoleLogs(string $serverUuid, int $lines = 100): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/logs/console?lines={$lines}");
    }

    /**
     * Send command to server console.
     */
    public function sendCommand(string $serverUuid, string $command): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/console", ['command' => $command]);
    }

    /**
     * Get server status.
     */
    public function getServerStatus(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/status");
    }

    /**
     * Get server resources (CPU, memory, disk).
     */
    public function getServerResources(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/resources");
    }

    /**
     * Get server configuration.
     */
    public function getServerConfig(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/config");
    }

    /**
     * Update server configuration.
     */
    public function updateServerConfig(string $serverUuid, array $config): array
    {
        return $this->connection->put("/api/servers/{$serverUuid}/config", $config);
    }

    /**
     * Install server.
     */
    public function installServer(string $serverUuid): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/install");
    }

    /**
     * Reinstall server.
     */
    public function reinstallServer(string $serverUuid): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/reinstall");
    }

    /**
     * Get server startup logs.
     */
    public function getServerStartupLogs(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/logs/startup");
    }

    /**
     * Get server error logs.
     */
    public function getServerErrorLogs(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/logs/error");
    }

    /**
     * Get server access logs.
     */
    public function getServerAccessLogs(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/logs/access");
    }

    /**
     * Get server performance data.
     */
    public function getServerPerformance(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/performance");
    }

    /**
     * Get server network information.
     */
    public function getServerNetwork(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/network");
    }

    /**
     * Get server environment variables.
     */
    public function getServerEnvironment(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/environment");
    }

    /**
     * Update server environment variables.
     */
    public function updateServerEnvironment(string $serverUuid, array $environment): array
    {
        return $this->connection->put("/api/servers/{$serverUuid}/environment", $environment);
    }

    /**
     * Get server startup parameters.
     */
    public function getServerStartup(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/startup");
    }

    /**
     * Update server startup parameters.
     */
    public function updateServerStartup(string $serverUuid, array $startup): array
    {
        return $this->connection->put("/api/servers/{$serverUuid}/startup", $startup);
    }

    /**
     * Get server variables.
     */
    public function getServerVariables(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/variables");
    }

    /**
     * Update server variables.
     */
    public function updateServerVariables(string $serverUuid, array $variables): array
    {
        return $this->connection->put("/api/servers/{$serverUuid}/variables", $variables);
    }
}
