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
 * Transfer Service for Wings API.
 *
 * Handles all server transfer-related API endpoints including:
 * - Server transfers between nodes
 * - Transfer status and progress
 * - Transfer logs
 */
class TransferService
{
    private WingsConnection $connection;

    /**
     * Create a new TransferService instance.
     */
    public function __construct(WingsConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * Get transfer token for a server.
     */
    public function getTransferToken(string $serverUuid): string
    {
        $tokenGenerator = $this->connection->getTokenGenerator();

        return $tokenGenerator->generateTransferToken($serverUuid);
    }

    /**
     * Get transfer status.
     */
    public function getTransferStatus(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/transfer");
    }

    /**
     * Start a server transfer.
     */
    public function startTransfer(string $serverUuid, array $transferData): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/transfer", $transferData);
    }

    /**
     * Cancel a server transfer.
     */
    public function cancelTransfer(string $serverUuid): array
    {
        return $this->connection->delete("/api/servers/{$serverUuid}/transfer");
    }

    /**
     * Get transfer logs.
     */
    public function getTransferLogs(string $serverUuid): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/transfer/logs");
    }

    /**
     * Check if transfer is in progress.
     */
    public function isTransferInProgress(string $serverUuid): bool
    {
        try {
            $status = $this->getTransferStatus($serverUuid);

            return $status['status'] === 'in_progress';
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Check if transfer is completed.
     */
    public function isTransferCompleted(string $serverUuid): bool
    {
        try {
            $status = $this->getTransferStatus($serverUuid);

            return $status['status'] === 'completed';
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Check if transfer is failed.
     */
    public function isTransferFailed(string $serverUuid): bool
    {
        try {
            $status = $this->getTransferStatus($serverUuid);

            return $status['status'] === 'failed';
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get transfer progress percentage.
     */
    public function getTransferProgress(string $serverUuid): float
    {
        try {
            $status = $this->getTransferStatus($serverUuid);

            return $status['progress'] ?? 0.0;
        } catch (\Exception $e) {
            return 0.0;
        }
    }

    /**
     * Get transfer start time.
     */
    public function getTransferStartTime(string $serverUuid): string
    {
        try {
            $status = $this->getTransferStatus($serverUuid);

            return $status['started_at'] ?? '';
        } catch (\Exception $e) {
            return '';
        }
    }

    /**
     * Get transfer completion time.
     */
    public function getTransferCompletionTime(string $serverUuid): string
    {
        try {
            $status = $this->getTransferStatus($serverUuid);

            return $status['completed_at'] ?? '';
        } catch (\Exception $e) {
            return '';
        }
    }

    /**
     * Get transfer error message.
     */
    public function getTransferError(string $serverUuid): string
    {
        try {
            $status = $this->getTransferStatus($serverUuid);

            return $status['error'] ?? '';
        } catch (\Exception $e) {
            return '';
        }
    }
}
