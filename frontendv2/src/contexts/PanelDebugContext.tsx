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

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type PanelDebugContextValue = {
    open: boolean;
    command: string;
    openDebugConsole: (command?: string) => void;
    closeDebugConsole: () => void;
};

const PanelDebugContext = createContext<PanelDebugContextValue | undefined>(undefined);

export function PanelDebugProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [command, setCommand] = useState('');

    const openDebugConsole = useCallback((nextCommand = '') => {
        setCommand(nextCommand);
        setOpen(true);
    }, []);

    const closeDebugConsole = useCallback(() => {
        setOpen(false);
        setCommand('');
    }, []);

    const value = useMemo(
        () => ({ open, command, openDebugConsole, closeDebugConsole }),
        [open, command, openDebugConsole, closeDebugConsole],
    );

    return <PanelDebugContext.Provider value={value}>{children}</PanelDebugContext.Provider>;
}

export function usePanelDebug() {
    const ctx = useContext(PanelDebugContext);
    if (!ctx) throw new Error('usePanelDebug must be used within PanelDebugProvider');
    return ctx;
}
