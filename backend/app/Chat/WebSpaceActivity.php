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
 * WebSpace activity log (panel + Quilld ingest).
 */
class WebSpaceActivity
{
    private static string $table = 'featherpanel_webspace_activities';

    /**
     * @param array<string, mixed> $data webspace_id, web_node_id, event; optional user_id, metadata, ip, timestamp
     */
    public static function createActivity(array $data): int | false
    {
        $required = ['webspace_id', 'web_node_id', 'event'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                App::getInstance(true)->getLogger()->error('Missing required field: ' . $field . ' for WebSpace activity');

                return false;
            }
        }
        if (!is_numeric($data['webspace_id']) || (int) $data['webspace_id'] <= 0) {
            return false;
        }
        if (!is_numeric($data['web_node_id']) || (int) $data['web_node_id'] <= 0) {
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
        $placeholders = array_map(static fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($data) ? (int) $pdo->lastInsertId() : false;
    }

    /**
     * @return array{data: array<int, array<string, mixed>>, pagination: array<string, int|bool>}
     */
    public static function getActivitiesWithPagination(
        int $page = 1,
        int $perPage = 50,
        string $search = '',
        ?int $webspaceId = null,
    ): array {
        $pdo = Database::getPdoConnection();
        $where = [];
        $params = [];

        if ($search !== '') {
            $where[] = '(a.event LIKE :search OR a.metadata LIKE :search2)';
            $params['search'] = '%' . $search . '%';
            $params['search2'] = '%' . $search . '%';
        }
        if ($webspaceId !== null && $webspaceId > 0) {
            $where[] = 'a.webspace_id = :webspace_id';
            $params['webspace_id'] = $webspaceId;
        }

        $whereClause = $where !== [] ? 'WHERE ' . implode(' AND ', $where) : '';

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

        $activities = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
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
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $total > 0 ? $offset + 1 : 0,
                'to' => min($offset + $perPage, $total),
            ],
        ];
    }
}
