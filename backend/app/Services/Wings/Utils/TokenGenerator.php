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

namespace App\Services\Wings\Utils;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Token Generator for Wings API.
 *
 * This class handles the generation of various JWT tokens
 * required for Wings API authentication and signed URLs.
 */
class TokenGenerator
{
    private string $secret;
    private string $algorithm;
    private int $expiration;

    /**
     * Create a new TokenGenerator instance.
     *
     * @param string $secret The JWT secret key
     * @param string $algorithm The JWT algorithm (default: HS256)
     * @param int $expiration Token expiration time in seconds (default: 900 = 15 minutes)
     */
    public function __construct(
        string $secret = '',
        string $algorithm = 'HS256',
        int $expiration = 900,
    ) {
        $this->secret = $secret;
        $this->algorithm = $algorithm;
        $this->expiration = $expiration;
    }

    /**
     * Set the JWT secret.
     */
    public function setSecret(string $secret): void
    {
        $this->secret = $secret;
    }

    /**
     * Get the JWT secret.
     */
    public function getSecret(): string
    {
        return $this->secret;
    }

    /**
     * Set the JWT algorithm.
     */
    public function setAlgorithm(string $algorithm): void
    {
        $this->algorithm = $algorithm;
    }

    /**
     * Get the JWT algorithm.
     */
    public function getAlgorithm(): string
    {
        return $this->algorithm;
    }

    /**
     * Set the token expiration time.
     */
    public function setExpiration(int $expiration): void
    {
        $this->expiration = $expiration;
    }

    /**
     * Get the token expiration time.
     */
    public function getExpiration(): int
    {
        return $this->expiration;
    }

    /**
     * Generate a backup download token.
     *
     * @param string $serverUuid The server UUID
     * @param string $backupUuid The backup UUID
     * @param string $uniqueId Unique request ID
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateBackupDownloadToken(string $serverUuid, string $backupUuid, string $uniqueId = ''): string
    {
        $payload = [
            'server_uuid' => $serverUuid,
            'backup_uuid' => $backupUuid,
            'unique_id' => $uniqueId ?: $this->generateUniqueId(),
            'iat' => time(),
            'exp' => time() + $this->expiration,
            'jti' => $this->generateJti(),
        ];

        return $this->encodeToken($payload);
    }

    /**
     * Generate a file download token.
     *
     * @param string $serverUuid The server UUID
     * @param string $filePath The file path
     * @param string $uniqueId Unique request ID
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateFileDownloadToken(string $serverUuid, string $filePath, string $uniqueId = ''): string
    {
        $payload = [
            'file_path' => $filePath,
            'server_uuid' => $serverUuid,
            'unique_id' => $uniqueId ?: $this->generateUniqueId(),
            'iat' => time(),
            'exp' => time() + $this->expiration,
            'jti' => $this->generateJti(),
        ];

        return $this->encodeToken($payload);
    }

    /**
     * Generate a file upload token.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param string $uniqueId Unique request ID
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateFileUploadToken(string $serverUuid, string $userUuid, string $uniqueId = ''): string
    {
        $payload = [
            'server_uuid' => $serverUuid,
            'user_uuid' => $userUuid,
            'unique_id' => $uniqueId ?: $this->generateUniqueId(),
            'iat' => time(),
            'exp' => time() + $this->expiration,
            'jti' => $this->generateJti(),
        ];

        return $this->encodeToken($payload);
    }

    /**
     * Generate a transfer token.
     *
     * @param string $serverUuid The server UUID
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateTransferToken(string $serverUuid): string
    {
        $payload = [
            'subject' => $serverUuid,
            'iat' => time(),
            'exp' => time() + $this->expiration,
            'jti' => $this->generateJti(),
        ];

        return $this->encodeToken($payload);
    }

    /**
     * Generate a WebSocket token.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The permissions array (e.g., ['console', 'files', 'admin'])
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateWebSocketToken(string $serverUuid, string $userUuid, array $permissions = []): string
    {
        $payload = [
            'user_uuid' => $userUuid,
            'server_uuid' => $serverUuid,
            'permissions' => $permissions,
            'iat' => time(),
            'exp' => time() + $this->expiration,
            'jti' => $this->generateJti(),
        ];

        return $this->encodeToken($payload);
    }

    /**
     * Generate a Wings-compatible JWT token for API authentication.
     *
     * This method generates a JWT token that follows the exact format expected by Wings,
     * including all required claims like issuer, audience, and proper timestamps.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The permissions array
     * @param string $panelUrl The panel's URL (issuer)
     * @param string $wingsUrl The Wings node's URL (audience)
     * @param array $additionalClaims Additional claims to include
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateWingsApiToken(
        string $serverUuid,
        string $userUuid,
        array $permissions = [],
        string $panelUrl = '',
        string $wingsUrl = '',
        array $additionalClaims = [],
    ): string {
        $currentTime = time();

        $payload = [
            // Standard JWT claims
            'iss' => $panelUrl, // Issuer (panel URL)
            'aud' => $wingsUrl, // Audience (Wings node URL)
            'sub' => $serverUuid, // Subject (server UUID) - standard JWT claim
            'iat' => $currentTime, // Issued at
            'nbf' => $currentTime - 300, // Not valid before (5 minutes ago)
            'exp' => $currentTime + $this->expiration, // Expiration
            'jti' => $this->generateJti(), // JWT ID

            // Wings-specific claims
            'user_uuid' => $userUuid,
            'server_uuid' => $serverUuid,
            'permissions' => $permissions,

            // Additional claims
            ...$additionalClaims,
        ];

        return $this->encodeToken($payload);
    }

    /**
     * Generate a Wings-compatible JWT token for server actions.
     *
     * This method generates a JWT token specifically for server control actions
     * like start, stop, restart, etc.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The permissions array
     * @param string $panelUrl The panel's URL (issuer)
     * @param string $wingsUrl The Wings node's URL (audience)
     * @param string $action The specific action being performed
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateServerActionToken(
        string $serverUuid,
        string $userUuid,
        array $permissions = [],
        string $panelUrl = '',
        string $wingsUrl = '',
        string $action = '',
    ): string {
        $additionalClaims = [];

        if (!empty($action)) {
            $additionalClaims['action'] = $action;
        }

        return $this->generateWingsApiToken(
            $serverUuid,
            $userUuid,
            $permissions,
            $panelUrl,
            $wingsUrl,
            $additionalClaims
        );
    }

    /**
     * Generate a Wings-compatible JWT token for backup operations.
     *
     * This method generates a JWT token specifically for backup-related actions
     * like creating, downloading, or restoring backups.
     *
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The permissions array
     * @param string $panelUrl The panel's URL (issuer)
     * @param string $wingsUrl The Wings node's URL (audience)
     * @param string $backupUuid The backup UUID (if applicable)
     * @param string $operation The backup operation (create, download, restore, delete)
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    public function generateBackupOperationToken(
        string $serverUuid,
        string $userUuid,
        array $permissions = [],
        string $panelUrl = '',
        string $wingsUrl = '',
        string $backupUuid = '',
        string $operation = '',
    ): string {
        $additionalClaims = [
            'type' => 'backup',
        ];

        if (!empty($backupUuid)) {
            $additionalClaims['backup_uuid'] = $backupUuid;
        }

        if (!empty($operation)) {
            $additionalClaims['operation'] = $operation;
        }

        return $this->generateWingsApiToken(
            $serverUuid,
            $userUuid,
            $permissions,
            $panelUrl,
            $wingsUrl,
            $additionalClaims
        );
    }

    /**
     * Generate a signed URL for backup download.
     *
     * @param string $baseUrl The Wings base URL
     * @param string $serverUuid The server UUID
     * @param string $backupUuid The backup UUID
     * @param string $uniqueId Unique request ID
     *
     * @throws \Exception
     *
     * @return string The signed URL
     */
    public function generateBackupDownloadUrl(string $baseUrl, string $serverUuid, string $backupUuid, string $uniqueId = ''): string
    {
        $token = $this->generateBackupDownloadToken($serverUuid, $backupUuid, $uniqueId);
        $baseUrl = rtrim($baseUrl, '/');

        return "{$baseUrl}/download/backup?token={$token}&server={$serverUuid}&backup={$backupUuid}";
    }

    /**
     * Generate a signed URL for file download.
     *
     * @param string $baseUrl The Wings base URL
     * @param string $serverUuid The server UUID
     * @param string $filePath The file path
     * @param string $uniqueId Unique request ID
     *
     * @throws \Exception
     *
     * @return string The signed URL
     */
    public function generateFileDownloadUrl(string $baseUrl, string $serverUuid, string $filePath, string $uniqueId = ''): string
    {
        $token = $this->generateFileDownloadToken($serverUuid, $filePath, $uniqueId);
        $baseUrl = rtrim($baseUrl, '/');
        $encodedFilePath = urlencode($filePath);

        return "{$baseUrl}/download/file?token={$token}&server={$serverUuid}&file={$encodedFilePath}";
    }

    /**
     * Generate a signed URL for file upload.
     *
     * @param string $baseUrl The Wings base URL
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param string $uniqueId Unique request ID
     *
     * @throws \Exception
     *
     * @return string The signed URL
     */
    public function generateFileUploadUrl(string $baseUrl, string $serverUuid, string $userUuid, string $uniqueId = ''): string
    {
        $token = $this->generateFileUploadToken($serverUuid, $userUuid, $uniqueId);
        $baseUrl = rtrim($baseUrl, '/');

        return "{$baseUrl}/upload/file?token={$token}&server={$serverUuid}";
    }

    /**
     * Generate a WebSocket URL.
     *
     * @param string $baseUrl The Wings base URL
     * @param string $serverUuid The server UUID
     * @param string $userUuid The user UUID
     * @param array $permissions The permissions array
     *
     * @throws \Exception
     *
     * @return string The WebSocket URL
     */
    public function generateWebSocketUrl(string $baseUrl, string $serverUuid, string $userUuid, array $permissions = []): string
    {
        $token = $this->generateWebSocketToken($serverUuid, $userUuid, $permissions);
        $baseUrl = rtrim($baseUrl, '/');

        // Convert http to ws, https to wss
        $wsUrl = str_replace(['http://', 'https://'], ['ws://', 'wss://'], $baseUrl);

        return "{$wsUrl}/api/servers/{$serverUuid}/ws?token={$token}";
    }

    /**
     * Decode and validate a JWT token.
     *
     * @param string $token The JWT token
     *
     * @throws \Exception
     *
     * @return array The decoded payload
     */
    public function decodeToken(string $token): array
    {
        if (empty($this->secret)) {
            throw new \Exception('JWT secret is not set');
        }

        try {
            $decoded = JWT::decode($token, new Key($this->secret, $this->algorithm));

            return (array) $decoded;
        } catch (\Exception $e) {
            throw new \Exception('Invalid token: ' . $e->getMessage());
        }
    }

    /**
     * Validate if a token is expired.
     *
     * @param string $token The JWT token
     *
     * @return bool True if expired, false otherwise
     */
    public function isTokenExpired(string $token): bool
    {
        try {
            $payload = $this->decodeToken($token);

            return isset($payload['exp']) && $payload['exp'] < time();
        } catch (\Exception $e) {
            return true; // Consider invalid tokens as expired
        }
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
        try {
            $payload = $this->decodeToken($token);

            return $payload['exp'] ?? null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Encode a payload into a JWT token.
     *
     * @param array $payload The payload to encode
     *
     * @throws \Exception
     *
     * @return string The JWT token
     */
    private function encodeToken(array $payload): string
    {
        if (empty($this->secret)) {
            throw new \Exception('JWT secret is not set');
        }

        try {
            return JWT::encode($payload, $this->secret, $this->algorithm);
        } catch (\Exception $e) {
            throw new \Exception('Failed to encode token: ' . $e->getMessage());
        }
    }

    /**
     * Generate a unique ID for token requests.
     */
    private function generateUniqueId(): string
    {
        return uniqid('wings_', true);
    }

    /**
     * Generate a JWT ID (JTI).
     */
    private function generateJti(): string
    {
        return bin2hex(random_bytes(16));
    }
}
