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
        // Desktop: the bar overlays the page instead of reserving its full height, so revealing it on
        // hover never pushes content down and hiding it never leaves an empty band. A slim handle marks
        // the hover target while the bar is tucked away, rather than a sliver of the clipped bar.
        <div className='fp-chrome-motion relative z-30 lg:h-5 lg:shrink-0 lg:motion-reduce:h-auto'>
            <div
                className='lg:absolute lg:inset-x-0 lg:top-0 lg:motion-reduce:static'
                onMouseEnter={openDock}
                onMouseLeave={scheduleClose}
                onFocusCapture={openDock}
            >
                <div
                    aria-hidden
                    className={cn(
                        'fp-navbar-handle hidden lg:mx-auto lg:mt-1.5 lg:block lg:h-1.5 lg:w-24 lg:rounded-full lg:transition-opacity lg:duration-200',
                        open ? 'lg:opacity-0' : 'lg:opacity-100',
                        'lg:motion-reduce:hidden',
                    )}
                />
                <div
                    className={cn(
                        'max-lg:relative lg:absolute lg:inset-x-0 lg:top-0 lg:z-20 lg:pt-3 lg:transition-[transform,opacity] lg:duration-300 lg:ease-out',
                        open
                            ? 'lg:pointer-events-auto lg:translate-y-0 lg:opacity-100'
                            : 'lg:pointer-events-none lg:-translate-y-full lg:opacity-0',
                        'lg:motion-reduce:pointer-events-auto lg:motion-reduce:static lg:motion-reduce:translate-y-0 lg:motion-reduce:opacity-100 lg:motion-reduce:transition-none',
                    )}
                >
                    {children}
                </div>
                {/* Invisible strip keeps a generous hover target while the bar is hidden. */}
                <div aria-hidden className={cn('hidden lg:block lg:h-5', open && 'lg:hidden')} />
            </div>
        </div>
    );
}
