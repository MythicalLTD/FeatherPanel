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
use App\Helpers\UUIDUtils;

/**
 * Scheduled node-level backup policies.
 */
class NodeBackupPolicy
{
    public const SCOPE_ALL_NODES = 'all_nodes';
    public const SCOPE_NODES = 'nodes';

    /** @var list<string> */
    public const SCOPE_TYPES = [self::SCOPE_ALL_NODES, self::SCOPE_NODES];

    public const MODE_VOLUMES = 'volumes';
    public const MODE_FULL = 'full';
    public const MODE_USER_BACKUPS_ONLY = 'user_backups_only';

    /** @var list<string> */
    public const MODES = [self::MODE_VOLUMES, self::MODE_FULL, self::MODE_USER_BACKUPS_ONLY];

    private static string $table = 'featherpanel_node_backup_policies';
    private static string $nodesTable = 'featherpanel_node_backup_policy_nodes';
    private static string $mirrorsTable = 'featherpanel_node_backup_policy_mirrors';

    /**
     * @param array<string, mixed> $data
     * @param list<int> $nodeIds
     * @param list<int> $mirrorDestinationIds
     */
    public static function createPolicy(array $data, array $nodeIds = [], array $mirrorDestinationIds = []): int | false
    {
        $required = [
            'name',
            'scope_type',
            'mode',
            'primary_destination_id',
            'cron_day_of_week',
            'cron_month',
            'cron_day_of_month',
            'cron_hour',
            'cron_minute',
        ];

        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim((string) $data[$field]) === '')) {
                App::getInstance(true)->getLogger()->error('NodeBackupPolicy: missing required field ' . $field);

                return false;
            }
        }

        $scopeType = (string) $data['scope_type'];
        if (!in_array($scopeType, self::SCOPE_TYPES, true)) {
            App::getInstance(true)->getLogger()->error('NodeBackupPolicy: invalid scope_type ' . $scopeType);

            return false;
        }

        $mode = (string) $data['mode'];
        if (!in_array($mode, self::MODES, true)) {
            App::getInstance(true)->getLogger()->error('NodeBackupPolicy: invalid mode ' . $mode);

            return false;
        }

        $primaryDestinationId = (int) $data['primary_destination_id'];
        if ($primaryDestinationId <= 0 || !NodeBackupDestination::getById($primaryDestinationId)) {
            App::getInstance(true)->getLogger()->error('NodeBackupPolicy: invalid primary_destination_id');

            return false;
        }

        if ($scopeType === self::SCOPE_NODES) {
            $nodeIds = array_values(array_unique(array_filter(array_map('intval', $nodeIds), fn (int $id) => $id > 0)));
            if ($nodeIds === []) {
                App::getInstance(true)->getLogger()->error('NodeBackupPolicy: nodes scope requires at least one node');

                return false;
            }
            foreach ($nodeIds as $nodeId) {
                if (!Node::getNodeById($nodeId)) {
                    App::getInstance(true)->getLogger()->error('NodeBackupPolicy: invalid node_id ' . $nodeId);

                    return false;
                }
            }
        } else {
            $nodeIds = [];
        }

        $mirrorDestinationIds = array_values(array_unique(array_filter(
            array_map('intval', $mirrorDestinationIds),
            fn (int $id) => $id > 0 && $id !== $primaryDestinationId
        )));
        foreach ($mirrorDestinationIds as $destId) {
            if (!NodeBackupDestination::getById($destId)) {
                App::getInstance(true)->getLogger()->error('NodeBackupPolicy: invalid mirror destination_id ' . $destId);

                return false;
            }
        }

        $isActive = self::normalizeBooleanFlag($data['is_active'] ?? 1);
        $isProcessing = self::normalizeBooleanFlag($data['is_processing'] ?? 0);
        $deleteLocalAfterUpload = self::normalizeBooleanFlag($data['delete_local_after_upload'] ?? 1);
        $notifyOnFailure = self::normalizeBooleanFlag($data['notify_on_failure'] ?? 1);
        if ($isActive === null || $isProcessing === null || $deleteLocalAfterUpload === null || $notifyOnFailure === null) {
            App::getInstance(true)->getLogger()->error('NodeBackupPolicy: invalid boolean flag');

            return false;
        }

        $concurrency = isset($data['concurrency']) ? (int) $data['concurrency'] : 1;
        if ($concurrency < 1) {
            $concurrency = 1;
        }
        if ($concurrency > 5) {
            $concurrency = 5;
        }

        $retentionDays = isset($data['retention_days']) ? (int) $data['retention_days'] : 90;
        if ($retentionDays < 1) {
            $retentionDays = 1;
        }

        $timezone = trim((string) ($data['timezone'] ?? 'UTC'));
        if ($timezone === '') {
            $timezone = 'UTC';
        }

        $uuid = isset($data['uuid']) && is_string($data['uuid']) && UUIDUtils::isValid($data['uuid'])
            ? $data['uuid']
            : UUIDUtils::generateV4();

        $nextRunAt = $data['next_run_at'] ?? ServerSchedule::calculateNextRunTime(
            (string) $data['cron_day_of_week'],
            (string) $data['cron_month'],
            (string) $data['cron_day_of_month'],
            (string) $data['cron_hour'],
            (string) $data['cron_minute'],
            null,
            $timezone
        );

        $now = gmdate('Y-m-d H:i:s');
        $insert = [
            'uuid' => $uuid,
            'name' => trim((string) $data['name']),
            'scope_type' => $scopeType,
            'mode' => $mode,
            'primary_destination_id' => $primaryDestinationId,
            'cron_day_of_week' => (string) $data['cron_day_of_week'],
            'cron_month' => (string) $data['cron_month'],
            'cron_day_of_month' => (string) $data['cron_day_of_month'],
            'cron_hour' => (string) $data['cron_hour'],
            'cron_minute' => (string) $data['cron_minute'],
            'timezone' => $timezone,
            'is_active' => $isActive,
            'is_processing' => $isProcessing,
            'retention_days' => $retentionDays,
            'delete_local_after_upload' => $deleteLocalAfterUpload,
            'concurrency' => $concurrency,
            'notify_on_failure' => $notifyOnFailure,
            'next_run_at' => $nextRunAt,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $pdo = Database::getPdoConnection();
        try {
            $pdo->beginTransaction();
            $fields = array_keys($insert);
            $placeholders = array_map(fn ($f) => ':' . $f, $fields);
            $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
            $stmt = $pdo->prepare($sql);
            if (!$stmt->execute($insert)) {
                $pdo->rollBack();

                return false;
            }
            $policyId = (int) $pdo->lastInsertId();

            if ($nodeIds !== []) {
                $link = $pdo->prepare('INSERT INTO ' . self::$nodesTable . ' (policy_id, node_id) VALUES (:policy_id, :node_id)');
                foreach ($nodeIds as $nodeId) {
                    $link->execute(['policy_id' => $policyId, 'node_id' => $nodeId]);
                }
            }

            if ($mirrorDestinationIds !== []) {
                $link = $pdo->prepare(
                    'INSERT INTO ' . self::$mirrorsTable . ' (policy_id, destination_id) VALUES (:policy_id, :destination_id)'
                );
                foreach ($mirrorDestinationIds as $destId) {
                    $link->execute(['policy_id' => $policyId, 'destination_id' => $destId]);
                }
            }

            $pdo->commit();

            return $policyId;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('NodeBackupPolicy create failed: ' . $e->getMessage());

            return false;
        }
    }

    public static function getPolicyById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function getPolicyByUuid(string $uuid): ?array
    {
        if (!UUIDUtils::isValid($uuid)) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * @return list<int>
     */
    public static function getNodeIdsForPolicy(int $policyId): array
    {
        if ($policyId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT node_id FROM ' . self::$nodesTable . ' WHERE policy_id = :policy_id');
        $stmt->execute(['policy_id' => $policyId]);

        return array_map('intval', $stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    /**
     * @param list<int> $nodeIds
     */
    public static function setNodeIds(int $policyId, array $nodeIds): bool
    {
        if ($policyId <= 0) {
            return false;
        }
        $policy = self::getPolicyById($policyId);
        if (!$policy) {
            return false;
        }

        $nodeIds = array_values(array_unique(array_filter(array_map('intval', $nodeIds), fn (int $id) => $id > 0)));
        foreach ($nodeIds as $nodeId) {
            if (!Node::getNodeById($nodeId)) {
                App::getInstance(true)->getLogger()->error('NodeBackupPolicy: invalid node_id ' . $nodeId);

                return false;
            }
        }

        $pdo = Database::getPdoConnection();
        try {
            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM ' . self::$nodesTable . ' WHERE policy_id = :policy_id')
                ->execute(['policy_id' => $policyId]);
            if ($nodeIds !== []) {
                $link = $pdo->prepare('INSERT INTO ' . self::$nodesTable . ' (policy_id, node_id) VALUES (:policy_id, :node_id)');
                foreach ($nodeIds as $nodeId) {
                    $link->execute(['policy_id' => $policyId, 'node_id' => $nodeId]);
                }
            }
            $pdo->commit();

            return true;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('NodeBackupPolicy setNodeIds failed: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * @return list<int>
     */
    public static function getMirrorDestinationIds(int $policyId): array
    {
        if ($policyId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT destination_id FROM ' . self::$mirrorsTable . ' WHERE policy_id = :policy_id');
        $stmt->execute(['policy_id' => $policyId]);

        return array_map('intval', $stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    /**
     * @param list<int> $destinationIds
     */
    public static function setMirrorDestinationIds(int $policyId, array $destinationIds): bool
    {
        if ($policyId <= 0) {
            return false;
        }
        $policy = self::getPolicyById($policyId);
        if (!$policy) {
            return false;
        }

        $primaryId = (int) ($policy['primary_destination_id'] ?? 0);
        $destinationIds = array_values(array_unique(array_filter(
            array_map('intval', $destinationIds),
            fn (int $id) => $id > 0 && $id !== $primaryId
        )));
        foreach ($destinationIds as $destId) {
            if (!NodeBackupDestination::getById($destId)) {
                App::getInstance(true)->getLogger()->error('NodeBackupPolicy: invalid mirror destination_id ' . $destId);

                return false;
            }
        }

        $pdo = Database::getPdoConnection();
        try {
            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM ' . self::$mirrorsTable . ' WHERE policy_id = :policy_id')
                ->execute(['policy_id' => $policyId]);
            if ($destinationIds !== []) {
                $link = $pdo->prepare(
                    'INSERT INTO ' . self::$mirrorsTable . ' (policy_id, destination_id) VALUES (:policy_id, :destination_id)'
                );
                foreach ($destinationIds as $destId) {
                    $link->execute(['policy_id' => $policyId, 'destination_id' => $destId]);
                }
            }
            $pdo->commit();

            return true;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('NodeBackupPolicy setMirrorDestinationIds failed: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Resolve target nodes for a policy.
     *
     * @return list<array<string, mixed>>
     */
    public static function resolveTargetNodes(array $policy): array
    {
        $scope = (string) ($policy['scope_type'] ?? '');
        if ($scope === self::SCOPE_ALL_NODES) {
            return Node::getAllNodes();
        }
        if ($scope === self::SCOPE_NODES) {
            $ids = self::getNodeIdsForPolicy((int) ($policy['id'] ?? 0));
            if ($ids === []) {
                return [];
            }
            $byId = Node::getNodesByIds($ids);
            $nodes = [];
            foreach ($ids as $id) {
                if (isset($byId[$id])) {
                    $nodes[] = $byId[$id];
                }
            }

            return $nodes;
        }

        return [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function getDuePolicies(): array
    {
        $pdo = Database::getPdoConnection();
        $now = gmdate('Y-m-d H:i:s');
        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::$table . ' WHERE is_active = 1 AND next_run_at <= :now AND is_processing = 0'
        );
        $stmt->bindValue(':now', $now, \PDO::PARAM_STR);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function resetStuckProcessing(int $stuckAfterMinutes = 30): int
    {
        if ($stuckAfterMinutes < 1) {
            return 0;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table
            . ' SET is_processing = 0, updated_at = UTC_TIMESTAMP()'
            . ' WHERE is_processing = 1 AND updated_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL :minutes MINUTE)'
        );
        $stmt->bindValue(':minutes', $stuckAfterMinutes, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount();
    }

    /**
     * Heartbeat while a node backup policy run is in progress.
     */
    public static function touchProcessing(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::$table
            . ' SET updated_at = UTC_TIMESTAMP()'
            . ' WHERE id = :id AND is_processing = 1'
        );
        $stmt->bindValue(':id', $id, \PDO::PARAM_INT);

        return $stmt->execute() && $stmt->rowCount() > 0;
    }

    /**
     * @param array<string, mixed> $data
     * @param list<int>|null $nodeIds null = leave targets unchanged
     * @param list<int>|null $mirrorDestinationIds null = leave mirrors unchanged
     */
    public static function updatePolicy(int $id, array $data, ?array $nodeIds = null, ?array $mirrorDestinationIds = null): bool
    {
        if ($id <= 0) {
            return false;
        }
        $existing = self::getPolicyById($id);
        if (!$existing) {
            return false;
        }

        unset($data['id'], $data['uuid'], $data['created_at']);

        if (isset($data['scope_type']) && !in_array((string) $data['scope_type'], self::SCOPE_TYPES, true)) {
            return false;
        }
        if (isset($data['mode']) && !in_array((string) $data['mode'], self::MODES, true)) {
            return false;
        }

        foreach (['is_active', 'is_processing', 'delete_local_after_upload', 'notify_on_failure'] as $flag) {
            if (array_key_exists($flag, $data)) {
                $normalized = self::normalizeBooleanFlag($data[$flag]);
                if ($normalized === null) {
                    return false;
                }
                $data[$flag] = $normalized;
            }
        }

        if (isset($data['concurrency'])) {
            $concurrency = (int) $data['concurrency'];
            if ($concurrency < 1) {
                $concurrency = 1;
            }
            if ($concurrency > 5) {
                $concurrency = 5;
            }
            $data['concurrency'] = $concurrency;
        }

        if (isset($data['retention_days'])) {
            $retentionDays = (int) $data['retention_days'];
            if ($retentionDays < 1) {
                $retentionDays = 1;
            }
            $data['retention_days'] = $retentionDays;
        }

        if (isset($data['primary_destination_id'])) {
            $primaryDestinationId = (int) $data['primary_destination_id'];
            if ($primaryDestinationId <= 0 || !NodeBackupDestination::getById($primaryDestinationId)) {
                return false;
            }
            $data['primary_destination_id'] = $primaryDestinationId;
        }

        $scopeType = (string) ($data['scope_type'] ?? $existing['scope_type']);

        $cronChanged = false;
        foreach (['cron_day_of_week', 'cron_month', 'cron_day_of_month', 'cron_hour', 'cron_minute', 'timezone'] as $cronField) {
            if (array_key_exists($cronField, $data) && (string) $data[$cronField] !== (string) ($existing[$cronField] ?? '')) {
                $cronChanged = true;
                break;
            }
        }

        if ($cronChanged && !isset($data['next_run_at'])) {
            $data['next_run_at'] = ServerSchedule::calculateNextRunTime(
                (string) ($data['cron_day_of_week'] ?? $existing['cron_day_of_week']),
                (string) ($data['cron_month'] ?? $existing['cron_month']),
                (string) ($data['cron_day_of_month'] ?? $existing['cron_day_of_month']),
                (string) ($data['cron_hour'] ?? $existing['cron_hour']),
                (string) ($data['cron_minute'] ?? $existing['cron_minute']),
                $existing['next_run_at'] ?? null,
                (string) ($data['timezone'] ?? $existing['timezone'] ?? 'UTC')
            );
        }

        $data['updated_at'] = gmdate('Y-m-d H:i:s');

        $pdo = Database::getPdoConnection();
        try {
            $pdo->beginTransaction();
            if ($data !== []) {
                $fields = array_keys($data);
                $set = implode(', ', array_map(fn ($f) => "$f = :$f", $fields));
                $params = $data;
                $params['id'] = $id;
                $stmt = $pdo->prepare('UPDATE ' . self::$table . ' SET ' . $set . ' WHERE id = :id');
                if (!$stmt->execute($params)) {
                    $pdo->rollBack();

                    return false;
                }
            }

            if ($nodeIds !== null) {
                $pdo->prepare('DELETE FROM ' . self::$nodesTable . ' WHERE policy_id = :policy_id')
                    ->execute(['policy_id' => $id]);
                if ($scopeType === self::SCOPE_NODES) {
                    $nodeIds = array_values(array_unique(array_filter(array_map('intval', $nodeIds), fn (int $nid) => $nid > 0)));
                    if ($nodeIds === []) {
                        $pdo->rollBack();

                        return false;
                    }
                    $link = $pdo->prepare('INSERT INTO ' . self::$nodesTable . ' (policy_id, node_id) VALUES (:policy_id, :node_id)');
                    foreach ($nodeIds as $nodeId) {
                        if (!Node::getNodeById($nodeId)) {
                            $pdo->rollBack();

                            return false;
                        }
                        $link->execute(['policy_id' => $id, 'node_id' => $nodeId]);
                    }
                }
            }

            if ($mirrorDestinationIds !== null) {
                $primaryId = (int) ($data['primary_destination_id'] ?? $existing['primary_destination_id']);
                $mirrorDestinationIds = array_values(array_unique(array_filter(
                    array_map('intval', $mirrorDestinationIds),
                    fn (int $mid) => $mid > 0 && $mid !== $primaryId
                )));
                $pdo->prepare('DELETE FROM ' . self::$mirrorsTable . ' WHERE policy_id = :policy_id')
                    ->execute(['policy_id' => $id]);
                if ($mirrorDestinationIds !== []) {
                    $link = $pdo->prepare(
                        'INSERT INTO ' . self::$mirrorsTable . ' (policy_id, destination_id) VALUES (:policy_id, :destination_id)'
                    );
                    foreach ($mirrorDestinationIds as $destId) {
                        if (!NodeBackupDestination::getById($destId)) {
                            $pdo->rollBack();

                            return false;
                        }
                        $link->execute(['policy_id' => $id, 'destination_id' => $destId]);
                    }
                }
            }

            $pdo->commit();

            return true;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('NodeBackupPolicy update failed: ' . $e->getMessage());

            return false;
        }
    }

    public static function deletePolicy(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        try {
            $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

            return $stmt->execute(['id' => $id]);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('NodeBackupPolicy delete failed: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * @return array{policies: list<array<string, mixed>>, total: int}
     */
    public static function searchPolicies(
        int $page = 1,
        int $limit = 10,
        string $search = '',
        string $sortBy = 'id',
        string $sortOrder = 'DESC',
    ): array {
        $allowedSort = ['id', 'name', 'scope_type', 'mode', 'is_active', 'next_run_at', 'last_run_at', 'created_at'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'id';
        }
        $sortOrder = strtoupper($sortOrder) === 'ASC' ? 'ASC' : 'DESC';
        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $pdo = Database::getPdoConnection();
        $where = [];
        $params = [];
        if ($search !== '') {
            $where[] = 'name LIKE :search';
            $params['search'] = '%' . $search . '%';
        }
        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . $whereSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $limit;
        $sql = 'SELECT * FROM ' . self::$table . $whereSql . " ORDER BY $sortBy $sortOrder LIMIT :limit OFFSET :offset";
        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return [
            'policies' => $stmt->fetchAll(\PDO::FETCH_ASSOC),
            'total' => $total,
        ];
    }

    private static function normalizeBooleanFlag(mixed $value): ?int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_int($value)) {
            return $value === 1 ? 1 : ($value === 0 ? 0 : null);
        }
        if (is_string($value)) {
            $lower = strtolower(trim($value));
            if (in_array($lower, ['1', 'true', 'yes', 'on'], true)) {
                return 1;
            }
            if (in_array($lower, ['0', 'false', 'no', 'off'], true)) {
                return 0;
            }
        }

        return null;
    }
}
