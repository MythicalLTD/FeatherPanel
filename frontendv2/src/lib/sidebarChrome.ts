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

export const SIDEBAR_COLLAPSED_KEY = 'featherpanel_sidebar_collapsed';
export const SIDEBAR_TOGGLE_EVENT = 'toggle-sidebar';

export function readSidebarCollapsed(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
        return false;
    }
}

export function setSidebarCollapsed(next: boolean) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch {
        // ignore
    }
    window.dispatchEvent(new CustomEvent<boolean>(SIDEBAR_TOGGLE_EVENT, { detail: next }));
}

export function toggleSidebarCollapsed() {
    setSidebarCollapsed(!readSidebarCollapsed());
}

export function subscribeSidebarCollapsed(onChange: (collapsed: boolean) => void) {
    if (typeof window === 'undefined') return () => {};

    const onToggle = (event: Event) => {
        const detail = (event as CustomEvent<boolean>).detail;
        if (typeof detail === 'boolean') {
            onChange(detail);
        }
    };

    const onStorage = (event: StorageEvent) => {
        if (event.key === SIDEBAR_COLLAPSED_KEY) {
            onChange(readSidebarCollapsed());
        }
    };

    window.addEventListener(SIDEBAR_TOGGLE_EVENT, onToggle);
    window.addEventListener('storage', onStorage);

    return () => {
        window.removeEventListener(SIDEBAR_TOGGLE_EVENT, onToggle);
        window.removeEventListener('storage', onStorage);
    };
}
