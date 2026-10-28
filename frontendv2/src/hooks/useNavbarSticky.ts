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

'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'featherpanel_navbar_sticky';
const DEFAULT_STICKY = true;

const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach((listener) => listener());
}

function readEnabled(): boolean {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw == null) return DEFAULT_STICKY;
        return raw === 'true';
    } catch {
        return DEFAULT_STICKY;
    }
}

function subscribe(onStoreChange: () => void) {
    listeners.add(onStoreChange);
    const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) onStoreChange();
    };
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(onStoreChange);
        window.removeEventListener('storage', onStorage);
    };
}

export function useNavbarSticky() {
    // getServerSnapshot must match the first client render so hydration stays clean;
    // localStorage is applied after hydrate via useSyncExternalStore.
    const navbarSticky = useSyncExternalStore(subscribe, readEnabled, () => DEFAULT_STICKY);

    const setNavbarSticky = useCallback((next: boolean) => {
        try {
            localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
        } catch {
            // ignore
        }
        notifyListeners();
    }, []);

    return { navbarSticky, setNavbarSticky };
}
