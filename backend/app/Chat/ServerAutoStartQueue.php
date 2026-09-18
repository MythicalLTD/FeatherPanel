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

namespace App\Chat;

use App\App;

/**
 * Queue of staggered auto-starts after a node reboot/reconnect.
 */
class ServerAutoStartQueue
{
    private static string $table = 'featherpanel_server_auto_start_queue';

    /**
     * Cancel pending/processing queue rows for a node (e.g. before re-queueing on reconnect).
     */
    public static function cancelPendingForNode(int $nodeId): bool
    {
        if ($nodeId <= 0) {
            return false;
        }

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'UPDATE ' . self::$table . " SET status = 'skipped', last_error = 'Superseded by new node reconnect'
                 WHERE node_id = :node_id AND status IN ('pending', 'processing')"
            );

            return $stmt->execute(['node_id' => $nodeId]);
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to cancel auto-start queue for node: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Insert a queued auto-start job.
     */
    public static function enqueue(int $serverId, int $nodeId, string $scheduledAt): int | false
    {
        if ($serverId <= 0 || $nodeId <= 0 || $scheduledAt === '') {
            return false;
        }

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'INSERT INTO ' . self::$table . ' (server_id, node_id, scheduled_at, status)
                 VALUES (:server_id, :node_id, :scheduled_at, \'pending\')'
            );
            if (
                !$stmt->execute([
                'server_id' => $serverId,
                'node_id' => $nodeId,
                'scheduled_at' => $scheduledAt,
                ])
            ) {
                return false;
            }

            return (int) $pdo->lastInsertId();
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to enqueue auto-start: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Fetch due pending jobs (oldest first).
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getDueJobs(int $limit = 20): array
    {
        $limit = max(1, min(100, $limit));

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'SELECT * FROM ' . self::$table . "
                 WHERE status = 'pending' AND scheduled_at <= UTC_TIMESTAMP()
                 ORDER BY scheduled_at ASC, id ASC
                 LIMIT :limit"
            );
            $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch due auto-start jobs: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Atomically claim a pending job for processing.
     */
    public static function claimJob(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'UPDATE ' . self::$table . "
                 SET status = 'processing', attempts = attempts + 1
                 WHERE id = :id AND status = 'pending'"
            );
            $stmt->execute(['id' => $id]);

            return $stmt->rowCount() > 0;
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to claim auto-start job: ' . $e->getMessage());

            return false;
        }
    }

    public static function markCompleted(int $id): bool
    {
        return self::updateStatus($id, 'completed');
    }

    public static function markSkipped(int $id, string $reason): bool
    {
        return self::updateStatus($id, 'skipped', $reason);
    }

    public static function markFailed(int $id, string $error): bool
    {
        return self::updateStatus($id, 'failed', $error);
    }

    private static function updateStatus(int $id, string $status, ?string $lastError = null): bool
    {
        if ($id <= 0) {
            return false;
        }

        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'UPDATE ' . self::$table . ' SET status = :status, last_error = :last_error WHERE id = :id'
            );

            return $stmt->execute([
                'id' => $id,
                'status' => $status,
                'last_error' => $lastError,
            ]);
        } catch (\PDOException $e) {
            App::getInstance(true)->getLogger()->error('Failed to update auto-start job status: ' . $e->getMessage());

            return false;
        }
    }
}
