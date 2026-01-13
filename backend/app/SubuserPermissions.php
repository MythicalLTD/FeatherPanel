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

namespace App;

class SubuserPermissions
{
    // Individual Subuser Permission Constants
    public const WEBSOCKET_CONNECT = 'websocket.connect';
    public const CONTROL_CONSOLE = 'control.console';
    public const CONTROL_START = 'control.start';
    public const CONTROL_STOP = 'control.stop';
    public const CONTROL_RESTART = 'control.restart';
    public const USER_CREATE = 'user.create';
    public const USER_READ = 'user.read';
    public const USER_UPDATE = 'user.update';
    public const USER_DELETE = 'user.delete';
    public const FILE_CREATE = 'file.create';
    public const FILE_READ = 'file.read';
    public const FILE_READ_CONTENT = 'file.read-content';
    public const FILE_UPDATE = 'file.update';
    public const FILE_DELETE = 'file.delete';
    public const FILE_ARCHIVE = 'file.archive';
    public const FILE_SFTP = 'file.sftp';
    public const BACKUP_CREATE = 'backup.create';
    public const BACKUP_READ = 'backup.read';
    public const BACKUP_DELETE = 'backup.delete';
    public const BACKUP_DOWNLOAD = 'backup.download';
    public const BACKUP_RESTORE = 'backup.restore';
    public const ALLOCATION_READ = 'allocation.read';
    public const ALLOCATION_CREATE = 'allocation.create';
    public const ALLOCATION_UPDATE = 'allocation.update';
    public const ALLOCATION_DELETE = 'allocation.delete';
    public const STARTUP_READ = 'startup.read';
    public const STARTUP_UPDATE = 'startup.update';
    public const STARTUP_DOCKER_IMAGE = 'startup.docker-image';
    public const TEMPLATES_READ = 'templates.read';
    public const TEMPLATES_INSTALL = 'templates.install';
    public const DATABASE_CREATE = 'database.create';
    public const DATABASE_READ = 'database.read';
    public const DATABASE_UPDATE = 'database.update';
    public const DATABASE_DELETE = 'database.delete';
    public const DATABASE_VIEW_PASSWORD = 'database.view_password';
    public const SCHEDULE_CREATE = 'schedule.create';
    public const SCHEDULE_READ = 'schedule.read';
    public const SCHEDULE_UPDATE = 'schedule.update';
    public const SCHEDULE_DELETE = 'schedule.delete';
    public const SETTINGS_RENAME = 'settings.rename';
    public const SETTINGS_CHANGE_EGG = 'settings.change-egg';
    public const SETTINGS_REINSTALL = 'settings.reinstall';
    public const ACTIVITY_READ = 'activity.read';
    public const SUBDOMAIN_MANAGE = 'subdomain.manage';
    public const FIREWALL_READ = 'firewall.read';
    public const FIREWALL_MANAGE = 'firewall.manage';
    public const PROXY_READ = 'proxy.read';
    public const PROXY_MANAGE = 'proxy.manage';
    public const IMPORT_READ = 'import.read';
    public const IMPORT_MANAGE = 'import.manage';

    // Array of all permissions
    public const PERMISSIONS = [
        self::WEBSOCKET_CONNECT,
        self::CONTROL_CONSOLE,
        self::CONTROL_START,
        self::CONTROL_STOP,
        self::CONTROL_RESTART,
        self::USER_CREATE,
        self::USER_READ,
        self::USER_UPDATE,
        self::USER_DELETE,
        self::FILE_CREATE,
        self::FILE_READ,
        self::FILE_READ_CONTENT,
        self::FILE_UPDATE,
        self::FILE_DELETE,
        self::FILE_ARCHIVE,
        self::FILE_SFTP,
        self::BACKUP_CREATE,
        self::BACKUP_READ,
        self::BACKUP_DELETE,
        self::BACKUP_DOWNLOAD,
        self::BACKUP_RESTORE,
        self::ALLOCATION_READ,
        self::ALLOCATION_CREATE,
        self::ALLOCATION_UPDATE,
        self::ALLOCATION_DELETE,
        self::STARTUP_READ,
        self::STARTUP_UPDATE,
        self::STARTUP_DOCKER_IMAGE,
        self::TEMPLATES_READ,
        self::TEMPLATES_INSTALL,
        self::DATABASE_CREATE,
        self::DATABASE_READ,
        self::DATABASE_UPDATE,
        self::DATABASE_DELETE,
        self::DATABASE_VIEW_PASSWORD,
        self::SCHEDULE_CREATE,
        self::SCHEDULE_READ,
        self::SCHEDULE_UPDATE,
        self::SCHEDULE_DELETE,
        self::SETTINGS_RENAME,
        self::SETTINGS_CHANGE_EGG,
        self::SETTINGS_REINSTALL,
        self::ACTIVITY_READ,
        self::SUBDOMAIN_MANAGE,
        self::FIREWALL_READ,
        self::FIREWALL_MANAGE,
        self::PROXY_READ,
        self::PROXY_MANAGE,
        self::IMPORT_READ,
        self::IMPORT_MANAGE,
    ];

    /**
     * Get permissions grouped by category.
     * Returns only the structure with permission keys - translations are handled in frontend.
     */
    public static function getGroupedPermissions(): array
    {
        return [
            'websocket' => [
                'permissions' => ['websocket.connect'],
            ],
            'control' => [
                'permissions' => ['control.console', 'control.start', 'control.stop', 'control.restart'],
            ],
            'user' => [
                'permissions' => ['user.create', 'user.read', 'user.update', 'user.delete'],
            ],
            'file' => [
                'permissions' => ['file.create', 'file.read', 'file.read-content', 'file.update', 'file.delete', 'file.archive', 'file.sftp'],
            ],
            'backup' => [
                'permissions' => ['backup.create', 'backup.read', 'backup.delete', 'backup.download', 'backup.restore'],
            ],
            'allocation' => [
                'permissions' => ['allocation.read', 'allocation.create', 'allocation.update', 'allocation.delete'],
            ],
            'startup' => [
                'permissions' => ['startup.read', 'startup.update', 'startup.docker-image'],
            ],
            'templates' => [
                'permissions' => ['templates.read', 'templates.install'],
            ],
            'database' => [
                'permissions' => ['database.create', 'database.read', 'database.update', 'database.delete', 'database.view_password'],
            ],
            'schedule' => [
                'permissions' => ['schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete'],
            ],
            'settings' => [
                'permissions' => ['settings.rename', 'settings.change-egg', 'settings.reinstall'],
            ],
            'activity' => [
                'permissions' => ['activity.read'],
            ],
            'subdomain' => [
                'permissions' => ['subdomain.manage'],
            ],
            'firewall' => [
                'permissions' => ['firewall.read', 'firewall.manage'],
            ],
            'proxy' => [
                'permissions' => ['proxy.read', 'proxy.manage'],
            ],
            'import' => [
                'permissions' => ['import.read', 'import.manage'],
            ],
        ];
    }
}
