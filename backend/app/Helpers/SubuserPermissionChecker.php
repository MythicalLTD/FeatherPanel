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

use App\App;
use App\Chat\User;
use App\Chat\Server;
use App\Permissions;
use App\Chat\Subuser;
use App\SubuserPermissions;

class SubuserPermissionChecker
{
    /** @var (\Closure(int, int): ?array)|null test hook: subuser row lookup */
    public static ?\Closure $subuserResolver = null;
    /** @var (\Closure(int): ?int)|null test hook: server id to owner id */
    public static ?\Closure $ownerResolver = null;
    /** @var (\Closure(int): list<string>)|null test hook: user id to role permission nodes */
    public static ?\Closure $roleNodesResolver = null;

    /**
     * Full access without a subuser row: the server owner, or staff whose role can manage
     * servers (the same admin rule as ServerGateway::canUserAccessServer).
     */
    public static function hasFullAccess(int $userId, int $serverId): bool
    {
        if ($userId <= 0 || $serverId <= 0) {
            return false;
        }
        $ownerId = self::$ownerResolver !== null
            ? (self::$ownerResolver)($serverId)
            : (($s = Server::getServerById($serverId)) !== null ? (int) $s['owner_id'] : null);
        if ($ownerId === null) {
            return false;
        }
        if ($ownerId === $userId) {
            return true;
        }
        if (self::$roleNodesResolver !== null) {
            $nodes = (self::$roleNodesResolver)($userId);
        } else {
            $user = User::getUserById($userId);
            $nodes = $user ? PermissionHelper::getPermissionNodesForRole((int) ($user['role_id'] ?? 0)) : [];
        }

        return in_array('admin.root', $nodes, true)
            || in_array(Permissions::ADMIN_SERVERS_VIEW, $nodes, true)
            || in_array(Permissions::ADMIN_SERVERS_EDIT, $nodes, true)
            || in_array(Permissions::ADMIN_SERVERS_DELETE, $nodes, true);
    }

    private static function subuserRow(int $userId, int $serverId): ?array
    {
        $row = self::$subuserResolver !== null
            ? (self::$subuserResolver)($userId, $serverId)
            : Subuser::getSubuserByUserAndServer($userId, $serverId);

        return $row ?: null;
    }

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
        $subuser = self::subuserRow($userId, $serverId);

        // No subuser row: only the owner or staff with server admin rights get everything.
        if (!$subuser) {
            return self::hasFullAccess($userId, $serverId);
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
     * Get the permission list for a user on a server.
     *
     * @return array|null Null when the user is the owner (all permissions), otherwise the subuser permission list
     */
    public static function getPermissions(int $userId, int $serverId): ?array
    {
        $subuser = self::subuserRow($userId, $serverId);

        if (!$subuser) {
            // Owner or server admin: full permission set. Anyone else: nothing.
            return self::hasFullAccess($userId, $serverId) ? null : [];
        }

        $permissions = [];
        if (isset($subuser['permissions']) && !empty($subuser['permissions'])) {
            try {
                $decoded = json_decode($subuser['permissions'], true);
                $permissions = is_array($decoded) ? $decoded : [];
            } catch (\Exception $e) {
                App::getInstance(true)->getLogger()->error('Failed to parse subuser permissions: ' . $e->getMessage());

                return [];
            }
        }

        return $permissions;
    }

    /**
     * Whether the actor may assign the given permissions to another subuser.
     * Owners may assign any valid permission; subusers may only assign a subset of their own.
     */
    public static function canAssignPermissions(int $userId, int $serverId, array $permissions): bool
    {
        $actorPermissions = self::getPermissions($userId, $serverId);

        // Owner can assign any permission
        if ($actorPermissions === null) {
            return true;
        }

        foreach ($permissions as $permission) {
            if (!in_array($permission, $actorPermissions, true)) {
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
