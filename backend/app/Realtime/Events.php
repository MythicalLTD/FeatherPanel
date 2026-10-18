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

namespace App\Realtime;

use App\Chat\Backup;
use App\Chat\Server;
use Symfony\Component\HttpFoundation\Response;

/**
 * The few "something changed" events the frontend listens to. Each one only
 * says what to refetch; clients load the data through the normal API, so no
 * permission-sensitive content ever goes through the hub.
 *
 * All methods are no-ops (one env lookup) when Mercure is disabled.
 */
final class Events
{
    public const BACKUPS_UPDATED = 'backups.updated';
    public const SERVER_UPDATED = 'server.updated';
    public const NOTIFICATIONS_UPDATED = 'notifications.updated';
    public const WEBSPACES_UPDATED = 'webspaces.updated';

    /**
     * Run $publish only when $response is a 2xx, then hand the response back.
     */
    public static function onSuccess(Response $response, callable $publish): Response
    {
        if ($response->isSuccessful() && Mercure::isEnabled()) {
            try {
                $publish();
            } catch (\Throwable) {
                // Realtime is best-effort.
            }
        }

        return $response;
    }

    public static function backupsChangedForServerUuid(string $serverUuid): void
    {
        self::serverEvent(self::lookupServer($serverUuid), self::BACKUPS_UPDATED);
    }

    public static function backupChanged(string $backupUuid): void
    {
        if (!Mercure::isEnabled()) {
            return;
        }
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup || empty($backup['server_id'])) {
            return;
        }
        self::serverEvent(Server::getServerById((int) $backup['server_id']), self::BACKUPS_UPDATED, ['backup' => $backupUuid]);
    }

    public static function serverChanged(string $serverUuid, string $reason): void
    {
        self::serverEvent(self::lookupServer($serverUuid), self::SERVER_UPDATED, ['reason' => $reason]);
    }

    public static function notificationsChanged(): void
    {
        Mercure::publish(Mercure::TOPIC_NOTIFICATIONS, self::NOTIFICATIONS_UPDATED);
    }

    public static function webspaceChanged(string $webspaceUuid): void
    {
        Mercure::publish(Mercure::TOPIC_ADMIN_WEBSPACES, self::WEBSPACES_UPDATED, ['uuid' => $webspaceUuid]);
    }

    /**
     * Accepts either the full uuid (Wings) or the short uuid (panel routes).
     */
    private static function lookupServer(string $uuid): ?array
    {
        if (!Mercure::isEnabled() || $uuid === '') {
            return null;
        }

        return strlen($uuid) === 36 ? Server::getServerByUuid($uuid) : Server::getServerByUuidShort($uuid);
    }

    private static function serverEvent(?array $server, string $type, array $data = []): void
    {
        if (!$server || empty($server['uuidShort'])) {
            return;
        }
        Mercure::publish(Mercure::serverTopic((string) $server['uuidShort']), $type, $data);
    }
}
