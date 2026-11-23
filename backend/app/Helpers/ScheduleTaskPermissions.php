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

namespace App\Helpers;

use App\SubuserPermissions;

/**
 * The subuser permissions a schedule task needs, based on what the task does when it runs.
 *
 * A task runs later without the user who created it, so whoever creates or changes it must
 * already hold the permissions of the matching direct action (console, power, backups, reinstall).
 */
final class ScheduleTaskPermissions
{
    /**
     * Power actions and the permission the direct power endpoint asks for.
     */
    private const POWER = [
        'start' => SubuserPermissions::CONTROL_START,
        'stop' => SubuserPermissions::CONTROL_STOP,
        'restart' => SubuserPermissions::CONTROL_RESTART,
        'kill' => SubuserPermissions::CONTROL_CONSOLE,
    ];

    /**
     * @return list<string> every permission listed is required
     */
    public static function required(string $action, string $payload = ''): array
    {
        $action = trim($action);

        if (isset(self::POWER[$action])) {
            return [self::POWER[$action]];
        }

        switch ($action) {
            case 'power':
                $power = trim($payload);
                if (isset(self::POWER[$power])) {
                    return [self::POWER[$power]];
                }

                // Unknown payloads fail at run time; still ask for everything a power task could do.
                return array_values(array_unique(array_values(self::POWER)));
            case 'command':
            case 'container_shell':
                return [SubuserPermissions::CONTROL_CONSOLE];
            case 'backup':
            case 'database_backup':
                return [SubuserPermissions::BACKUP_CREATE];
            case 'install':
            case 'update':
                return [SubuserPermissions::SETTINGS_REINSTALL];
            default:
                return [];
        }
    }

    /**
     * The first required permission the user does not have, or null when every one is held.
     */
    public static function missing(int $userId, int $serverId, string $action, string $payload = ''): ?string
    {
        foreach (self::required($action, $payload) as $permission) {
            if (!SubuserPermissionChecker::hasPermission($userId, $serverId, $permission)) {
                return $permission;
            }
        }

        return null;
    }

    /**
     * The first permission the user lacks for any of the given tasks, or null when every one is held.
     * Used when a user starts or re-enables a schedule that may hold tasks somebody else created.
     *
     * @param iterable<array<string, mixed>> $tasks task rows with action and payload
     */
    public static function missingForTasks(int $userId, int $serverId, iterable $tasks): ?string
    {
        foreach ($tasks as $task) {
            $missing = self::missing($userId, $serverId, (string) ($task['action'] ?? ''), (string) ($task['payload'] ?? ''));
            if ($missing !== null) {
                return $missing;
            }
        }

        return null;
    }
}
