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
        ];
    }
}
