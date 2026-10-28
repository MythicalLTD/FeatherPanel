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

namespace App\Services\Notifications;

use App\App;
use App\Chat\User;
use App\Chat\Subuser;
use App\Chat\VmSubuser;
use App\Realtime\Mercure;
use App\SubuserPermissions;
use App\Chat\UserNotification;

/**
 * Writes inbox notifications for the events users care about and nudges their open tabs.
 * Everything here is best effort: a failure is logged and never breaks the caller.
 */
class InboxNotifier
{
    public const REALTIME_TYPE = 'inbox.updated';

    /** Resource limit alerts repeat at most every six hours per server and metric. */
    public const RESOURCE_ALERT_COOLDOWN = 6 * 3600;

    /** A staff reply on someone's ticket (internal notes never notify). */
    public static function ticketReply(array $ticket, array $message, ?string $replierUuid): void
    {
        self::guard(static function () use ($ticket, $message, $replierUuid): void {
            if ((int) ($message['is_internal'] ?? 0) === 1) {
                return;
            }
            $ownerUuid = (string) ($ticket['user_uuid'] ?? '');
            if ($ownerUuid === '' || ($replierUuid !== null && $replierUuid === $ownerUuid)) {
                return;
            }
            $owner = User::getUserByUuid($ownerUuid);
            if (!$owner) {
                return;
            }
            $replier = $replierUuid !== null ? User::getUserByUuid($replierUuid) : null;
            $ticketUuid = (string) ($ticket['uuid'] ?? '');

            self::send(
                [$owner],
                UserNotification::KIND_TICKET_REPLY,
                [
                    'ticket_uuid' => $ticketUuid,
                    'ticket_title' => mb_substr((string) ($ticket['title'] ?? ''), 0, 120),
                    'replier' => $replier ? mb_substr((string) ($replier['username'] ?? ''), 0, 64) : null,
                ],
                '/dashboard/tickets/' . rawurlencode($ticketUuid),
                'ticket:' . (int) ($ticket['id'] ?? 0)
            );
        });
    }

    /** A backup finished on a server: owner and subusers who can see backups. */
    public static function backupFinished(array $backup, array $server, bool $successful): void
    {
        self::guard(static function () use ($backup, $server, $successful): void {
            $uuidShort = (string) ($server['uuidShort'] ?? '');
            self::send(
                self::serverAudience($server, SubuserPermissions::BACKUP_READ),
                $successful ? UserNotification::KIND_BACKUP_COMPLETED : UserNotification::KIND_BACKUP_FAILED,
                [
                    'server_name' => mb_substr((string) ($server['name'] ?? ''), 0, 120),
                    'server' => $uuidShort,
                    'backup_name' => mb_substr((string) ($backup['name'] ?? ''), 0, 120),
                ],
                '/server/' . rawurlencode($uuidShort) . '/backups',
                'backup:' . (string) ($backup['uuid'] ?? '')
            );
        });
    }

    /** A cross server file copy or move finished: notify the user who started it. */
    public static function fileTransferFinished(array $user, array $source, array $target, array $job, bool $successful): void
    {
        self::guard(static function () use ($user, $source, $target, $job, $successful): void {
            $files = json_decode((string) ($job['files'] ?? '[]'), true) ?: [];
            self::send(
                [$user],
                $successful ? UserNotification::KIND_FILE_TRANSFER_COMPLETED : UserNotification::KIND_FILE_TRANSFER_FAILED,
                [
                    'server_name' => mb_substr((string) ($source['name'] ?? ''), 0, 120),
                    'target_name' => mb_substr((string) ($target['name'] ?? ''), 0, 120),
                    'server' => (string) ($source['uuidShort'] ?? ''),
                    'count' => (string) count($files),
                ],
                '/server/' . rawurlencode((string) ($target['uuidShort'] ?? '')) . '/files',
                'transfer:' . (string) ($job['uuid'] ?? '')
            );
        });
    }

    /** A user's own backup storage lost access (token revoked at the provider). */
    public static function storageDisconnected(array $destination, int $backups): void
    {
        self::guard(static function () use ($destination, $backups): void {
            $user = User::getUserById((int) ($destination['user_id'] ?? 0));
            if (!$user) {
                return;
            }
            self::send(
                [$user],
                UserNotification::KIND_STORAGE_DISCONNECTED,
                [
                    'storage_name' => mb_substr((string) ($destination['name'] ?? ''), 0, 120),
                    'provider' => (string) ($destination['provider'] ?? ''),
                    'count' => (string) $backups,
                ],
                '/dashboard/account?tab=storage',
                'storage:' . (string) ($destination['uuid'] ?? '')
            );
        });
    }

    /** Wings reported a crash: owner and subusers with console access. Repeats fold into one unread item. */
    public static function serverCrashed(array $server): void
    {
        self::guard(static function () use ($server): void {
            $uuidShort = (string) ($server['uuidShort'] ?? '');
            self::send(
                self::serverAudience($server, SubuserPermissions::CONTROL_CONSOLE),
                UserNotification::KIND_SERVER_CRASHED,
                [
                    'server_name' => mb_substr((string) ($server['name'] ?? ''), 0, 120),
                    'server' => $uuidShort,
                ],
                '/server/' . rawurlencode($uuidShort),
                'crash:' . (int) ($server['id'] ?? 0)
            );
        });
    }

    /**
     * A server stayed above its CPU, memory or disk limit threshold. One alert per
     * server and metric every RESOURCE_ALERT_COOLDOWN seconds per user.
     */
    public static function resourceLimit(array $server, string $metric, int $percent): void
    {
        self::guard(static function () use ($server, $metric, $percent): void {
            $uuidShort = (string) ($server['uuidShort'] ?? '');
            $groupKey = 'limit:' . (int) ($server['id'] ?? 0) . ':' . $metric;
            $audience = array_values(array_filter(
                self::serverAudience($server, SubuserPermissions::CONTROL_CONSOLE),
                static fn (array $user): bool => !UserNotification::sentWithin((int) $user['id'], $groupKey, self::RESOURCE_ALERT_COOLDOWN)
            ));
            self::send(
                $audience,
                UserNotification::KIND_RESOURCE_LIMIT,
                [
                    'server_name' => mb_substr((string) ($server['name'] ?? ''), 0, 120),
                    'server' => $uuidShort,
                    'metric' => $metric,
                    'percent' => (string) $percent,
                ],
                '/server/' . rawurlencode($uuidShort),
                $groupKey
            );
        });
    }

    /** A server that was running before a transfer could not be started on its new node. */
    public static function transferPowerRestoreFailed(array $server): void
    {
        self::guard(static function () use ($server): void {
            $uuidShort = (string) ($server['uuidShort'] ?? '');
            self::send(
                self::serverAudience($server, SubuserPermissions::CONTROL_START),
                UserNotification::KIND_TRANSFER_POWER_FAILED,
                [
                    'server_name' => mb_substr((string) ($server['name'] ?? ''), 0, 120),
                    'server' => $uuidShort,
                ],
                '/server/' . rawurlencode($uuidShort),
                'transfer-power:' . (int) ($server['id'] ?? 0)
            );
        });
    }

    /**
     * Owner plus subusers holding the permission.
     *
     * @return array<int, array> user rows
     */
    /** A VDS stopped without a panel power action (detected by the VDS monitor cron). */
    public static function vdsDown(array $vds, int $cooldownSeconds): void
    {
        self::vdsSend($vds, UserNotification::KIND_VDS_DOWN, 'vds_down', 'power', [], $cooldownSeconds);
    }

    /** A VDS stayed above the CPU threshold for the configured duration. */
    public static function vdsHighCpu(array $vds, int $percent, int $minutes, int $cooldownSeconds): void
    {
        self::vdsSend($vds, UserNotification::KIND_VDS_HIGH_CPU, 'vds_high_cpu', 'console', [
            'percent' => (string) $percent,
            'minutes' => (string) $minutes,
        ], $cooldownSeconds);
    }

    /** A VDS reached the warning threshold or its monthly traffic limit (once per level per month). */
    public static function vdsBandwidth(array $vds, int $percent, string $usedGb, string $limitGb, string $actionLabel, string $period): void
    {
        self::vdsSend($vds, UserNotification::KIND_VDS_BANDWIDTH, 'vds_bandwidth', 'console', [
            'percent' => (string) $percent,
            'used_gb' => $usedGb,
            'limit_gb' => $limitGb,
            'action_label' => $actionLabel,
        ], 40 * 86400, 'vds-bandwidth:' . ($vds['id'] ?? 0) . ':' . $period . ':' . ($percent >= 100 ? 'limit' : 'warn'));
    }

    /** A VDS expires soon. One notification per expiry date. */
    public static function vdsExpiring(array $vds, string $expiresAt, int $days): void
    {
        self::vdsSend($vds, UserNotification::KIND_VDS_EXPIRING, 'vds_expiring', 'console', [
            'expires_at' => $expiresAt,
            'days' => (string) $days,
        ], 90 * 86400, 'vds-expiring:' . ($vds['id'] ?? 0) . ':' . $expiresAt);
    }

    /** A VDS backup task failed. The group key is per task, so every failure is reported once. */
    public static function vdsBackupFailed(array $vds, string $taskId, string $error): void
    {
        self::vdsSend($vds, UserNotification::KIND_VDS_BACKUP_FAILED, 'vds_backup_failed', 'backup', [
            'error' => mb_substr($error, 0, 300),
        ], 30 * 86400, 'vds-backup:' . $taskId);
    }

    private static function vdsSend(array $vds, string $kind, string $event, string $permission, array $extra, int $cooldownSeconds, ?string $groupKey = null): void
    {
        self::guard(static function () use ($vds, $kind, $event, $permission, $extra, $cooldownSeconds, $groupKey): void {
            $vdsId = (int) ($vds['id'] ?? 0);
            if ($vdsId <= 0) {
                return;
            }
            $groupKey ??= $kind . ':' . $vdsId;
            $audience = array_values(array_filter(
                self::vdsAudience($vds, $permission),
                static function (array $user) use ($groupKey, $cooldownSeconds, $event): bool {
                    $prefs = ExternalNotifier::getPreferences((string) ($user['uuid'] ?? ''));
                    if (empty($prefs['events'][$event])) {
                        return false;
                    }

                    return !UserNotification::sentWithin((int) $user['id'], $groupKey, $cooldownSeconds);
                }
            ));
            self::send(
                $audience,
                $kind,
                array_merge(['vds_name' => mb_substr((string) ($vds['hostname'] ?? ('VDS #' . $vdsId)), 0, 120), 'vds' => (string) $vdsId], $extra),
                '/vds/' . $vdsId,
                $groupKey
            );
        });
    }

    /** VDS owner plus subusers that hold the given VDS permission. */
    private static function vdsAudience(array $vds, string $permission): array
    {
        $users = [];
        $ownerUuid = (string) ($vds['user_uuid'] ?? '');
        if ($ownerUuid !== '' && ($owner = User::getUserByUuid($ownerUuid))) {
            $users[(int) $owner['id']] = $owner;
        }
        foreach (VmSubuser::getSubusersByVmInstance((int) ($vds['id'] ?? 0)) as $row) {
            $userId = (int) ($row['user_id'] ?? 0);
            if ($userId <= 0 || isset($users[$userId])) {
                continue;
            }
            $permissions = json_decode((string) ($row['permissions'] ?? ''), true);
            if (!is_array($permissions) || !in_array($permission, $permissions, true)) {
                continue;
            }
            if ($user = User::getUserById($userId)) {
                $users[$userId] = $user;
            }
        }

        return array_values($users);
    }

    private static function serverAudience(array $server, string $permission): array
    {
        $users = [];
        $ownerId = (int) ($server['owner_id'] ?? 0);
        if ($ownerId > 0 && ($owner = User::getUserById($ownerId))) {
            $users[$ownerId] = $owner;
        }
        $serverId = (int) ($server['id'] ?? 0);
        foreach (Subuser::getSubusersByServerId($serverId) as $row) {
            $userId = (int) ($row['user_id'] ?? 0);
            if ($userId <= 0 || isset($users[$userId])) {
                continue;
            }
            $permissions = json_decode((string) ($row['permissions'] ?? ''), true);
            if (!is_array($permissions) || !in_array($permission, $permissions, true)) {
                continue;
            }
            if ($user = User::getUserById($userId)) {
                $users[$userId] = $user;
            }
        }

        return array_values($users);
    }

    /** @param array<int, array> $users */
    private static function send(array $users, string $kind, array $data, string $link, string $groupKey): void
    {
        foreach ($users as $user) {
            $userId = (int) ($user['id'] ?? 0);
            if ($userId <= 0 || UserNotification::notify($userId, $kind, $data, $link, $groupKey) === false) {
                continue;
            }
            ExternalNotifier::deliver($user, $kind, $data, $link);
            if (!empty($user['uuid']) && Mercure::isEnabled()) {
                Mercure::publish(Mercure::userTopic((string) $user['uuid']), self::REALTIME_TYPE);
            }
        }
    }

    private static function guard(callable $work): void
    {
        try {
            $work();
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Inbox notification failed: ' . $e->getMessage());
        }
    }
}
