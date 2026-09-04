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

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { resolveAccentHsl } from '@/lib/accent-colors';

export default function TopLoadingBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [visible, setVisible] = useState(false);
    const [accentHsl] = useState(() => {
        if (typeof window === 'undefined') return '262 83% 58%';
        return resolveAccentHsl(localStorage.getItem('accentColor') || 'purple');
    });

    useEffect(() => {
        let hideTimer: number | undefined;
        const showRaf = requestAnimationFrame(() => {
            setVisible(true);
            hideTimer = window.setTimeout(() => setVisible(false), 280);
        });

        return () => {
            cancelAnimationFrame(showRaf);
            if (hideTimer) window.clearTimeout(hideTimer);
        };
    }, [pathname, searchParams]);

    if (!visible) return null;

    return (
        <div className='pointer-events-none fixed top-0 right-0 left-0 z-[9999] h-0.5 overflow-hidden'>
            <div
                className='animate-loading-bar h-full w-full'
                style={{
                    background: `linear-gradient(90deg, transparent 0%, hsl(${accentHsl}) 45%, hsl(${accentHsl}) 55%, transparent 100%)`,
                    backgroundSize: '200% 100%',
                }}
            />
        </div>
    );
}
