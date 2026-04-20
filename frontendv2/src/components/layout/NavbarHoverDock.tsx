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

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const CLOSE_MS = 420;

export function NavbarHoverDock({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearCloseTimer = useCallback(() => {
        if (closeTimerRef.current != null) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const openDock = useCallback(() => {
        clearCloseTimer();
        setOpen(true);
    }, [clearCloseTimer]);

    const scheduleClose = useCallback(() => {
        clearCloseTimer();
        closeTimerRef.current = setTimeout(() => {
            setOpen(false);
            closeTimerRef.current = null;
        }, CLOSE_MS);
    }, [clearCloseTimer]);

    useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

    return (
        <div className='relative z-30' onMouseEnter={openDock} onMouseLeave={scheduleClose} onFocusCapture={openDock}>
            <div className='hidden shrink-0 lg:block lg:h-3' aria-hidden />
            <div
                className={cn(
                    'max-lg:relative lg:relative lg:z-20 lg:origin-top lg:transition-transform lg:duration-300 lg:ease-out',
                    open
                        ? 'lg:translate-y-0 lg:pointer-events-auto'
                        : 'lg:-translate-y-[calc(100%-12px)] lg:pointer-events-none',
                    'lg:motion-reduce:translate-y-0 lg:motion-reduce:pointer-events-auto lg:motion-reduce:transition-none',
                )}
            >
                {children}
            </div>
        </div>
    );
}
