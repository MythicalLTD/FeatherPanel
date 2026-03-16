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
 * VmInstanceActivity service/model for CRUD operations on the featherpanel_vm_instance_activities table.
 *
 * VM instance–specific activity log (power, subuser, console, etc.), similar to ServerActivity for servers.
 */
class VmInstanceActivity
{
    private static string $table = 'featherpanel_vm_instance_activities';

    /**
     * Create a new VM instance activity log.
     *
     * @param array $data vm_instance_id, vm_node_id, event; optional: user_id, metadata, ip
     *
     * @return int|false The new activity's ID or false on failure
     */
    public static function createActivity(array $data): int | false
    {
        $required = ['vm_instance_id', 'vm_node_id', 'event'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for VM instance activity');

                return false;
            }
        }
        if (!is_numeric($data['vm_instance_id']) || (int) $data['vm_instance_id'] <= 0) {
            return false;
        }
        if (!is_numeric($data['vm_node_id']) || (int) $data['vm_node_id'] <= 0) {
            return false;
        }
        if (isset($data['user_id']) && $data['user_id'] !== null && (!is_numeric($data['user_id']) || (int) $data['user_id'] <= 0)) {
            return false;
        }
        if (!is_string($data['event']) || trim($data['event']) === '') {
            return false;
        }
        if (!isset($data['timestamp'])) {
            $data['timestamp'] = date('Y-m-d H:i:s');
        }
        if (isset($data['metadata']) && is_array($data['metadata'])) {
            $data['metadata'] = json_encode($data['metadata']);
        }

        $pdo = Database::getPdoConnection();
        $fields = array_keys($data);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($data) ? (int) $pdo->lastInsertId() : false;
    }

    public static function getActivityById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get activities by VM instance ID.
     *
     * @param int $vmInstanceId VM instance ID
     * @param int $limit Maximum number of results
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getActivitiesByVmInstanceId(int $vmInstanceId, int $limit = 100): array
    {
        if ($vmInstanceId <= 0) {
            return [];
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE vm_instance_id = :vm_instance_id ORDER BY timestamp DESC LIMIT :limit');
        $stmt->bindValue(':vm_instance_id', $vmInstanceId, \PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get activities with pagination (and optional search), for a single VM instance.
     *
     * @return array{data: array<int, array<string, mixed>>, pagination: array{current_page: int, per_page: int, total: int, last_page: int, from: int, to: int}}
     */
    public static function getActivitiesWithPagination(
        int $page = 1,
        int $perPage = 50,
        string $search = '',
        ?int $vmInstanceId = null,
    ): array {
        $pdo = Database::getPdoConnection();
        $where = [];
        $params = [];

        if ($search !== '') {
            $where[] = '(a.event LIKE :search OR a.metadata LIKE :search2)';
            $params['search'] = '%' . $search . '%';
            $params['search2'] = '%' . $search . '%';
        }
        if ($vmInstanceId !== null && $vmInstanceId > 0) {
            $where[] = 'a.vm_instance_id = :vm_instance_id';
            $params['vm_instance_id'] = $vmInstanceId;
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $countSql = 'SELECT COUNT(*) FROM ' . self::$table . ' a ' . $whereClause;
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $totalPages = max(1, (int) ceil($total / $perPage));

        $sql = 'SELECT a.*,
                       u.username AS user_username,
                       u.avatar AS user_avatar,
                       r.name AS user_role_name
                FROM ' . self::$table . ' a
                LEFT JOIN featherpanel_users u ON a.user_id = u.id
                LEFT JOIN featherpanel_roles r ON u.role_id = r.id
                ' . $whereClause . '
                ORDER BY a.timestamp DESC
                LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $activities = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($activities as &$activity) {
            if (isset($activity['metadata']) && $activity['metadata'] !== null && $activity['metadata'] !== '') {
                $decoded = json_decode($activity['metadata'], true);
                $activity['metadata'] = $decoded !== null ? $decoded : null;
            } else {
                $activity['metadata'] = null;
            }
            if (isset($activity['user_id']) && $activity['user_id'] !== null && isset($activity['user_username'])) {
                $activity['user'] = [
                    'username' => $activity['user_username'],
                    'avatar' => $activity['user_avatar'],
                    'role' => $activity['user_role_name'],
                ];
            } else {
                $activity['user'] = null;
            }
            unset($activity['user_username'], $activity['user_avatar'], $activity['user_role_name']);
        }

        return [
            'data' => $activities,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => $totalPages,
                'from' => $total > 0 ? $offset + 1 : 0,
                'to' => min($offset + $perPage, $total),
            ],
        ];
    }
}
