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

namespace App\Services\NodeAlerts;

use App\App;
use App\Chat\Node;
use App\Chat\Database;
use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\UserNotification;
use App\Config\ConfigInterface;
use App\Helpers\NodeStatusHelper;

/**
 * Evaluates node health and raises or resolves alerts: node down (N failed checks in a row),
 * disk nearly full (a configurable share of the node disk) and failed backups.
 * An alert is stored once per fingerprint while it is open; repeat notifications wait for
 * the cooldown, and a resolved notice is sent when the condition clears.
 */
class NodeAlertService
{
    public const TYPE_NODE_DOWN = 'node_down';
    public const TYPE_DISK_FULL = 'disk_full';
    public const TYPE_BACKUP_FAILED = 'backup_failed';
    public const TYPE_TEST = 'test';

    public const TYPES = [self::TYPE_NODE_DOWN, self::TYPE_DISK_FULL, self::TYPE_BACKUP_FAILED, self::TYPE_TEST];

    /** Disk alerts clear a little below the threshold so a node at the edge does not flap. */
    private const DISK_HYSTERESIS = 2;

    private const BACKUP_WATERMARK_KEY = 'node_alerts_backup_watermark';

    private const HISTORY_RETENTION_DAYS = 90;

    /** @var (callable(array): array)|null test seam replacing the Wings probe */
    public static $prober;

    /** @var array<int, array>|null */
    private ?array $recipients = null;

    /**
     * Run one evaluation. Returns counters for the cron log.
     *
     * @return array{nodes: int, raised: int, resolved: int, notified: int}
     */
    public function evaluate(): array
    {
        $policy = NodeAlertPolicy::get();
        $stats = ['nodes' => 0, 'raised' => 0, 'resolved' => 0, 'notified' => 0];
        $nodes = Node::getAllNodes();
        $stats['nodes'] = count($nodes);
        $probes = $nodes === [] ? [] : (self::$prober !== null ? (self::$prober)($nodes) : NodeStatusHelper::probeNodesUtilization($nodes));
        $pdo = Database::getPdoConnection();

        foreach ($nodes as $node) {
            $nodeId = (int) $node['id'];
            $probe = $probes[$nodeId] ?? ['status' => 'unhealthy', 'utilization' => null, 'error' => 'No probe result'];
            $u = is_array($probe['utilization'] ?? null) ? $probe['utilization'] : [];
            $online = ($probe['status'] ?? '') === 'healthy' && $u !== [];
            $health = $this->recordHealth($nodeId, $online, $u, $online ? null : (string) ($probe['error'] ?? 'Unreachable'));
            if (!$policy['enabled']) {
                continue;
            }
            $label = (string) $node['name'];
            $maintenance = in_array((string) ($node['maintenance_mode'] ?? 'false'), ['true', '1'], true);

            $downKey = self::TYPE_NODE_DOWN . ':' . $nodeId;
            if ($online || !$policy['node_down_enabled'] || $maintenance) {
                $stats['resolved'] += $this->resolve($downKey, $policy, $online ? 'Node ' . $label . ' is reachable again' : null);
            } elseif ((int) $health['consecutive_failures'] >= $policy['node_down_after_checks']) {
                $r = $this->raise($nodeId, self::TYPE_NODE_DOWN, $downKey, 'critical', 'Node ' . $label . ' is not responding', [
                    'node' => $label,
                    'failures' => (int) $health['consecutive_failures'],
                    'error' => mb_substr((string) ($probe['error'] ?? ''), 0, 300),
                ], $policy);
                $stats['raised'] += $r['new'];
                $stats['notified'] += $r['notified'];
            }

            $diskKey = self::TYPE_DISK_FULL . ':' . $nodeId;
            $diskTotal = (float) ($u['disk_total'] ?? 0);
            if ($online && $diskTotal > 0) {
                $pct = (int) floor(((float) ($u['disk_used'] ?? 0) / $diskTotal) * 100);
                if ($policy['disk_enabled'] && $pct >= $policy['disk_warning_percent']) {
                    $r = $this->raise($nodeId, self::TYPE_DISK_FULL, $diskKey, $pct >= 98 ? 'critical' : 'warning', 'Node ' . $label . ' disk is ' . $pct . '% full', [
                        'node' => $label,
                        'percent' => $pct,
                        'threshold' => $policy['disk_warning_percent'],
                        'disk_used' => (int) ($u['disk_used'] ?? 0),
                        'disk_total' => (int) $diskTotal,
                    ], $policy);
                    $stats['raised'] += $r['new'];
                    $stats['notified'] += $r['notified'];
                } elseif (!$policy['disk_enabled'] || $pct < $policy['disk_warning_percent'] - self::DISK_HYSTERESIS) {
                    $stats['resolved'] += $this->resolve($diskKey, $policy, 'Node ' . $label . ' disk is back to ' . $pct . '%');
                }
            }
        }

        if ($policy['enabled']) {
            $r = $this->checkBackups($policy);
            $stats['raised'] += $r['raised'];
            $stats['resolved'] += $r['resolved'];
            $stats['notified'] += $r['notified'];
        }

        $pdo->exec('DELETE FROM featherpanel_node_alerts WHERE status = \'resolved\' AND created_at < (NOW() - INTERVAL ' . self::HISTORY_RETENTION_DAYS . ' DAY)');

        return $stats;
    }

    /**
     * Send an alert over every enabled channel.
     *
     * @return array<string, string> channel => "sent" | "skipped" | error
     */
    public function deliver(array $alert, array $policy): array
    {
        $result = ['inbox' => 'skipped', 'email' => 'skipped', 'webhook' => 'skipped'];
        $config = App::getInstance(true)->getConfig();
        $appName = (string) $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
        $link = '/admin/nodes/status';
        $prefix = match ($alert['state']) {
            'resolved' => 'Resolved',
            'ongoing' => 'Still happening',
            'test' => 'Test',
            default => 'Alert',
        };
        $title = $prefix . ': ' . $alert['message'];

        if ($policy['channel_inbox'] || $policy['channel_email']) {
            foreach ($this->recipients() as $user) {
                if ($policy['channel_inbox']) {
                    $ok = UserNotification::notify((int) $user['id'], UserNotification::KIND_NODE_ALERT, [
                        'alert_type' => $alert['type'],
                        'state' => $alert['state'],
                        'severity' => $alert['severity'],
                        'message' => mb_substr((string) $alert['message'], 0, 300),
                        'node_name' => mb_substr((string) ($alert['details']['node'] ?? ''), 0, 120),
                    ], $link, 'node_alert:' . $alert['type'] . ':' . ($alert['node_id'] ?? 0) . ':' . $alert['state']);
                    $result['inbox'] = $ok === false ? 'failed' : 'sent';
                }
                if ($policy['channel_email'] && !empty($user['email'])) {
                    $result['email'] = $this->email($user, $appName, $title, $alert, rtrim((string) $config->getSetting(ConfigInterface::APP_URL, ''), '/') . $link);
                }
            }
            if ($this->recipients() === []) {
                $result['inbox'] = $policy['channel_inbox'] ? 'no_recipients' : 'skipped';
                $result['email'] = $policy['channel_email'] ? 'no_recipients' : 'skipped';
            }
        }

        if ($policy['channel_webhook'] && $policy['webhook_url'] !== '') {
            $error = NodeAlertWebhook::send($policy['webhook_url'], $policy['webhook_secret'], [
                'event' => 'node_alert.' . $alert['state'],
                'alert' => [
                    'id' => $alert['id'],
                    'type' => $alert['type'],
                    'severity' => $alert['severity'],
                    'state' => $alert['state'],
                    'message' => $alert['message'],
                    'node_id' => $alert['node_id'],
                    'details' => $alert['details'],
                ],
                'panel' => ['name' => $appName, 'url' => (string) $config->getSetting(ConfigInterface::APP_URL, '')],
                'sent_at' => gmdate('c'),
            ]);
            $result['webhook'] = $error === null ? 'sent' : $error;
            if ($error !== null) {
                App::getInstance(true)->getLogger()->warning('Node alert webhook failed: ' . $error);
            }
        }

        return $result;
    }

    /** Send a test alert over the configured channels and keep it in the history. */
    public function sendTest(): array
    {
        $policy = NodeAlertPolicy::get();
        $pdo = Database::getPdoConnection();
        $pdo->prepare('INSERT INTO featherpanel_node_alerts (node_id, type, fingerprint, severity, status, message, details, last_notified_at, resolved_at) VALUES (NULL, :t, :f, \'info\', \'resolved\', :m, \'{}\', NOW(), NOW())')
            ->execute(['t' => self::TYPE_TEST, 'f' => 'test:' . bin2hex(random_bytes(6)), 'm' => 'This is a test node alert']);
        $id = (int) $pdo->lastInsertId();

        return $this->deliver(['id' => $id, 'node_id' => null, 'type' => self::TYPE_TEST, 'severity' => 'info', 'message' => 'This is a test node alert', 'details' => [], 'state' => 'test'], $policy);
    }

    /** @return array<string, mixed> the stored health row */
    private function recordHealth(int $nodeId, bool $online, array $u, ?string $error): array
    {
        $pdo = Database::getPdoConnection();
        $sql = 'INSERT INTO featherpanel_node_health (node_id, online, consecutive_failures, last_seen_at, last_checked_at, last_error, cpu_percent, memory_used, memory_total, disk_used, disk_total)
            VALUES (:id, :online, :fail, ' . ($online ? 'NOW()' : 'NULL') . ', NOW(), :err, :cpu, :mu, :mt, :du, :dt)
            ON DUPLICATE KEY UPDATE online = VALUES(online),
                consecutive_failures = ' . ($online ? '0' : 'consecutive_failures + 1') . ',
                last_seen_at = ' . ($online ? 'NOW()' : 'last_seen_at') . ',
                last_checked_at = NOW(), last_error = VALUES(last_error)'
            . ($online ? ', cpu_percent = VALUES(cpu_percent), memory_used = VALUES(memory_used), memory_total = VALUES(memory_total), disk_used = VALUES(disk_used), disk_total = VALUES(disk_total)' : '');
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'id' => $nodeId,
            'online' => $online ? 1 : 0,
            'fail' => $online ? 0 : 1,
            'err' => $error !== null ? mb_substr($error, 0, 500) : null,
            'cpu' => $online && isset($u['cpu_percent']) ? round((float) $u['cpu_percent'], 2) : null,
            'mu' => $online && isset($u['memory_used']) ? (int) $u['memory_used'] : null,
            'mt' => $online && isset($u['memory_total']) ? (int) $u['memory_total'] : null,
            'du' => $online && isset($u['disk_used']) ? (int) $u['disk_used'] : null,
            'dt' => $online && isset($u['disk_total']) ? (int) $u['disk_total'] : null,
        ]);
        $row = $pdo->prepare('SELECT * FROM featherpanel_node_health WHERE node_id = :id');
        $row->execute(['id' => $nodeId]);

        return $row->fetch(\PDO::FETCH_ASSOC) ?: ['consecutive_failures' => 0];
    }

    /** @return array{raised: int, resolved: int, notified: int} */
    private function checkBackups(array $policy): array
    {
        $out = ['raised' => 0, 'resolved' => 0, 'notified' => 0];
        $pdo = Database::getPdoConnection();
        $config = App::getInstance(true)->getConfig();
        $cursor = self::parseBackupCursor($config->getSetting(self::BACKUP_WATERMARK_KEY, null));
        if ($cursor === null) {
            // First run (or the old id-only watermark): start from now so old failures do not alert at once.
            $last = $pdo->query('SELECT completed_at, id FROM featherpanel_server_backups WHERE completed_at IS NOT NULL ORDER BY completed_at DESC, id DESC LIMIT 1')->fetch(\PDO::FETCH_ASSOC);
            $config->setSetting(self::BACKUP_WATERMARK_KEY, self::formatBackupCursor($last ? (string) $last['completed_at'] : '1970-01-01 00:00:01', $last ? (int) $last['id'] : 0));

            return $out;
        }
        // Walk by completion time, not by id: a backup that started earlier (lower id) but
        // finished after a newer one would otherwise fall behind the watermark and never alert.
        $stmt = $pdo->prepare(
            'SELECT b.id, b.uuid, b.name, b.is_successful, b.completed_at, s.id AS server_id, s.name AS server_name, s.uuidShort, s.node_id, n.name AS node_name
             FROM featherpanel_server_backups b
             JOIN featherpanel_servers s ON s.id = b.server_id
             LEFT JOIN featherpanel_nodes n ON n.id = s.node_id
             WHERE b.completed_at IS NOT NULL AND (b.completed_at > :t1 OR (b.completed_at = :t2 AND b.id > :id))
             ORDER BY b.completed_at ASC, b.id ASC LIMIT 500'
        );
        $stmt->execute(['t1' => $cursor[0], 't2' => $cursor[0], 'id' => $cursor[1]]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        if ($rows === []) {
            return $out;
        }
        // Group failures per node so a burst is one alert.
        $failed = [];
        $succeeded = [];
        foreach ($rows as $row) {
            $nodeId = (int) ($row['node_id'] ?? 0);
            if ((int) $row['is_successful'] === 1) {
                $succeeded[$nodeId] = true;
                unset($failed[$nodeId]);
                continue;
            }
            $failed[$nodeId][] = $row;
        }
        $tail = end($rows);
        $config->setSetting(self::BACKUP_WATERMARK_KEY, self::formatBackupCursor((string) $tail['completed_at'], (int) $tail['id']));

        foreach (array_keys($succeeded) as $nodeId) {
            if (!isset($failed[$nodeId])) {
                $out['resolved'] += $this->resolve(self::TYPE_BACKUP_FAILED . ':' . $nodeId, $policy, null);
            }
        }
        if (!$policy['backup_failed_enabled']) {
            return $out;
        }
        foreach ($failed as $nodeId => $list) {
            $last = end($list);
            $names = array_slice(array_map(static fn (array $r): string => (string) $r['server_name'], $list), 0, 5);
            $nodeLabel = (string) ($last['node_name'] ?? ('#' . $nodeId));
            $r = $this->raise(
                $nodeId > 0 ? $nodeId : null,
                self::TYPE_BACKUP_FAILED,
                self::TYPE_BACKUP_FAILED . ':' . $nodeId,
                'warning',
                count($list) === 1
                    ? 'Backup ' . $last['name'] . ' of ' . $last['server_name'] . ' failed on node ' . $nodeLabel
                    : count($list) . ' backups failed on node ' . $nodeLabel,
                ['node' => $nodeLabel, 'count' => count($list), 'servers' => array_values(array_unique($names)), 'backup' => (string) $last['name'], 'server' => (string) $last['server_name'], 'server_uuid_short' => (string) $last['uuidShort']],
                $policy,
                count($list)
            );
            $out['raised'] += $r['new'];
            $out['notified'] += $r['notified'];
        }

        return $out;
    }

    /**
     * Failed-backup scan position: "completed_at|id". Anything else (unset, or the old id-only
     * watermark) returns null so the scan restarts from now.
     *
     * @return array{0: string, 1: int}|null
     */
    public static function parseBackupCursor(mixed $raw): ?array
    {
        if (!is_string($raw) || !preg_match('/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\|(\d+)$/', $raw, $m)) {
            return null;
        }

        return [$m[1], (int) $m[2]];
    }

    public static function formatBackupCursor(string $completedAt, int $id): string
    {
        return substr($completedAt, 0, 19) . '|' . max(0, $id);
    }

    /** @return array{new: int, notified: int} */
    private function raise(?int $nodeId, string $type, string $fingerprint, string $severity, string $message, array $details, array $policy, int $occurrences = 1): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_node_alerts WHERE fingerprint = :f AND status = \'open\' ORDER BY id DESC LIMIT 1');
        $stmt->execute(['f' => $fingerprint]);
        $open = $stmt->fetch(\PDO::FETCH_ASSOC);
        $json = (string) json_encode($details, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($open === false) {
            $pdo->prepare('INSERT INTO featherpanel_node_alerts (node_id, type, fingerprint, severity, status, message, details, occurrences, last_notified_at) VALUES (:n, :t, :f, :s, \'open\', :m, :d, :o, NOW())')
                ->execute(['n' => $nodeId, 't' => $type, 'f' => $fingerprint, 's' => $severity, 'm' => mb_substr($message, 0, 500), 'd' => $json, 'o' => $occurrences]);
            $alert = ['id' => (int) $pdo->lastInsertId(), 'node_id' => $nodeId, 'type' => $type, 'severity' => $severity, 'message' => $message, 'details' => $details, 'state' => 'triggered'];
            $this->deliver($alert, $policy);

            return ['new' => 1, 'notified' => 1];
        }
        $cooldownOver = $open['last_notified_at'] === null || strtotime((string) $open['last_notified_at']) <= time() - $policy['cooldown_minutes'] * 60;
        $pdo->prepare('UPDATE featherpanel_node_alerts SET message = :m, details = :d, severity = :s, occurrences = occurrences + :o' . ($cooldownOver ? ', last_notified_at = NOW()' : '') . ' WHERE id = :id')
            ->execute(['m' => mb_substr($message, 0, 500), 'd' => $json, 's' => $severity, 'o' => $type === self::TYPE_BACKUP_FAILED ? $occurrences : 1, 'id' => (int) $open['id']]);
        if (!$cooldownOver) {
            return ['new' => 0, 'notified' => 0];
        }
        $this->deliver(['id' => (int) $open['id'], 'node_id' => $nodeId, 'type' => $type, 'severity' => $severity, 'message' => $message, 'details' => $details, 'state' => 'ongoing'], $policy);

        return ['new' => 0, 'notified' => 1];
    }

    private function resolve(string $fingerprint, array $policy, ?string $notice): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_node_alerts WHERE fingerprint = :f AND status = \'open\'');
        $stmt->execute(['f' => $fingerprint]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        if ($rows === []) {
            return 0;
        }
        $pdo->prepare('UPDATE featherpanel_node_alerts SET status = \'resolved\', resolved_at = NOW() WHERE fingerprint = :f AND status = \'open\'')->execute(['f' => $fingerprint]);
        if ($policy['notify_resolved']) {
            $row = $rows[0];
            $this->deliver([
                'id' => (int) $row['id'],
                'node_id' => $row['node_id'] !== null ? (int) $row['node_id'] : null,
                'type' => (string) $row['type'],
                'severity' => 'info',
                'message' => $notice ?? ('Resolved: ' . $row['message']),
                'details' => json_decode((string) $row['details'], true) ?: [],
                'state' => 'resolved',
            ], $policy);
        }

        return count($rows);
    }

    /** Admins who can see node status, not banned or deleted. */
    private function recipients(): array
    {
        if ($this->recipients !== null) {
            return $this->recipients;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            "SELECT DISTINCT u.id, u.uuid, u.email, u.username FROM featherpanel_users u
             JOIN featherpanel_permissions p ON p.role_id = u.role_id
             WHERE u.deleted = 'false' AND u.banned = 'false' AND p.permission IN ('admin.root', :perm)
             LIMIT 200"
        );
        $stmt->execute(['perm' => \App\Permissions::ADMIN_NODES_VIEW]);

        return $this->recipients = $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /** @return string "sent", "mail_disabled" or "failed" */
    private function email(array $user, string $appName, string $title, array $alert, string $url): string
    {
        $esc = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
        $body = '<h2>' . $esc($title) . '</h2>';
        if (!empty($alert['details']['error'])) {
            $body .= '<p>Error: ' . $esc((string) $alert['details']['error']) . '</p>';
        }
        $body .= '<p>Severity: ' . $esc((string) $alert['severity']) . '<br>Time: ' . gmdate('Y-m-d H:i') . ' UTC</p>'
            . '<p><a href="' . $esc($url) . '">Open node status in ' . $esc($appName) . '</a></p>'
            . '<p style="color:#888;font-size:12px">Change node alert channels under Admin, Nodes, Status.</p>';
        $id = MailQueue::create(['user_uuid' => $user['uuid'], 'subject' => $appName . ': ' . $title, 'body' => $body]);
        if ($id === true) {
            return 'mail_disabled';
        }
        if ($id === false) {
            return 'failed';
        }
        MailList::create(['queue_id' => $id, 'user_uuid' => $user['uuid']]);

        return 'sent';
    }
}
