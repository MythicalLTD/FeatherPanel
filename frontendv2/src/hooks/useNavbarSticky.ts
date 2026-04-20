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

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

const STORAGE_KEY = 'featherpanel_navbar_sticky';

const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach((listener) => listener());
}

function readEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw == null) return true;
        return raw === 'true';
    } catch {
        return true;
    }
}

export function useNavbarSticky() {
    const [navbarSticky, setNavbarStickyState] = useState<boolean>(() =>
        typeof window === 'undefined' ? true : readEnabled(),
    );

    useLayoutEffect(() => {
        const sync = () => setNavbarStickyState(readEnabled());
        listeners.add(sync);
        sync();
        return () => {
            listeners.delete(sync);
        };
    }, []);

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                notifyListeners();
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

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

