<?php

/*
 * This file is part of App.
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
 * WebSocket Service for Wings API.
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
     * Create a new WebSocketService instance.
     */
    public function __construct(WingsConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * Generate WebSocket token.
     */
    public function generateWebSocketToken(string $serverUuid, string $userUuid, array $permissions = []): string
    {
        $tokenGenerator = $this->connection->getTokenGenerator();

        return $tokenGenerator->generateWebSocketToken($serverUuid, $userUuid, $permissions);
    }

    /**
     * Generate WebSocket URL.
     */
    public function generateWebSocketUrl(string $serverUuid, string $userUuid, array $permissions = []): string
    {
        $tokenGenerator = $this->connection->getTokenGenerator();
        $baseUrl = $this->connection->getBaseUrl();

        return $tokenGenerator->generateWebSocketUrl($baseUrl, $serverUuid, $userUuid, $permissions);
    }

    /**
     * Deny WebSocket tokens for a server.
     */
    public function denyWebSocketTokens(string $serverUuid): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/ws/deny");
    }

    /**
     * Get WebSocket connection status.
     */
    public function getWebSocketStatus(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/ws");
    }

    /**
     * Check if WebSocket is connected.
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
     * Get WebSocket connection count.
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
     * Get WebSocket permissions for a user.
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
     * Check if user has WebSocket permission.
     */
    public function hasWebSocketPermission(string $serverUuid, string $userUuid, string $permission): bool
    {
        $permissions = $this->getWebSocketPermissions($serverUuid, $userUuid);

        return in_array($permission, $permissions);
    }

    /**
     * Check if user has console permission.
     */
    public function hasConsolePermission(string $serverUuid, string $userUuid): bool
    {
        return $this->hasWebSocketPermission($serverUuid, $userUuid, 'console');
    }

    /**
     * Check if user has files permission.
     */
    public function hasFilesPermission(string $serverUuid, string $userUuid): bool
    {
        return $this->hasWebSocketPermission($serverUuid, $userUuid, 'files');
    }

    /**
     * Check if user has admin permission.
     */
    public function hasAdminPermission(string $serverUuid, string $userUuid): bool
    {
        return $this->hasWebSocketPermission($serverUuid, $userUuid, 'admin');
    }

    /**
     * Get WebSocket events.
     */
    public function getWebSocketEvents(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/ws/events");
    }

    /**
     * Get WebSocket logs.
     *
     * @param int $lines Number of lines to get (default: 100)
     */
    public function getWebSocketLogs(string $serverUuid, int $lines = 100): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/ws/logs?lines={$lines}");
    }

    /**
     * Get WebSocket statistics.
     */
    public function getWebSocketStats(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/ws/stats");
    }

    /**
     * Get WebSocket memory usage.
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
     * Get WebSocket CPU usage.
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
     * Get WebSocket uptime.
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
     * Get WebSocket message count.
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
     * Get WebSocket error count.
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
