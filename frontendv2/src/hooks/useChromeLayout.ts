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

import { useCallback, useEffect, useState } from 'react';

export type ChromeLayout = 'modern' | 'classic';

const STORAGE_KEY = 'featherpanel-chrome-layout';
const EVENT_NAME = 'featherpanel-chrome-layout-change';

function readChromeLayout(): ChromeLayout {
    if (typeof window === 'undefined') {
        return 'modern';
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'classic' ? 'classic' : 'modern';
}

export function useChromeLayout() {
    const [chromeLayout, setChromeLayoutState] = useState<ChromeLayout>(() =>
        typeof window === 'undefined' ? 'modern' : readChromeLayout(),
    );

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                setChromeLayoutState(readChromeLayout());
            }
        };
        const onCustom = () => setChromeLayoutState(readChromeLayout());
        window.addEventListener('storage', onStorage);
        window.addEventListener(EVENT_NAME, onCustom as EventListener);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(EVENT_NAME, onCustom as EventListener);
        };
    }, []);

    const setChromeLayout = useCallback((layout: ChromeLayout) => {
        if (typeof window === 'undefined') {
            return;
        }
        window.localStorage.setItem(STORAGE_KEY, layout);
        window.dispatchEvent(new Event(EVENT_NAME));
        setChromeLayoutState(layout);
    }, []);

    return { chromeLayout, setChromeLayout };
}
