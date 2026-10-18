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

/**
 * Sidebar section order shared by the sidebar and the bottom dock. Each sidebar only shows the
 * groups its items use, so the server/VDS/webspace groups (management..configuration) and the
 * admin sections can live in one list. Unknown groups (plugins) sort after these, A-Z.
 */
export const NAV_GROUP_ORDER = [
    // dashboard + entity sidebars
    'overview',
    'management',
    'files',
    'networking',
    'automation',
    'configuration',
    // admin sections
    'users',
    'servers',
    'infrastructure',
    'templates',
    'support',
    'security',
    'settings',
    'system',
    'myfeatherpanel',
    'developer',
    // legacy groups plugins may still use
    'feathercloud',
    'tickets',
    'content',
    'plugins',
];

export function compareNavGroups(a: string, b: string): number {
    const indexA = NAV_GROUP_ORDER.indexOf(a.toLowerCase());
    const indexB = NAV_GROUP_ORDER.indexOf(b.toLowerCase());
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
}
