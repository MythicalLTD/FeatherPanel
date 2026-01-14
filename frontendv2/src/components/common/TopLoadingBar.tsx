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

export default function TopLoadingBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [accentColor] = useState(() => {
        if (typeof window === 'undefined') return '262 83% 58%';

        const savedAccent = localStorage.getItem('accentColor') || 'purple';
        const colors: Record<string, string> = {
            purple: '262 83% 58%',
            blue: '217 91% 60%',
            green: '142 71% 45%',
            red: '0 84% 60%',
            orange: '25 95% 53%',
            pink: '330 81% 60%',
            teal: '173 80% 40%',
            yellow: '48 96% 53%',
        };
        return colors[savedAccent] || colors.purple;
    });

    useEffect(() => {
        // Use requestAnimationFrame to avoid synchronous setState in effect
        let timeoutId: NodeJS.Timeout;
        const rafId = requestAnimationFrame(() => {
            setLoading(true);
            // Shorter timeout for snappier feel
            timeoutId = setTimeout(() => {
                setLoading(false);
            }, 200);
        });
        return () => {
            cancelAnimationFrame(rafId);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [pathname, searchParams]);

    if (!loading) return null;

    return (
        <div className='fixed top-0 left-0 right-0 z-[9999] h-1'>
            <div
                className='h-full animate-loading-bar'
                style={{
                    background: `linear-gradient(90deg, transparent, hsl(${accentColor}), transparent)`,
                    backgroundSize: '200% 100%',
                }}
            />
        </div>
    );
}
