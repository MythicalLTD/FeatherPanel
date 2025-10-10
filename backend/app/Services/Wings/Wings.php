<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Services\Wings;

use App\Services\Wings\Services\JwtService;
use App\Services\Wings\Services\DockerService;
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
