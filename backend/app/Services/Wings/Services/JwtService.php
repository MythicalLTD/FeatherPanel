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

namespace App\Services\Wings\Services;

use App\Services\Wings\Utils\TokenGenerator;

/**
 * JWT Service for Wings API.
 *
 * This service provides high-level methods for generating Wings-compatible JWT tokens
 * for different use cases like server control, WebSocket connections, and file operations.
 */
class JwtService
{
    private TokenGenerator $tokenGenerator;
    private string $panelUrl;
    private string $wingsUrl;
    private string $nodeSecret;

    /**
     * Create a new JWT service instance.
     *
     * @param string $nodeSecret The Wings node's secret key
     * @param string $panelUrl The panel's URL (issuer)
     * @param string $wingsUrl The Wings node's URL (audience)
     * @param int $expiration Token expiration time in seconds (default: 600 = 10 minutes)
     */
    public function __construct(
        string $nodeSecret,
        string $panelUrl = '',
        string $wingsUrl = '',
        int $expiration = 600,
    ) {
        $this->tokenGenerator = new TokenGenerator($nodeSecret, 'HS256', $expiration);
        $this->panelUrl = $panelUrl;
        $this->wingsUrl = $wingsUrl;
        $this->nodeSecret = $nodeSecret;
    }

    /**
     * Set the panel URL.
     */
    public function setPanelUrl(string $panelUrl): void
    {
        $this->panelUrl = $panelUrl;
    }

    /**
     * Get the panel URL.
     */
    public function getPanelUrl(): string
    {
        return $this->panelUrl;
    }

    /**
     * Set the Wings URL.
     */
    public function setWingsUrl(string $wingsUrl): void
    {
        $this->wingsUrl = $wingsUrl;
    }

    /**
     * Get the Wings URL.
     */
    public function getWingsUrl(): string
    {
        return $this->wingsUrl;
    }

    /**
     * Set the node secret.
     */
    public function setNodeSecret(string $nodeSecret): void
    {
        $this->nodeSecret = $nodeSecret;
        $this->tokenGenerator->setSecret($nodeSecret);
    }

    /**
     * Get the node secret.
     */
    public function getNodeSecret(): string
    {
        return $this->nodeSecret;
    }

    /**
     * Generate a JWT token for server control actions.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The user's permissions
     * @param string $action The specific action (start, stop, restart, etc.)
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateServerControlToken(
        string $serverUuid,
        string $userUuid,
        array $permissions,
        string $action = '',
    ): string {
        return $this->tokenGenerator->generateServerActionToken(
            $serverUuid,
            $userUuid,
            $permissions,
            $this->panelUrl,
            $this->wingsUrl,
            $action
        );
    }

    /**
     * Generate a JWT token for WebSocket connections.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The user's permissions
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateWebSocketToken(
        string $serverUuid,
        string $userUuid,
        array $permissions,
    ): string {
        return $this->tokenGenerator->generateWebSocketToken(
            $serverUuid,
            $userUuid,
            $permissions
        );
    }

    /**
     * Generate a JWT token for backup operations.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The user's permissions
     * @param string $backupUuid The backup UUID (if applicable)
     * @param string $operation The backup operation (create, download, restore, delete)
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateBackupToken(
        string $serverUuid,
        string $userUuid,
        array $permissions,
        string $backupUuid = '',
        string $operation = '',
    ): string {
        return $this->tokenGenerator->generateBackupOperationToken(
            $serverUuid,
            $userUuid,
            $permissions,
            $this->panelUrl,
            $this->wingsUrl,
            $backupUuid,
            $operation
        );
    }

    /**
     * Generate a JWT token for file operations.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The user's permissions
     * @param string $operation The file operation (read, write, delete, upload, download)
     * @param string $filePath The file path (if applicable)
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateFileOperationToken(
        string $serverUuid,
        string $userUuid,
        array $permissions,
        string $operation = '',
        string $filePath = '',
    ): string {
        $additionalClaims = [
            'type' => 'file',
        ];

        if (!empty($operation)) {
            $additionalClaims['operation'] = $operation;
        }

        if (!empty($filePath)) {
            $additionalClaims['file_path'] = $filePath;
        }

        return $this->tokenGenerator->generateWingsApiToken(
            $serverUuid,
            $userUuid,
            $permissions,
            $this->panelUrl,
            $this->wingsUrl,
            $additionalClaims
        );
    }

    /**
     * Generate a JWT token for Docker operations.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The user's permissions
     * @param string $operation The Docker operation (rebuild, logs, etc.)
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateDockerOperationToken(
        string $serverUuid,
        string $userUuid,
        array $permissions,
        string $operation = '',
    ): string {
        $additionalClaims = [
            'type' => 'docker',
        ];

        if (!empty($operation)) {
            $additionalClaims['operation'] = $operation;
        }

        return $this->tokenGenerator->generateWingsApiToken(
            $serverUuid,
            $userUuid,
            $permissions,
            $this->panelUrl,
            $this->wingsUrl,
            $additionalClaims
        );
    }

    /**
     * Generate a JWT token for system operations.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The user's permissions
     * @param string $operation The system operation (logs, resources, etc.)
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateSystemOperationToken(
        string $serverUuid,
        string $userUuid,
        array $permissions,
        string $operation = '',
    ): string {
        $additionalClaims = [
            'type' => 'system',
        ];

        if (!empty($operation)) {
            $additionalClaims['operation'] = $operation;
        }

        return $this->tokenGenerator->generateWingsApiToken(
            $serverUuid,
            $userUuid,
            $permissions,
            $this->panelUrl,
            $this->wingsUrl,
            $additionalClaims
        );
    }

    /**
     * Generate a generic Wings API token.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The user's permissions
     * @param array $additionalClaims Additional claims to include
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateApiToken(
        string $serverUuid,
        string $userUuid,
        array $permissions,
        array $additionalClaims = [],
    ): string {
        return $this->tokenGenerator->generateWingsApiToken(
            $serverUuid,
            $userUuid,
            $permissions,
            $this->panelUrl,
            $this->wingsUrl,
            $additionalClaims
        );
    }

    /**
     * Get the underlying token generator instance.
     */
    public function getTokenGenerator(): TokenGenerator
    {
        return $this->tokenGenerator;
    }

    /**
     * Validate a JWT token.
     *
     * @param string $token The JWT token to validate
     *
     * @throws \Exception
     *
     * @return array The decoded token payload
     */
    public function validateToken(string $token): array
    {
        return $this->tokenGenerator->decodeToken($token);
    }

    /**
     * Check if a token is expired.
     *
     * @param string $token The JWT token to check
     *
     * @return bool True if expired, false otherwise
     */
    public function isTokenExpired(string $token): bool
    {
        return $this->tokenGenerator->isTokenExpired($token);
    }

    /**
     * Get token expiration time.
     *
     * @param string $token The JWT token
     *
     * @return int|null The expiration timestamp or null if not found
     */
    public function getTokenExpiration(string $token): ?int
    {
        return $this->tokenGenerator->getTokenExpiration($token);
    }
}
