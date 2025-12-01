<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Helpers;

use App\App;
use App\Chat\Subuser;
use App\SubuserPermissions;

class SubuserPermissionChecker
{
    /**
     * Check if a user has a specific permission for a server.
     *
     * @param int $userId The user ID
     * @param int $serverId The server ID
     * @param string $permission The permission to check (e.g., 'file.read', 'backup.create')
     *
     * @return bool True if the user has the permission, false otherwise
     */
    public static function hasPermission(int $userId, int $serverId, string $permission): bool
    {
        // If the user is the owner, they have all permissions
        // This check is handled by ServerGateway::canUserAccessServer in ServerMiddleware
        // So if we get here and they can access the server, we need to check if they're a subuser

        // Get subuser record
        $subuser = Subuser::getSubuserByUserAndServer($userId, $serverId);

        // If not a subuser, they're the owner - grant all permissions
        if (!$subuser) {
            return true;
        }

        // Parse permissions from JSON
        $permissions = [];
        if (isset($subuser['permissions']) && !empty($subuser['permissions'])) {
            try {
                $permissions = json_decode($subuser['permissions'], true);
                if (!is_array($permissions)) {
                    $permissions = [];
                }
            } catch (\Exception $e) {
                App::getInstance(true)->getLogger()->error('Failed to parse subuser permissions: ' . $e->getMessage());

                return false;
            }
        }

        // If no permissions array or empty, deny access
        if (empty($permissions)) {
            return false;
        }

        // Check if the permission exists in the array
        return in_array($permission, $permissions, true);
    }

    /**
     * Check if a user has any of the specified permissions.
     *
     * @param int $userId The user ID
     * @param int $serverId The server ID
     * @param array $permissions Array of permissions to check
     *
     * @return bool True if the user has at least one of the permissions
     */
    public static function hasAnyPermission(int $userId, int $serverId, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (self::hasPermission($userId, $serverId, $permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a user has all of the specified permissions.
     *
     * @param int $userId The user ID
     * @param int $serverId The server ID
     * @param array $permissions Array of permissions to check
     *
     * @return bool True if the user has all of the permissions
     */
    public static function hasAllPermissions(int $userId, int $serverId, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!self::hasPermission($userId, $serverId, $permission)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Map actions to required permissions.
     *
     * @param string $controller The controller name (e.g., 'files', 'backups', 'databases')
     * @param string $action The action name (e.g., 'list', 'create', 'update', 'delete')
     *
     * @return string|null The required permission, or null if not mapped
     */
    public static function getRequiredPermission(string $controller, string $action): ?string
    {
        $permissionMap = [
            'files' => [
                'list' => SubuserPermissions::FILE_READ,
                'read' => SubuserPermissions::FILE_READ,
                'readContent' => SubuserPermissions::FILE_READ_CONTENT,
                'create' => SubuserPermissions::FILE_CREATE,
                'update' => SubuserPermissions::FILE_UPDATE,
                'delete' => SubuserPermissions::FILE_DELETE,
                'compress' => SubuserPermissions::FILE_ARCHIVE,
                'extract' => SubuserPermissions::FILE_ARCHIVE,
                'sftp' => SubuserPermissions::FILE_SFTP,
            ],
            'backups' => [
                'list' => SubuserPermissions::BACKUP_READ,
                'create' => SubuserPermissions::BACKUP_CREATE,
                'delete' => SubuserPermissions::BACKUP_DELETE,
                'download' => SubuserPermissions::BACKUP_DOWNLOAD,
                'restore' => SubuserPermissions::BACKUP_RESTORE,
            ],
            'databases' => [
                'list' => SubuserPermissions::DATABASE_READ,
                'create' => SubuserPermissions::DATABASE_CREATE,
                'update' => SubuserPermissions::DATABASE_UPDATE,
                'delete' => SubuserPermissions::DATABASE_DELETE,
                'viewPassword' => SubuserPermissions::DATABASE_VIEW_PASSWORD,
            ],
            'schedules' => [
                'list' => SubuserPermissions::SCHEDULE_READ,
                'create' => SubuserPermissions::SCHEDULE_CREATE,
                'update' => SubuserPermissions::SCHEDULE_UPDATE,
                'delete' => SubuserPermissions::SCHEDULE_DELETE,
            ],
            'allocations' => [
                'list' => SubuserPermissions::ALLOCATION_READ,
                'create' => SubuserPermissions::ALLOCATION_CREATE,
                'update' => SubuserPermissions::ALLOCATION_UPDATE,
                'delete' => SubuserPermissions::ALLOCATION_DELETE,
            ],
            'startup' => [
                'read' => SubuserPermissions::STARTUP_READ,
                'update' => SubuserPermissions::STARTUP_UPDATE,
                'dockerImage' => SubuserPermissions::STARTUP_DOCKER_IMAGE,
            ],
            'power' => [
                'start' => SubuserPermissions::CONTROL_START,
                'stop' => SubuserPermissions::CONTROL_STOP,
                'restart' => SubuserPermissions::CONTROL_RESTART,
                'kill' => SubuserPermissions::CONTROL_CONSOLE, // Kill uses console permission
                'console' => SubuserPermissions::CONTROL_CONSOLE,
            ],
            'settings' => [
                'rename' => SubuserPermissions::SETTINGS_RENAME,
                'changeEgg' => SubuserPermissions::SETTINGS_CHANGE_EGG,
                'reinstall' => SubuserPermissions::SETTINGS_REINSTALL,
            ],
            'templates' => [
                'list' => SubuserPermissions::TEMPLATES_READ,
                'install' => SubuserPermissions::TEMPLATES_INSTALL,
            ],
            'activity' => [
                'read' => SubuserPermissions::ACTIVITY_READ,
            ],
            'subusers' => [
                'list' => SubuserPermissions::USER_READ,
                'create' => SubuserPermissions::USER_CREATE,
                'update' => SubuserPermissions::USER_UPDATE,
                'delete' => SubuserPermissions::USER_DELETE,
            ],
        ];

        return $permissionMap[$controller][$action] ?? null;
    }
}
