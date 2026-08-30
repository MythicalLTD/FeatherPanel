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

/**
 * Permission constants for WebSpace subusers.
 */
class WebSpaceSubuserPermissions
{
    public const FILE_READ = 'file.read';
    public const FILE_READ_CONTENT = 'file.read-content';
    public const FILE_CREATE = 'file.create';
    public const FILE_UPDATE = 'file.update';
    public const FILE_DELETE = 'file.delete';
    public const FILE_SFTP = 'file.sftp';
    public const CONTROL_START = 'control.start';
    public const CONTROL_STOP = 'control.stop';
    public const CONTROL_RESTART = 'control.restart';
    public const CONSOLE_OUTPUT = 'console.output';
    public const CONSOLE_SEND = 'console.send';
    public const BACKUP_READ = 'backup.read';
    public const BACKUP_CREATE = 'backup.create';
    public const BACKUP_DELETE = 'backup.delete';
    public const BACKUP_DOWNLOAD = 'backup.download';
    public const BACKUP_RESTORE = 'backup.restore';
    public const ACTIVITY_READ = 'activity.read';
    public const SETTINGS_READ = 'settings.read';
    public const SETTINGS_UPDATE = 'settings.update';
    public const SCHEDULE_READ = 'schedule.read';
    public const SCHEDULE_CREATE = 'schedule.create';
    public const SCHEDULE_UPDATE = 'schedule.update';
    public const SCHEDULE_DELETE = 'schedule.delete';
    public const USER_READ = 'user.read';
    public const USER_CREATE = 'user.create';
    public const USER_UPDATE = 'user.update';
    public const USER_DELETE = 'user.delete';
    public const DATABASE_READ = 'database.read';
    public const DATABASE_CREATE = 'database.create';
    public const DATABASE_UPDATE = 'database.update';
    public const DATABASE_DELETE = 'database.delete';
    public const DATABASE_VIEW_PASSWORD = 'database.view_password';
    public const MAIL_READ = 'mail.read';
    public const MAIL_CREATE = 'mail.create';
    public const MAIL_UPDATE = 'mail.update';
    public const MAIL_DELETE = 'mail.delete';
    public const MAIL_VIEW_PASSWORD = 'mail.view_password';
    public const DNS_READ = 'dns.read';
    public const DNS_MANAGE = 'dns.manage';

    public const PERMISSIONS = [
        self::FILE_READ,
        self::FILE_READ_CONTENT,
        self::FILE_CREATE,
        self::FILE_UPDATE,
        self::FILE_DELETE,
        self::FILE_SFTP,
        self::CONTROL_START,
        self::CONTROL_STOP,
        self::CONTROL_RESTART,
        self::CONSOLE_OUTPUT,
        self::CONSOLE_SEND,
        self::BACKUP_READ,
        self::BACKUP_CREATE,
        self::BACKUP_DELETE,
        self::BACKUP_DOWNLOAD,
        self::BACKUP_RESTORE,
        self::ACTIVITY_READ,
        self::SETTINGS_READ,
        self::SETTINGS_UPDATE,
        self::SCHEDULE_READ,
        self::SCHEDULE_CREATE,
        self::SCHEDULE_UPDATE,
        self::SCHEDULE_DELETE,
        self::USER_READ,
        self::USER_CREATE,
        self::USER_UPDATE,
        self::USER_DELETE,
        self::DATABASE_READ,
        self::DATABASE_CREATE,
        self::DATABASE_UPDATE,
        self::DATABASE_DELETE,
        self::DATABASE_VIEW_PASSWORD,
        self::MAIL_READ,
        self::MAIL_CREATE,
        self::MAIL_UPDATE,
        self::MAIL_DELETE,
        self::MAIL_VIEW_PASSWORD,
        self::DNS_READ,
        self::DNS_MANAGE,
    ];

    /**
     * @return list<string>
     */
    public static function getAll(): array
    {
        return self::PERMISSIONS;
    }

    /**
     * @return array<string, array{permissions: list<string>}>
     */
    public static function getGrouped(): array
    {
        return [
            'file' => [
                'permissions' => [
                    self::FILE_READ,
                    self::FILE_READ_CONTENT,
                    self::FILE_CREATE,
                    self::FILE_UPDATE,
                    self::FILE_DELETE,
                    self::FILE_SFTP,
                ],
            ],
            'control' => [
                'permissions' => [
                    self::CONTROL_START,
                    self::CONTROL_STOP,
                    self::CONTROL_RESTART,
                    self::CONSOLE_OUTPUT,
                    self::CONSOLE_SEND,
                ],
            ],
            'backup' => [
                'permissions' => [
                    self::BACKUP_READ,
                    self::BACKUP_CREATE,
                    self::BACKUP_DELETE,
                    self::BACKUP_DOWNLOAD,
                    self::BACKUP_RESTORE,
                ],
            ],
            'activity' => [
                'permissions' => [
                    self::ACTIVITY_READ,
                ],
            ],
            'settings' => [
                'permissions' => [
                    self::SETTINGS_READ,
                    self::SETTINGS_UPDATE,
                ],
            ],
            'schedule' => [
                'permissions' => [
                    self::SCHEDULE_READ,
                    self::SCHEDULE_CREATE,
                    self::SCHEDULE_UPDATE,
                    self::SCHEDULE_DELETE,
                ],
            ],
            'user' => [
                'permissions' => [
                    self::USER_READ,
                    self::USER_CREATE,
                    self::USER_UPDATE,
                    self::USER_DELETE,
                ],
            ],
            'database' => [
                'permissions' => [
                    self::DATABASE_READ,
                    self::DATABASE_CREATE,
                    self::DATABASE_UPDATE,
                    self::DATABASE_DELETE,
                    self::DATABASE_VIEW_PASSWORD,
                ],
            ],
            'mail' => [
                'permissions' => [
                    self::MAIL_READ,
                    self::MAIL_CREATE,
                    self::MAIL_UPDATE,
                    self::MAIL_DELETE,
                    self::MAIL_VIEW_PASSWORD,
                ],
            ],
            'dns' => [
                'permissions' => [
                    self::DNS_READ,
                    self::DNS_MANAGE,
                ],
            ],
        ];
    }
}
