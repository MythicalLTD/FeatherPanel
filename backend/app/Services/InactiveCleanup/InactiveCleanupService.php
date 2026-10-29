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

namespace App\Services\InactiveCleanup;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\Activity;
use App\Chat\Database;
use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\ServerActivity;
use App\Services\Wings\Wings;
use App\Chat\UserNotification;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use App\Helpers\ModerationReasonHelper;
use App\Services\Storage\StorageSettings;
use App\Controllers\Admin\ServersController;
use Symfony\Component\HttpFoundation\Request;
use App\Services\Backup\ServerFullBackupService;

/**
 * Finds servers nobody used for a while and moves them through the cleanup stages:
 * warn the owner, wait the grace period, then run the configured action
 * (notify only, suspend, archive to S3 then delete, or delete).
 *
 * "Activity" means a server activity made by a user (console, power, files, settings...);
 * entries written by the panel itself (schedules, this cleanup) do not count.
 * Servers suspended by staff and exempt servers are never touched.
 */
class InactiveCleanupService
{
    public const STAGE_WARNED = 'warned';
    public const STAGE_SUSPENDED = 'suspended';
    public const STAGE_ARCHIVING = 'archiving';
    public const STAGE_ARCHIVE_FAILED = 'archive_failed';

    /** Steps that change or remove a server; limited per run. */
    public const DESTRUCTIVE_STEPS = ['suspend', 'archive', 'delete'];

    /** An archive backup that has not finished after this long is treated as failed. */
    public const ARCHIVE_TIMEOUT_HOURS = 24;

    private array $policy;

    public function __construct(?array $policy = null)
    {
        $this->policy = $policy ?? InactiveCleanupPolicy::get();
    }

    /**
     * What a run would do right now. Nothing is changed.
     *
     * @return array{items: array<int, array<string, mixed>>, token: string, counts: array<string, int>, archive_available: bool}
     */
    public function plan(): array
    {
        $now = $this->now();
        $inactiveBefore = $now - $this->policy['inactive_days'] * 86400;
        $graceSeconds = $this->policy['grace_days'] * 86400;
        $archiveAvailable = $this->archiveAvailable();
        $items = [];

        foreach ($this->servers() as $s) {
            $last = strtotime((string) $s['last_activity_at'] . ' UTC') ?: 0;
            $inactive = $last <= $inactiveBefore;
            $stage = $s['inactivity_stage'] !== null && $s['inactivity_stage'] !== '' ? (string) $s['inactivity_stage'] : null;
            $stageAt = $s['inactivity_stage_at'] !== null ? (strtotime((string) $s['inactivity_stage_at'] . ' UTC') ?: $now) : null;
            $step = null;
            $reason = null;
            $dueAt = null;

            if ((int) $s['inactivity_exempt'] === 1) {
                if ($inactive) {
                    $step = 'skip';
                    $reason = 'exempt';
                }
            } elseif ($stage === self::STAGE_ARCHIVING) {
                $step = 'archive_check';
            } elseif (!$inactive) {
                // Used again: drop the warning. A server suspended for inactivity stays suspended until staff lift it.
                if ($stage === self::STAGE_WARNED || ($stage !== null && (int) $s['suspended'] === 0)) {
                    $step = 'clear';
                }
            } elseif ((int) $s['suspended'] === 1 && $stage !== self::STAGE_SUSPENDED) {
                $step = 'skip';
                $reason = 'suspended_by_staff';
            } elseif ($stage === null) {
                $step = 'warn';
                $dueAt = $now + $graceSeconds;
            } elseif ($stage === self::STAGE_ARCHIVE_FAILED) {
                $step = 'skip';
                $reason = 'archive_failed';
            } else {
                $action = $this->policy['action'];
                $alreadyDone = ($stage === self::STAGE_SUSPENDED && $action === 'suspend') || $action === 'notify';
                if ($alreadyDone) {
                    $step = null;
                } elseif ($stageAt !== null && $now < $stageAt + $graceSeconds) {
                    $step = 'wait';
                    $dueAt = $stageAt + $graceSeconds;
                } elseif ($action === 'archive' && !$archiveAvailable) {
                    $step = 'skip';
                    $reason = 'archive_needs_s3';
                } else {
                    $step = $action;
                }
            }

            if ($step === null) {
                continue;
            }
            $items[] = [
                'server_id' => (int) $s['id'],
                'uuid_short' => (string) $s['uuidShort'],
                'name' => (string) $s['name'],
                'owner_id' => (int) $s['owner_id'],
                'owner_username' => $s['username'],
                'node_id' => (int) $s['node_id'],
                'disk' => (int) $s['disk'],
                'suspended' => (int) $s['suspended'] === 1,
                'exempt' => (int) $s['inactivity_exempt'] === 1,
                'last_activity_at' => $s['last_activity_at'],
                'inactive_days' => (int) floor(max(0, $now - $last) / 86400),
                'stage' => $stage,
                'stage_at' => $s['inactivity_stage_at'],
                'step' => $step,
                'reason' => $reason,
                'due_at' => $dueAt !== null ? gmdate('Y-m-d H:i:s', $dueAt) : null,
            ];
        }

        $counts = [];
        foreach ($items as $item) {
            $counts[$item['step']] = ($counts[$item['step']] ?? 0) + 1;
        }

        return [
            'items' => $items,
            'token' => self::token($items),
            'counts' => $counts,
            'archive_available' => $archiveAvailable,
        ];
    }

    /** Fingerprint of the planned steps, so a confirmed preview cannot run a different plan. */
    public static function token(array $items): string
    {
        $parts = array_map(static fn (array $i): string => $i['server_id'] . ':' . $i['step'], $items);

        return hash('sha256', implode('|', $parts));
    }

    /**
     * Apply a plan. Destructive steps run only when allowed and up to max_actions_per_run.
     *
     * @return array{applied: array<string, int>, failed: int, deferred: int, results: array<int, array<string, mixed>>}
     */
    public function execute(array $plan, bool $allowDestructive, ?array $actor = null): array
    {
        $applied = [];
        $failed = 0;
        $deferred = 0;
        $results = [];
        $budget = $this->policy['max_actions_per_run'];

        foreach ($plan['items'] as $item) {
            $step = $item['step'];
            if (in_array($step, ['skip', 'wait'], true)) {
                continue;
            }
            if (in_array($step, self::DESTRUCTIVE_STEPS, true)) {
                if (!$allowDestructive || $budget <= 0) {
                    ++$deferred;
                    continue;
                }
                --$budget;
            }
            try {
                $outcome = match ($step) {
                    'warn' => $this->warn($item),
                    'clear' => $this->clear($item),
                    'suspend' => $this->suspend($item),
                    'archive' => $this->startArchive($item),
                    'archive_check' => $this->checkArchive($item, $actor),
                    'delete' => $this->delete($item, $actor),
                    default => 'ignored',
                };
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->error('Inactive cleanup ' . $step . ' failed for server ' . $item['server_id'] . ': ' . $e->getMessage());
                $outcome = 'error: ' . mb_substr($e->getMessage(), 0, 200);
            }
            $ok = !str_starts_with((string) $outcome, 'error');
            $ok ? $applied[$step] = ($applied[$step] ?? 0) + 1 : ++$failed;
            $results[] = ['server_id' => $item['server_id'], 'name' => $item['name'], 'step' => $step, 'outcome' => $outcome];
            $this->audit($actor, 'inactive_cleanup_' . $step, $item['name'] . ' (#' . $item['server_id'] . '): ' . $outcome);
        }

        return ['applied' => $applied, 'failed' => $failed, 'deferred' => $deferred, 'results' => $results];
    }

    public function archiveAvailable(): bool
    {
        return StorageSettings::bool(StorageSettings::S3_USE_BY_DEFAULT) && StorageSettings::globalS3Configured();
    }

    // Steps

    protected function warn(array $item): string
    {
        $this->setStage($item['server_id'], self::STAGE_WARNED);
        $this->serverActivity($item, 'inactivity_warning', ['action' => $this->policy['action'], 'due_at' => $item['due_at']]);
        if (!$this->policy['warn_owner']) {
            return 'marked';
        }

        return $this->notifyOwner($item);
    }

    protected function clear(array $item): string
    {
        $this->setStage($item['server_id'], null);

        return 'cleared';
    }

    protected function suspend(array $item): string
    {
        $reason = ModerationReasonHelper::formatReason('other', 'Inactive for ' . $item['inactive_days'] . ' days (automatic cleanup)');
        $fields = ModerationReasonHelper::suspensionAppliedFields($reason, null);
        $fields['inactivity_stage'] = self::STAGE_SUSPENDED;
        $fields['inactivity_stage_at'] = gmdate('Y-m-d H:i:s', $this->now());
        if (!Server::updateServerById($item['server_id'], $fields)) {
            return 'error: could not update the server';
        }
        $this->serverActivity($item, 'inactivity_suspended', []);
        $note = 'suspended';
        try {
            $wings = $this->wingsFor($item['node_id']);
            $response = $wings?->getServer()->killServer($this->uuidOf($item['server_id']));
            if ($response !== null && !$response->isSuccessful()) {
                $note = 'suspended (node did not stop it: ' . mb_substr((string) $response->getError(), 0, 100) . ')';
            }
        } catch (\Throwable $e) {
            $note = 'suspended (node unreachable)';
        }

        return $note;
    }

    protected function startArchive(array $item): string
    {
        $server = Server::getServerById($item['server_id']);
        $wings = $this->wingsFor($item['node_id']);
        if ($server === null || $wings === null) {
            return 'error: server or node not found';
        }
        $backup = ServerFullBackupService::createWingsBackup($wings, $server, '[]', ['name' => 'Inactive archive ' . gmdate('Y-m-d'), 'destination_id' => null]);
        if (($backup['adapter'] ?? '') !== 's3') {
            return 'error: the backup did not go to S3 storage';
        }
        Server::updateServerById($item['server_id'], [
            'inactivity_stage' => self::STAGE_ARCHIVING,
            'inactivity_stage_at' => gmdate('Y-m-d H:i:s', $this->now()),
            'inactivity_backup_id' => (int) $backup['id'],
        ]);
        $this->serverActivity($item, 'inactivity_archive_started', ['backup_uuid' => $backup['uuid']]);

        return 'archive backup started';
    }

    protected function checkArchive(array $item, ?array $actor): string
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT s.*, b.uuid AS b_uuid, b.disk AS b_disk, b.remote_ref, b.bytes, b.checksum, b.is_successful, b.completed_at
            FROM featherpanel_servers s LEFT JOIN featherpanel_server_backups b ON b.id = s.inactivity_backup_id WHERE s.id = :id');
        $stmt->execute(['id' => $item['server_id']]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            return 'error: server not found';
        }
        $started = strtotime((string) $row['inactivity_stage_at'] . ' UTC') ?: $this->now();
        if ($row['b_uuid'] === null || ($row['completed_at'] !== null && (int) $row['is_successful'] !== 1)
            || ($row['completed_at'] === null && $this->now() - $started > self::ARCHIVE_TIMEOUT_HOURS * 3600)) {
            $this->setStage($item['server_id'], self::STAGE_ARCHIVE_FAILED);

            return 'archive backup failed, server kept';
        }
        if ($row['completed_at'] === null) {
            return 'archive backup still running';
        }
        $snapshot = array_intersect_key($row, array_flip(['uuid', 'uuidShort', 'name', 'description', 'owner_id', 'node_id', 'memory', 'swap', 'disk', 'io', 'cpu', 'threads', 'spell_id', 'realms_id', 'startup', 'image', 'database_limit', 'allocation_limit', 'backup_limit', 'created_at']));
        $ins = $pdo->prepare('INSERT INTO featherpanel_server_archives (server_uuid, server_name, owner_id, node_id, spell_id, backup_uuid, backup_disk, remote_ref, bytes, checksum, server_snapshot, last_activity_at)
            VALUES (:uuid, :name, :owner, :node, :spell, :buuid, :disk, :ref, :bytes, :sum, :snap, :last)');
        $ins->execute([
            'uuid' => $row['uuid'], 'name' => $row['name'], 'owner' => $row['owner_id'], 'node' => $row['node_id'], 'spell' => $row['spell_id'],
            'buuid' => $row['b_uuid'], 'disk' => $row['b_disk'], 'ref' => $row['remote_ref'], 'bytes' => $row['bytes'], 'sum' => $row['checksum'],
            'snap' => json_encode($snapshot), 'last' => $item['last_activity_at'],
        ]);
        $archiveId = (int) $pdo->lastInsertId();

        return 'archived as #' . $archiveId . ', ' . $this->delete($item, $actor);
    }

    /** Delete through the admin delete flow (allocations, databases, subdomains, node, owner email). */
    protected function delete(array $item, ?array $actor): string
    {
        $request = new Request();
        $request->attributes->set('user', $actor ?? ['uuid' => null, 'username' => 'Inactive server cleanup']);
        $response = (new ServersController())->delete($request, $item['server_id']);
        $payload = json_decode((string) $response->getContent(), true);
        if ($response->getStatusCode() >= 400) {
            if (Server::getServerById($item['server_id']) === null) {
                return 'deleted (node: ' . mb_substr((string) ($payload['error_code'] ?? 'error'), 0, 60) . ')';
            }

            return 'error: ' . mb_substr((string) ($payload['message'] ?? 'delete failed'), 0, 150);
        }

        return 'deleted';
    }

    // Data access and side effects (protected so tests can replace them)

    /** @return array<int, array<string, mixed>> */
    protected function servers(): array
    {
        $sql = 'SELECT s.id, s.uuidShort, s.name, s.owner_id, s.node_id, s.disk, s.suspended, s.inactivity_exempt,
                s.inactivity_stage, s.inactivity_stage_at, u.username,
                GREATEST(s.created_at, COALESCE(a.last_at, s.created_at)) AS last_activity_at
            FROM featherpanel_servers s
            LEFT JOIN (SELECT server_id, MAX(timestamp) AS last_at FROM featherpanel_server_activities WHERE user_id IS NOT NULL GROUP BY server_id) a ON a.server_id = s.id
            LEFT JOIN featherpanel_users u ON u.id = s.owner_id
            ORDER BY last_activity_at ASC';

        return Database::getPdoConnection()->query($sql)->fetchAll(\PDO::FETCH_ASSOC);
    }

    protected function now(): int
    {
        return time();
    }

    protected function setStage(int $serverId, ?string $stage): void
    {
        Server::updateServerById($serverId, [
            'inactivity_stage' => $stage,
            'inactivity_stage_at' => $stage === null ? null : gmdate('Y-m-d H:i:s', $this->now()),
            'inactivity_backup_id' => null,
        ]);
    }

    protected function notifyOwner(array $item): string
    {
        $stmt = Database::getPdoConnection()->prepare('SELECT id, uuid, email, username FROM featherpanel_users WHERE id = :id');
        $stmt->execute(['id' => $item['owner_id']]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) {
            return 'no owner';
        }
        $action = $this->policy['action'];
        $due = $item['due_at'] ?? gmdate('Y-m-d H:i:s', $this->now() + $this->policy['grace_days'] * 86400);
        UserNotification::notify((int) $user['id'], UserNotification::KIND_SERVER_INACTIVE, [
            'server_name' => $item['name'],
            'days' => (string) $item['inactive_days'],
            'action' => $action,
            'due_at' => $due,
        ], '/server/' . $item['uuid_short'], 'server_inactive:' . $item['server_id']);

        $config = App::getInstance(true)->getConfig();
        $appName = (string) $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
        $url = rtrim((string) $config->getSetting(ConfigInterface::APP_URL, ''), '/') . '/server/' . $item['uuid_short'];
        $esc = static fn (string $v): string => htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
        $what = [
            'notify' => 'This is only a reminder.',
            'suspend' => 'If it stays unused, it will be suspended after ' . $due . ' UTC.',
            'archive' => 'If it stays unused, it will be backed up and then deleted after ' . $due . ' UTC.',
            'delete' => 'If it stays unused, it will be deleted after ' . $due . ' UTC.',
        ][$action];
        $body = '<p>Hello ' . $esc((string) $user['username']) . ',</p>'
            . '<p>Your server <strong>' . $esc($item['name']) . '</strong> has not been used for ' . (int) $item['inactive_days'] . ' days. ' . $esc($what) . '</p>'
            . '<p>To keep it, open it and use it (start it, open the console or the files) before then.</p>'
            . '<p><a href="' . $esc($url) . '">Open ' . $esc($item['name']) . '</a></p>';
        $id = MailQueue::create(['user_uuid' => $user['uuid'], 'subject' => $appName . ': ' . $item['name'] . ' is inactive', 'body' => $body]);
        if ($id === true) {
            return 'warned (inbox; mail is off)';
        }
        if ($id === false) {
            return 'warned (inbox; email failed)';
        }
        MailList::create(['queue_id' => $id, 'user_uuid' => $user['uuid']]);

        return 'warned (inbox and email)';
    }

    protected function wingsFor(int $nodeId): ?Wings
    {
        $node = Node::getNodeById($nodeId);

        return $node ? Wings::fromNode($node, 15) : null;
    }

    private function uuidOf(int $serverId): string
    {
        return (string) (Server::getServerById($serverId)['uuid'] ?? '');
    }

    private function serverActivity(array $item, string $event, array $metadata): void
    {
        ServerActivity::createActivity([
            'server_id' => $item['server_id'],
            'node_id' => $item['node_id'],
            'event' => $event,
            'metadata' => json_encode($metadata + ['inactive_days' => $item['inactive_days']]),
        ]);
    }

    private function audit(?array $actor, string $name, string $context): void
    {
        Activity::createActivity([
            'user_uuid' => $actor['uuid'] ?? null,
            'name' => $name,
            'context' => mb_substr($context, 0, 500),
            'ip_address' => $actor === null ? '127.0.0.1' : CloudFlareRealIP::getRealIP(),
        ]);
    }
}
