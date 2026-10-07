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
 * Admin backup policy CRUD for featherpanel_backup_policies.
 */
class BackupPolicy
{
    public const SCOPE_SERVERS = 'servers';
    public const SCOPE_NODE = 'node';
    public const SCOPE_ALL = 'all';

    /** @var list<string> */
    public const SCOPE_TYPES = [self::SCOPE_SERVERS, self::SCOPE_NODE, self::SCOPE_ALL];

    private static string $table = 'featherpanel_backup_policies';
    private static string $serversTable = 'featherpanel_backup_policy_servers';

    /**
     * @param array<string, mixed> $data
     * @param list<int> $serverIds
     */
    public static function createPolicy(array $data, array $serverIds = []): int | false
    {
        $required = [
            'name',
            'scope_type',
            'cron_day_of_week',
            'cron_month',
            'cron_day_of_month',
            'cron_hour',
            'cron_minute',
            'backup_payload',
        ];

        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim((string) $data[$field]) === '')) {
                App::getInstance(true)->getLogger()->error('BackupPolicy: missing required field ' . $field);

                return false;
            }
        }

        $scopeType = (string) $data['scope_type'];
        if (!in_array($scopeType, self::SCOPE_TYPES, true)) {
            App::getInstance(true)->getLogger()->error('BackupPolicy: invalid scope_type ' . $scopeType);

            return false;
        }

        $nodeId = isset($data['node_id']) ? (int) $data['node_id'] : null;
        if ($scopeType === self::SCOPE_NODE) {
            if ($nodeId === null || $nodeId <= 0 || !Node::getNodeById($nodeId)) {
                App::getInstance(true)->getLogger()->error('BackupPolicy: invalid node_id for node scope');

                return false;
            }
        } else {
            $nodeId = null;
        }

        if ($scopeType === self::SCOPE_SERVERS) {
            $serverIds = array_values(array_unique(array_filter(array_map('intval', $serverIds), fn (int $id) => $id > 0)));
            if ($serverIds === []) {
                App::getInstance(true)->getLogger()->error('BackupPolicy: servers scope requires at least one server');

                return false;
            }
            foreach ($serverIds as $serverId) {
                if (!Server::getServerById($serverId)) {
                    App::getInstance(true)->getLogger()->error('BackupPolicy: invalid server_id ' . $serverId);

                    return false;
                }
            }
        } else {
            $serverIds = [];
        }

        $isActive = self::normalizeBooleanFlag($data['is_active'] ?? 1);
        $isProcessing = self::normalizeBooleanFlag($data['is_processing'] ?? 0);
        $onlyWhenOnline = self::normalizeBooleanFlag($data['only_when_online'] ?? 0);
        $notifyOnFailure = self::normalizeBooleanFlag($data['notify_on_failure'] ?? 1);
        if ($isActive === null || $isProcessing === null || $onlyWhenOnline === null || $notifyOnFailure === null) {
            App::getInstance(true)->getLogger()->error('BackupPolicy: invalid boolean flag');

            return false;
        }

        $concurrency = isset($data['concurrency']) ? (int) $data['concurrency'] : 2;
        if ($concurrency < 1) {
            $concurrency = 1;
        }
        if ($concurrency > 5) {
            $concurrency = 5;
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

        $insert = [
            'uuid' => $uuid,
            'name' => trim((string) $data['name']),
            'scope_type' => $scopeType,
            'node_id' => $nodeId,
            'cron_day_of_week' => (string) $data['cron_day_of_week'],
            'cron_month' => (string) $data['cron_month'],
            'cron_day_of_month' => (string) $data['cron_day_of_month'],
            'cron_hour' => (string) $data['cron_hour'],
            'cron_minute' => (string) $data['cron_minute'],
            'timezone' => $timezone,
            'is_active' => $isActive,
            'is_processing' => $isProcessing,
            'only_when_online' => $onlyWhenOnline,
            'backup_payload' => (string) $data['backup_payload'],
            'concurrency' => $concurrency,
            'notify_on_failure' => $notifyOnFailure,
            'next_run_at' => $nextRunAt,
            'created_at' => gmdate('Y-m-d H:i:s'),
            'updated_at' => gmdate('Y-m-d H:i:s'),
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
            if ($serverIds !== []) {
                $link = $pdo->prepare('INSERT INTO ' . self::$serversTable . ' (policy_id, server_id) VALUES (:policy_id, :server_id)');
                foreach ($serverIds as $serverId) {
                    $link->execute(['policy_id' => $policyId, 'server_id' => $serverId]);
                }
            }
            $pdo->commit();

            return $policyId;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('BackupPolicy create failed: ' . $e->getMessage());

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
    public static function getServerIdsForPolicy(int $policyId): array
    {
        if ($policyId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT server_id FROM ' . self::$serversTable . ' WHERE policy_id = :policy_id');
        $stmt->execute(['policy_id' => $policyId]);

        return array_map('intval', $stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    /**
     * Resolve target servers for a policy.
     *
     * @return list<array<string, mixed>>
     */
    public static function resolveTargetServers(array $policy): array
    {
        $scope = (string) ($policy['scope_type'] ?? '');
        if ($scope === self::SCOPE_ALL) {
            return Server::getAllServers();
        }
        if ($scope === self::SCOPE_NODE) {
            $nodeId = (int) ($policy['node_id'] ?? 0);

            return $nodeId > 0 ? Server::getServersByNodeId($nodeId) : [];
        }
        if ($scope === self::SCOPE_SERVERS) {
            $ids = self::getServerIdsForPolicy((int) $policy['id']);
            $servers = [];
            foreach ($ids as $id) {
                $server = Server::getServerById($id);
                if ($server) {
                    $servers[] = $server;
                }
            }

            return $servers;
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
     * @param array<string, mixed> $data
     * @param list<int>|null $serverIds null = leave targets unchanged
     */
    public static function updatePolicy(int $id, array $data, ?array $serverIds = null): bool
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

        foreach (['is_active', 'is_processing', 'only_when_online', 'notify_on_failure'] as $flag) {
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

        $scopeType = (string) ($data['scope_type'] ?? $existing['scope_type']);
        if ($scopeType === self::SCOPE_NODE) {
            $nodeId = isset($data['node_id']) ? (int) $data['node_id'] : (int) ($existing['node_id'] ?? 0);
            if ($nodeId <= 0 || !Node::getNodeById($nodeId)) {
                return false;
            }
            $data['node_id'] = $nodeId;
        } elseif (array_key_exists('scope_type', $data) || array_key_exists('node_id', $data)) {
            $data['node_id'] = null;
        }

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

            if ($serverIds !== null) {
                $pdo->prepare('DELETE FROM ' . self::$serversTable . ' WHERE policy_id = :policy_id')
                    ->execute(['policy_id' => $id]);
                if ($scopeType === self::SCOPE_SERVERS) {
                    $serverIds = array_values(array_unique(array_filter(array_map('intval', $serverIds), fn (int $sid) => $sid > 0)));
                    if ($serverIds === []) {
                        $pdo->rollBack();

                        return false;
                    }
                    $link = $pdo->prepare('INSERT INTO ' . self::$serversTable . ' (policy_id, server_id) VALUES (:policy_id, :server_id)');
                    foreach ($serverIds as $serverId) {
                        if (!Server::getServerById($serverId)) {
                            $pdo->rollBack();

                            return false;
                        }
                        $link->execute(['policy_id' => $id, 'server_id' => $serverId]);
                    }
                }
            }

            $pdo->commit();

            return true;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            App::getInstance(true)->getLogger()->error('BackupPolicy update failed: ' . $e->getMessage());

            return false;
        }
    }

    public static function deletePolicy(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
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
        $allowedSort = ['id', 'name', 'scope_type', 'is_active', 'next_run_at', 'last_run_at', 'created_at'];
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
