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
 * Run history for node-level backup policies.
 */
class NodeBackupRun
{
    private static string $runsTable = 'featherpanel_node_backup_runs';
    private static string $itemsTable = 'featherpanel_node_backup_run_items';

    public static function createRun(int $policyId, int $nodesTotal = 0): int | false
    {
        if ($policyId <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$runsTable
            . ' (policy_id, status, nodes_total, started_at, created_at, updated_at)'
            . ' VALUES (:policy_id, :status, :nodes_total, :started_at, :created_at, :updated_at)'
        );
        $now = gmdate('Y-m-d H:i:s');
        try {
            if (
                !$stmt->execute([
                    'policy_id' => $policyId,
                    'status' => 'running',
                    'nodes_total' => max(0, $nodesTotal),
                    'started_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])
            ) {
                return false;
            }

            return (int) $pdo->lastInsertId();
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('NodeBackupRun createRun failed: ' . $e->getMessage());

            return false;
        }
    }

    public static function getRunById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$runsTable . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function updateRun(int $id, array $data): bool
    {
        if ($id <= 0 || $data === []) {
            return false;
        }
        unset($data['id'], $data['policy_id'], $data['created_at']);
        $data['updated_at'] = gmdate('Y-m-d H:i:s');
        $pdo = Database::getPdoConnection();
        try {
            $fields = array_keys($data);
            $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
            $params = $data;
            $params['id'] = $id;
            $stmt = $pdo->prepare('UPDATE ' . self::$runsTable . ' SET ' . $set . ' WHERE id = :id');

            return $stmt->execute($params);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('NodeBackupRun updateRun failed: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * @param array{
     *     status?: string,
     *     backup_uuid?: string|null,
     *     remote_path?: string|null,
     *     bytes?: int|null,
     *     checksum?: string|null,
     *     error?: string|null,
     *     started_at?: string|null,
     *     completed_at?: string|null
     * } $data
     */
    public static function createItem(int $runId, int $nodeId, array $data = []): int | false
    {
        if ($runId <= 0 || $nodeId <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $now = gmdate('Y-m-d H:i:s');
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$itemsTable
            . ' (run_id, node_id, status, backup_uuid, remote_path, bytes, checksum, error, started_at, completed_at, created_at, updated_at)'
            . ' VALUES (:run_id, :node_id, :status, :backup_uuid, :remote_path, :bytes, :checksum, :error, :started_at, :completed_at, :created_at, :updated_at)'
        );
        try {
            if (
                !$stmt->execute([
                    'run_id' => $runId,
                    'node_id' => $nodeId,
                    'status' => (string) ($data['status'] ?? 'pending'),
                    'backup_uuid' => $data['backup_uuid'] ?? null,
                    'remote_path' => $data['remote_path'] ?? null,
                    'bytes' => $data['bytes'] ?? null,
                    'checksum' => $data['checksum'] ?? null,
                    'error' => $data['error'] ?? null,
                    'started_at' => $data['started_at'] ?? $now,
                    'completed_at' => $data['completed_at'] ?? null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])
            ) {
                return false;
            }

            return (int) $pdo->lastInsertId();
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('NodeBackupRun createItem failed: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function updateItem(int $id, array $data): bool
    {
        if ($id <= 0 || $data === []) {
            return false;
        }
        unset($data['id'], $data['run_id'], $data['node_id'], $data['created_at']);
        $data['updated_at'] = gmdate('Y-m-d H:i:s');
        $pdo = Database::getPdoConnection();
        try {
            $fields = array_keys($data);
            $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
            $params = $data;
            $params['id'] = $id;
            $stmt = $pdo->prepare('UPDATE ' . self::$itemsTable . ' SET ' . $set . ' WHERE id = :id');

            return $stmt->execute($params);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('NodeBackupRun updateItem failed: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * @return array{runs: list<array<string, mixed>>, total: int}
     */
    public static function getRunsForPolicy(int $policyId, int $page = 1, int $limit = 20): array
    {
        if ($policyId <= 0) {
            return ['runs' => [], 'total' => 0];
        }
        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 20;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $pdo = Database::getPdoConnection();
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$runsTable . ' WHERE policy_id = :policy_id');
        $countStmt->execute(['policy_id' => $policyId]);
        $total = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $limit;
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$runsTable
            . ' WHERE policy_id = :policy_id ORDER BY id DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('policy_id', $policyId, \PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return [
            'runs' => $stmt->fetchAll(\PDO::FETCH_ASSOC),
            'total' => $total,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function getItemsForRun(int $runId): array
    {
        if ($runId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT i.*, n.name AS node_name, n.uuid AS node_uuid, n.fqdn AS node_fqdn'
            . ' FROM ' . self::$itemsTable . ' i'
            . ' LEFT JOIN featherpanel_nodes n ON n.id = i.node_id'
            . ' WHERE i.run_id = :run_id ORDER BY i.id ASC'
        );
        $stmt->execute(['run_id' => $runId]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function getLatestRunForPolicy(int $policyId): ?array
    {
        if ($policyId <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$runsTable . ' WHERE policy_id = :policy_id ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute(['policy_id' => $policyId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }
}
