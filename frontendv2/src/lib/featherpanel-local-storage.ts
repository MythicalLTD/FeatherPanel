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

/** Never surfaced in the browser storage manager (large or sensitive). */
function isExcludedFromPanelBrowserStorage(key: string): boolean {
    const k = key.toLowerCase();
    if (k === 'app_settings') return true;
    if (k.startsWith('translations_')) return true;
    return false;
}

/** Keys used by the panel that do not always include “featherpanel” in the name. */
const EXTRA_PANEL_KEYS = new Set([
    'locale',
    'theme',
    'accentcolor',
    'fontfamily',
    'backgroundtype',
    'backgroundanimatedvariant',
    'backgroundimage',
    'backdropblur',
    'backdropdarken',
    'backgroundimagefit',
    'motionlevel',
    'admin-hidden-widgets',
    'app-url-warning-dismissed',
    'servers_preferences',
    'server_folders',
    'server_folder_assignments',
    'iamahacker',
    'fp_iamahacker',
]);

export function isPanelBrowserStorageKey(key: string): boolean {
    if (isExcludedFromPanelBrowserStorage(key)) return false;
    const k = key.toLowerCase();
    if (k.includes('featherpanel')) return true;
    if (k.startsWith('feather_')) return true;
    if (EXTRA_PANEL_KEYS.has(k)) return true;
    return false;
}

export interface PanelBrowserStorageEntry {
    key: string;
    value: string;
    /** UTF-16 length of stored string (approx. size indicator). */
    size: number;
}

export function readPanelBrowserStorage(): PanelBrowserStorageEntry[] {
    if (typeof window === 'undefined') return [];
    const out: PanelBrowserStorageEntry[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || !isPanelBrowserStorageKey(key)) continue;
        const value = window.localStorage.getItem(key) ?? '';
        out.push({ key, value, size: value.length });
    }
    out.sort((a, b) => a.key.localeCompare(b.key));
    return out;
}

export function removePanelBrowserStorageKey(key: string): void {
    if (typeof window === 'undefined') return;
    if (!isPanelBrowserStorageKey(key)) return;
    window.localStorage.removeItem(key);
}

/** Removes every localStorage entry that {@link isPanelBrowserStorageKey} matches. Returns how many keys were removed. */
export function clearAllPanelBrowserStorage(): number {
    if (typeof window === 'undefined') return 0;
    const keys = readPanelBrowserStorage().map((e) => e.key);
    for (const key of keys) {
        window.localStorage.removeItem(key);
    }
    return keys.length;
}
