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

import type { AppSettings } from '@/types/settings';
import type { NavigationItem, PanelModule } from '@/types/navigation';

export type { PanelModule };

export const PANEL_MODULES: PanelModule[] = ['game', 'web', 'vds'];

/** Public setting that switches each module on or off. Missing values mean enabled (backward compatible). */
export const MODULE_SETTING_KEYS = {
    game: 'module_game_enabled',
    web: 'module_web_enabled',
    vds: 'module_vds_enabled',
} as const satisfies Record<PanelModule, keyof AppSettings>;

/** Short label shown as the module badge in sidebars, palette and dashboard. */
export const MODULE_BADGES: Record<PanelModule, string> = {
    game: 'GAME',
    web: 'WEB',
    vds: 'VDS',
};

export function isModuleEnabled(settings: AppSettings | null | undefined, module: PanelModule): boolean {
    const value = settings?.[MODULE_SETTING_KEYS[module]];
    return value === undefined || value === null || String(value) !== 'false';
}

export function getModuleStates(settings: AppSettings | null | undefined): Record<PanelModule, boolean> {
    return {
        game: isModuleEnabled(settings, 'game'),
        web: isModuleEnabled(settings, 'web'),
        vds: isModuleEnabled(settings, 'vds'),
    };
}

/** Route prefixes owned by a module. Anything not listed is shared. */
const MODULE_ROUTES: { prefix: string; module: PanelModule }[] = [
    { prefix: '/server/', module: 'game' },
    { prefix: '/dashboard/servers', module: 'game' },
    { prefix: '/admin/servers', module: 'game' },
    { prefix: '/admin/nodes', module: 'game' },
    { prefix: '/admin/realms', module: 'game' },
    { prefix: '/admin/spells', module: 'game' },
    { prefix: '/admin/mounts', module: 'game' },
    { prefix: '/admin/wings-backups', module: 'game' },
    { prefix: '/admin/backup-schedules', module: 'game' },
    { prefix: '/admin/subdomains', module: 'game' },
    { prefix: '/admin/pterodactyl-importer', module: 'game' },
    { prefix: '/webspace/', module: 'web' },
    { prefix: '/dashboard/webspaces', module: 'web' },
    { prefix: '/webspaces', module: 'web' },
    { prefix: '/admin/webspaces', module: 'web' },
    { prefix: '/admin/web-nodes', module: 'web' },
    { prefix: '/admin/webplates', module: 'web' },
    { prefix: '/admin/mail-hosts', module: 'web' },
    { prefix: '/admin/dns-hosts', module: 'web' },
    { prefix: '/admin/hosting-packages', module: 'web' },
    { prefix: '/vds/', module: 'vds' },
    { prefix: '/dashboard/vms', module: 'vds' },
    { prefix: '/admin/vm-instances', module: 'vds' },
    { prefix: '/admin/vds-nodes', module: 'vds' },
    { prefix: '/admin/vm-templates', module: 'vds' },
];

export function getModuleForPath(pathname: string): PanelModule | null {
    for (const { prefix, module } of MODULE_ROUTES) {
        const bare = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
        if (pathname === bare || pathname.startsWith(bare + '/')) return module;
    }
    return null;
}

/**
 * Drops navigation items of disabled modules (children included) and gives module items their
 * badge, so sidebars and the command palette show the same thing.
 */
export function applyModulesToNavigation(
    items: NavigationItem[],
    settings: AppSettings | null | undefined,
): NavigationItem[] {
    const out: NavigationItem[] = [];
    for (const item of items) {
        if (item.module && !isModuleEnabled(settings, item.module)) continue;
        const next: NavigationItem = item.module ? { ...item, badge: MODULE_BADGES[item.module] } : { ...item };
        if (item.children) next.children = applyModulesToNavigation(item.children, settings);
        out.push(next);
    }
    return out;
}
