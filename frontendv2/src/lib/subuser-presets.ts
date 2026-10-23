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

/** Permission presets for subusers and invite links. Unavailable permissions are dropped when applied. */
export interface SubuserPreset {
    id: string;
    permissions: string[];
}

const READ = [
    'websocket.connect',
    'file.read',
    'file.read-content',
    'backup.read',
    'allocation.read',
    'startup.read',
    'database.read',
    'schedule.read',
    'activity.read',
    'firewall.read',
    'proxy.read',
];

export const SUBUSER_PRESETS: SubuserPreset[] = [
    { id: 'readOnly', permissions: READ },
    {
        id: 'console',
        permissions: [
            'websocket.connect',
            'control.console',
            'control.start',
            'control.stop',
            'control.restart',
            'activity.read',
        ],
    },
    {
        id: 'files',
        permissions: [
            'websocket.connect',
            'file.create',
            'file.read',
            'file.read-content',
            'file.update',
            'file.delete',
            'file.archive',
            'file.sftp',
        ],
    },
    { id: 'manager', permissions: [] },
];

/** Resolve a preset against what the current user may grant. "manager" means everything except user management. */
export function resolvePreset(preset: SubuserPreset, available: string[]): string[] {
    if (preset.id === 'manager') {
        return available.filter((p) => !p.startsWith('user.'));
    }
    return preset.permissions.filter((p) => available.includes(p));
}
