/*
This file is part of FeatherPanel.
 */

/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

export const WebSpaceSubuserPermissions = {
    'file.read': 'file.read',
    'file.read-content': 'file.read-content',
    'file.create': 'file.create',
    'file.update': 'file.update',
    'file.delete': 'file.delete',
    'file.sftp': 'file.sftp',
    'control.start': 'control.start',
    'control.stop': 'control.stop',
    'control.restart': 'control.restart',
    'control.console': 'control.console',
    'console.output': 'console.output',
    'console.send': 'console.send',
    'websocket.connect': 'websocket.connect',
    'backup.read': 'backup.read',
    'backup.create': 'backup.create',
    'backup.delete': 'backup.delete',
    'backup.download': 'backup.download',
    'backup.restore': 'backup.restore',
    'activity.read': 'activity.read',
    'settings.read': 'settings.read',
    'settings.update': 'settings.update',
    'schedule.read': 'schedule.read',
    'schedule.create': 'schedule.create',
    'schedule.update': 'schedule.update',
    'schedule.delete': 'schedule.delete',
    'user.read': 'user.read',
    'user.create': 'user.create',
    'user.update': 'user.update',
    'user.delete': 'user.delete',
    'database.read': 'database.read',
    'database.create': 'database.create',
    'database.update': 'database.update',
    'database.delete': 'database.delete',
    'database.view_password': 'database.view_password',
    'mail.read': 'mail.read',
    'mail.create': 'mail.create',
    'mail.update': 'mail.update',
    'mail.delete': 'mail.delete',
    'mail.view_password': 'mail.view_password',
    'dns.read': 'dns.read',
    'dns.manage': 'dns.manage',
} as const;
