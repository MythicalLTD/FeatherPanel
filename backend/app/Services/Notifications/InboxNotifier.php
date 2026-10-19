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
     * Owner plus subusers holding the permission.
     *
     * @return array<int, array> user rows
     */
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
