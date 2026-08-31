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

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type GlobalSearchContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | undefined>(undefined);

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        setOpen((current) => !current);
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!event.ctrlKey || event.metaKey || event.altKey || event.key.toLowerCase() !== 'd') return;
            const target = event.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();
            const isEditable =
                tag === 'input' ||
                tag === 'textarea' ||
                tag === 'select' ||
                target?.isContentEditable ||
                target?.closest('[contenteditable="true"]');

            if (isEditable) return;

            event.preventDefault();
            toggle();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [toggle]);

    const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

    return <GlobalSearchContext.Provider value={value}>{children}</GlobalSearchContext.Provider>;
}

export function useGlobalSearch() {
    const context = useContext(GlobalSearchContext);
    if (!context) {
        throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
    }
    return context;
}
