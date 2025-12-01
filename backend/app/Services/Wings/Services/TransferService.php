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
