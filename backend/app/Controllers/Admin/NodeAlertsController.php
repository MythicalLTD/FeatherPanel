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

use App\Chat\Activity;
use App\Chat\Database;
use App\Helpers\ApiResponse;
use App\Middleware\AuthMiddleware;
use App\CloudFlare\CloudFlareRealIP;
use App\Services\NodeAlerts\NodeAlertPolicy;
use App\Services\NodeAlerts\NodeAlertService;
use App\Services\NodeAlerts\NodeAlertWebhook;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Node health monitor: stored heartbeat per node, open alerts, failed backups,
 * alert history and the alert settings (thresholds and channels).
 */
class NodeAlertsController
{
    public function overview(Request $request): Response
    {
        $pdo = Database::getPdoConnection();
        $health = [];
        foreach ($pdo->query('SELECT * FROM featherpanel_node_health')->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $health[(int) $row['node_id']] = [
                'online' => (int) $row['online'] === 1,
                'consecutive_failures' => (int) $row['consecutive_failures'],
                'last_seen_at' => $row['last_seen_at'],
                'last_checked_at' => $row['last_checked_at'],
                'last_error' => $row['last_error'],
            ];
        }
        $failed = [];
        $stmt = $pdo->query(
            'SELECT s.node_id, b.id, b.name, b.completed_at, s.name AS server_name, s.uuidShort
             FROM featherpanel_server_backups b JOIN featherpanel_servers s ON s.id = b.server_id
             WHERE b.is_successful = 0 AND b.completed_at IS NOT NULL AND b.deleted_at IS NULL
               AND b.completed_at >= (NOW() - INTERVAL 7 DAY)
             ORDER BY b.completed_at DESC LIMIT 200'
        );
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $nodeId = (int) $row['node_id'];
            $failed[$nodeId] ??= ['count' => 0, 'recent' => []];
            ++$failed[$nodeId]['count'];
            if (count($failed[$nodeId]['recent']) < 5) {
                $failed[$nodeId]['recent'][] = [
                    'id' => (int) $row['id'],
                    'name' => $row['name'],
                    'server_name' => $row['server_name'],
                    'server_uuid_short' => $row['uuidShort'],
                    'completed_at' => $row['completed_at'],
                ];
            }
        }
        $open = $pdo->query("SELECT * FROM featherpanel_node_alerts WHERE status = 'open' ORDER BY FIELD(severity, 'critical', 'warning', 'info'), created_at DESC LIMIT 100")->fetchAll(\PDO::FETCH_ASSOC);
        $policy = NodeAlertPolicy::get();
        $lastRun = $pdo->query('SELECT MAX(last_checked_at) FROM featherpanel_node_health')->fetchColumn();

        return ApiResponse::success([
            'health' => (object) $health,
            'failed_backups' => (object) $failed,
            'open_alerts' => array_map([$this, 'present'], $open),
            'monitor' => [
                'enabled' => $policy['enabled'],
                'last_run_at' => $lastRun ?: null,
            ],
        ], 'Node alert overview loaded');
    }

    public function history(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 20)));
        $where = [];
        $params = [];
        $type = (string) $request->query->get('type', '');
        if (in_array($type, NodeAlertService::TYPES, true)) {
            $where[] = 'a.type = :type';
            $params['type'] = $type;
        }
        $status = (string) $request->query->get('status', '');
        if (in_array($status, ['open', 'resolved'], true)) {
            $where[] = 'a.status = :status';
            $params['status'] = $status;
        }
        $nodeId = (int) $request->query->get('node_id', 0);
        if ($nodeId > 0) {
            $where[] = 'a.node_id = :node';
            $params['node'] = $nodeId;
        }
        $search = trim((string) $request->query->get('search', ''));
        if ($search !== '') {
            $where[] = 'a.message LIKE :search';
            $params['search'] = '%' . addcslashes(mb_substr($search, 0, 100), '%_\\') . '%';
        }
        $sql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $pdo = Database::getPdoConnection();
        $count = $pdo->prepare('SELECT COUNT(*) FROM featherpanel_node_alerts a' . $sql);
        $count->execute($params);
        $total = (int) $count->fetchColumn();
        $stmt = $pdo->prepare('SELECT a.*, n.name AS node_name FROM featherpanel_node_alerts a LEFT JOIN featherpanel_nodes n ON n.id = a.node_id' . $sql . ' ORDER BY a.id DESC LIMIT ' . $limit . ' OFFSET ' . (($page - 1) * $limit));
        $stmt->execute($params);

        return ApiResponse::success([
            'items' => array_map([$this, 'present'], $stmt->fetchAll(\PDO::FETCH_ASSOC)),
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => (int) ceil($total / $limit),
                'has_next' => $page * $limit < $total,
                'has_prev' => $page > 1,
            ],
        ], 'Node alert history loaded');
    }

    public function resolve(Request $request, int $id): Response
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare("UPDATE featherpanel_node_alerts SET status = 'resolved', resolved_at = NOW() WHERE id = :id AND status = 'open'");
        $stmt->execute(['id' => $id]);
        if ($stmt->rowCount() === 0) {
            return ApiResponse::error('Alert not found or already resolved', 'NODE_ALERT_NOT_FOUND', 404);
        }
        $this->log($request, 'node_alert_resolve', 'Resolved node alert #' . $id . ' by hand');

        return ApiResponse::success([], 'Alert resolved');
    }

    public function settings(Request $request): Response
    {
        return ApiResponse::success(['settings' => NodeAlertPolicy::forDisplay(), 'allow_private_webhook' => NodeAlertWebhook::allowPrivate()], 'Node alert settings loaded');
    }

    public function updateSettings(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }
        $current = NodeAlertPolicy::get();
        // Keep the stored secret unless a new one is sent or it is cleared on purpose.
        if (!array_key_exists('webhook_secret', $data) || $data['webhook_secret'] === null) {
            $data['webhook_secret'] = $current['webhook_secret'];
        }
        $merged = NodeAlertPolicy::normalize(array_merge($current, $data));
        if ($merged['channel_webhook'] && $merged['webhook_url'] === '') {
            return ApiResponse::error('Enter a webhook URL or turn the webhook channel off', 'NODE_ALERT_WEBHOOK_REQUIRED', 422);
        }
        if ($merged['webhook_url'] !== '') {
            [$pin, $error] = NodeAlertWebhook::pin($merged['webhook_url']);
            if ($pin === null) {
                return ApiResponse::error(match ($error) {
                    'NODE_ALERT_WEBHOOK_NOT_HTTPS' => 'The webhook URL must use https',
                    'NODE_ALERT_WEBHOOK_UNRESOLVABLE' => 'The webhook host does not resolve',
                    'NODE_ALERT_WEBHOOK_PRIVATE_ADDRESS' => 'The webhook host resolves to a private or reserved address',
                    default => 'The webhook URL is not valid',
                }, (string) $error, 422);
            }
        }
        if (!NodeAlertPolicy::save($merged)) {
            return ApiResponse::error('Failed to save node alert settings', 'NODE_ALERT_SETTINGS_SAVE_FAILED', 500);
        }
        $this->log($request, 'node_alert_settings_update', 'Updated node alert settings');

        return ApiResponse::success(['settings' => NodeAlertPolicy::forDisplay()], 'Node alert settings saved');
    }

    public function test(Request $request): Response
    {
        $policy = NodeAlertPolicy::get();
        if (!$policy['channel_inbox'] && !$policy['channel_email'] && !$policy['channel_webhook']) {
            return ApiResponse::error('Turn on at least one channel first', 'NODE_ALERT_NO_CHANNELS', 422);
        }
        $result = (new NodeAlertService())->sendTest();
        $this->log($request, 'node_alert_test', 'Sent a test node alert');

        return ApiResponse::success(['channels' => $result], 'Test alert sent');
    }

    public function evaluate(Request $request): Response
    {
        $stats = (new NodeAlertService())->evaluate();
        $this->log($request, 'node_alert_check_now', 'Ran the node health check by hand');

        return ApiResponse::success(['stats' => $stats], 'Node health check finished');
    }

    private function present(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'node_id' => $row['node_id'] !== null ? (int) $row['node_id'] : null,
            'node_name' => $row['node_name'] ?? null,
            'type' => $row['type'],
            'severity' => $row['severity'],
            'status' => $row['status'],
            'message' => $row['message'],
            'details' => json_decode((string) ($row['details'] ?? ''), true) ?: new \stdClass(),
            'occurrences' => (int) $row['occurrences'],
            'last_notified_at' => $row['last_notified_at'],
            'resolved_at' => $row['resolved_at'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }

    private function log(Request $request, string $name, string $context): void
    {
        $admin = AuthMiddleware::getCurrentUser($request);
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => $name,
            'context' => $context,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
    }
}
