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

namespace App\Controllers\Admin;

use App\Chat\Database;
use App\Helpers\ApiResponse;
use App\Helpers\SpreadsheetSafe;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Panel wide audit log built on top of featherpanel_activity.
 */
class AuditLogController
{
    /**
     * Target categories derived from the activity name (first match wins).
     *
     * @var array<string, string[]>
     */
    private const TARGETS = [
        'auth' => ['login', 'logout', 'register', 'forgot_password', 'reset_password', 'two_fa_%', 'session%', 'account_deletion%', 'request_data_export'],
        'vm' => ['vm_%', '%vm_node%'],
        'allocation' => ['%allocation%'],
        'server' => ['%server%'],
        'node' => ['%node%'],
        'user' => ['%user%'],
        'database' => ['%database%'],
        'spell' => ['%spell%', '%realm%', '%image%'],
        'ticket' => ['%ticket%'],
        'knowledgebase' => ['%knowledgebase%'],
        'plugin' => ['%plugin%'],
        'security' => ['blocked_%', 'api_%', 'ssh_key%', '%role%', '%permission%', '%rate_limit%'],
        'settings' => ['%settings%', 'setup_wizard%', '%mail%', '%notification%', 'admin.%', '%location%', '%mount%', 'trigger_%', 'backup_schedule%', 'wings_backup%'],
    ];

    public function index(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 25)));
        [$where, $params] = $this->buildFilters($request);

        $pdo = Database::getPdoConnection();
        // The users join is only needed when a filter references it (free-text search).
        $join = preg_match('/\bu\./', $where) === 1 ? ' LEFT JOIN featherpanel_users u ON u.uuid = a.user_uuid' : '';
        $count = $pdo->prepare('SELECT COUNT(*) FROM featherpanel_activity a' . $join . $where);
        $count->execute($params);
        $total = (int) $count->fetchColumn();

        $rows = $this->fetchRows($where, $params, $limit, ($page - 1) * $limit);

        return ApiResponse::success([
            'items' => $rows,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => (int) ceil($total / $limit),
                'has_next' => $page * $limit < $total,
                'has_prev' => $page > 1,
            ],
        ], 'Audit log fetched', 200);
    }

    public function filters(Request $request): Response
    {
        $pdo = Database::getPdoConnection();
        $actions = $pdo->query('SELECT name, COUNT(*) AS total FROM featherpanel_activity GROUP BY name ORDER BY name ASC')->fetchAll(\PDO::FETCH_ASSOC);

        return ApiResponse::success([
            'actions' => array_map(static fn ($a) => ['name' => $a['name'], 'total' => (int) $a['total']], $actions),
            'targets' => array_merge(array_keys(self::TARGETS), ['other']),
        ], 'Audit log filters fetched', 200);
    }

    public function export(Request $request): Response
    {
        [$where, $params] = $this->buildFilters($request);
        $rows = $this->fetchRows($where, $params, 10000, 0);

        $out = fopen('php://temp', 'r+');
        fputcsv($out, ['id', 'created_at', 'username', 'email', 'user_uuid', 'action', 'target', 'context', 'ip_address'], ',', '"', '\\');
        foreach ($rows as $r) {
            fputcsv($out, array_map([SpreadsheetSafe::class, 'cell'], [
                $r['id'], $r['created_at'], $r['username'] ?? '', $r['email'] ?? '', $r['user_uuid'],
                $r['name'], $r['target'], $r['context'] ?? '', $r['ip_address'] ?? '',
            ]), ',', '"', '\\');
        }
        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);

        return new Response((string) $csv, 200, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="audit-log-' . date('Y-m-d') . '.csv"',
        ]);
    }

    /**
     * @return array{0: string, 1: array<string, mixed>}
     */
    private function buildFilters(Request $request): array
    {
        $clauses = [];
        $params = [];

        $search = trim((string) $request->query->get('search', ''));
        if ($search !== '') {
            $clauses[] = '(a.name LIKE :s1 OR a.context LIKE :s2 OR a.ip_address LIKE :s3 OR u.username LIKE :s4 OR u.email LIKE :s5)';
            for ($i = 1; $i <= 5; ++$i) {
                $params['s' . $i] = '%' . SpreadsheetSafe::likeLiteral($search) . '%';
            }
        }

        $user = trim((string) $request->query->get('user', ''));
        if ($user !== '') {
            // Resolve the username/email to a uuid first so the filter can use the
            // (user_uuid, created_at) index instead of scanning the whole activity table.
            $uuids = [$user];
            $lookup = Database::getPdoConnection()->prepare('SELECT uuid FROM featherpanel_users WHERE username = :user_name OR email = :user_email');
            $lookup->execute(['user_name' => $user, 'user_email' => $user]);
            foreach ($lookup->fetchAll(\PDO::FETCH_COLUMN) as $uuid) {
                $uuids[] = (string) $uuid;
            }
            $placeholders = [];
            foreach (array_values(array_unique($uuids)) as $i => $uuid) {
                $placeholders[] = ':user_uuid' . $i;
                $params['user_uuid' . $i] = $uuid;
            }
            $clauses[] = 'a.user_uuid IN (' . implode(', ', $placeholders) . ')';
        }

        $action = trim((string) $request->query->get('action', ''));
        if ($action !== '') {
            $clauses[] = 'a.name = :action';
            $params['action'] = $action;
        }

        $target = trim((string) $request->query->get('target', ''));
        if ($target !== '' && ($target === 'other' || isset(self::TARGETS[$target]))) {
            // The target is a pure function of the action name, so classify the (few) distinct
            // names once and filter with an indexable IN list instead of a CASE on every row.
            $names = $this->namesForTarget($target);
            if ($names === []) {
                $clauses[] = '1 = 0';
            } else {
                $placeholders = [];
                foreach ($names as $i => $name) {
                    $placeholders[] = ':target_name' . $i;
                    $params['target_name' . $i] = $name;
                }
                $clauses[] = 'a.name IN (' . implode(', ', $placeholders) . ')';
            }
        }

        foreach (['from' => '>=', 'to' => '<='] as $key => $op) {
            $value = trim((string) $request->query->get($key, ''));
            if ($value !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                $clauses[] = 'a.created_at ' . $op . ' :' . $key;
                $params[$key] = $value . ($key === 'from' ? ' 00:00:00' : ' 23:59:59');
            }
        }

        return [$clauses ? ' WHERE ' . implode(' AND ', $clauses) : '', $params];
    }

    /**
     * @param array<string, mixed> $params
     *
     * @return array<int, array<string, mixed>>
     */
    private function fetchRows(string $where, array $params, int $limit, int $offset): array
    {
        $sql = 'SELECT a.id, a.user_uuid, a.name, a.context, a.ip_address, a.created_at, ' . $this->targetExpression() . ' AS target, '
            . 'u.username, u.email, u.avatar FROM featherpanel_activity a LEFT JOIN featherpanel_users u ON u.uuid = a.user_uuid'
            . $where . ' ORDER BY a.created_at DESC, a.id DESC LIMIT :limit OFFSET :offset';
        $stmt = Database::getPdoConnection()->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return array_map(static function (array $r): array {
            $r['id'] = (int) $r['id'];

            return $r;
        }, $stmt->fetchAll(\PDO::FETCH_ASSOC));
    }

    /**
     * Distinct activity names that the target CASE maps to $target (same expression as the rows use).
     *
     * @return string[]
     */
    private function namesForTarget(string $target): array
    {
        $stmt = Database::getPdoConnection()->prepare(
            'SELECT a.name FROM (SELECT DISTINCT name FROM featherpanel_activity) a WHERE ' . $this->targetExpression() . ' = :target'
        );
        $stmt->execute(['target' => $target]);

        return array_values(array_map('strval', $stmt->fetchAll(\PDO::FETCH_COLUMN)));
    }

    /**
     * SQL CASE that maps an activity name to a target category. Patterns are constants, never user input.
     */
    private function targetExpression(): string
    {
        $case = 'CASE';
        foreach (self::TARGETS as $target => $patterns) {
            $likes = array_map(static fn (string $p) => "a.name LIKE '" . $p . "'", $patterns);
            $case .= ' WHEN ' . implode(' OR ', $likes) . " THEN '" . $target . "'";
        }

        return $case . " ELSE 'other' END";
    }
}
