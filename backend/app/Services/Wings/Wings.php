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

namespace App\Services\Wings;

use App\Services\Wings\Services\JwtService;
use App\Services\Wings\Services\ConfigService;
use App\Services\Wings\Services\DockerService;
use App\Services\Wings\Services\ModuleService;
use App\Services\Wings\Services\ServerService;
use App\Services\Wings\Services\SystemService;
use App\Services\Wings\Services\TransferService;

/**
 * Main Wings API Client.
 *
 * This is the main entry point for the Wings API client.
 * It provides access to different service classes for different API areas.
 */
class Wings
{
    private WingsConnection $connection;
    private SystemService $system;
    private ServerService $server;
    private DockerService $docker;
    private TransferService $transfer;
    private JwtService $jwt;
    private ConfigService $config;
    private ModuleService $module;

    /**
     * Create a new Wings client instance.
     *
     * @param string $host The Wings server hostname/IP
     * @param int $port The Wings server port (default: 8080)
     * @param string $protocol The protocol to use (http/https)
     * @param string $authToken The authentication token for Wings
     * @param int $timeout Request timeout in seconds (default: 30)
     */
    public function __construct(
        string $host,
        int $port = 8080,
        string $protocol = 'http',
        string $authToken = '',
        int $timeout = 30,
    ) {
        $this->connection = new WingsConnection($host, $port, $protocol, $authToken, $timeout);

        // Initialize service classes
        $this->system = new SystemService($this->connection);
        $this->server = new ServerService($this->connection);
        $this->docker = new DockerService($this->connection);
        $this->transfer = new TransferService($this->connection);
        $this->config = new ConfigService($this->connection);
        $this->module = new ModuleService($this->connection);

        // Initialize JWT service with node secret
        $this->jwt = new JwtService($authToken, '', $this->connection->getBaseUrl());
    }

    /**
     * Get the system service.
     */
    public function getSystem(): SystemService
    {
        return $this->system;
    }

    /**
     * Get the server service.
     */
    public function getServer(): ServerService
    {
        return $this->server;
    }

    /**
     * Get the Docker service.
     */
    public function getDocker(): DockerService
    {
        return $this->docker;
    }

    /**
     * Get the transfer service.
     */
    public function getTransfer(): TransferService
    {
        return $this->transfer;
    }

    /**
     * Get the JWT service.
     */
    public function getJwt(): JwtService
    {
        return $this->jwt;
    }

    /**
     * Get the config service.
     */
    public function getConfig(): ConfigService
    {
        return $this->config;
    }

    /**
     * Get the module service.
     */
    public function getModule(): ModuleService
    {
        return $this->module;
    }

    /**
     * Get the underlying connection.
     */
    public function getConnection(): WingsConnection
    {
        return $this->connection;
    }

    /**
     * Test the connection to Wings.
     */
    public function testConnection(): bool
    {
        return $this->connection->testConnection();
    }

    /**
     * Set the authentication token.
     */
    public function setAuthToken(string $token): void
    {
        $this->connection->setAuthToken($token);
    }

    /**
     * Get the authentication token.
     */
    public function getAuthToken(): string
    {
        return $this->connection->getAuthToken();
    }

    /**
     * Get the base URL.
     */
    public function getBaseUrl(): string
    {
        return $this->connection->getBaseUrl();
    }

    /**
     * Get the token generator.
     */
    public function getTokenGenerator(): Utils\TokenGenerator
    {
        return $this->connection->getTokenGenerator();
    }
}
