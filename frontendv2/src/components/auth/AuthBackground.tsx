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

export default function AuthBackground() {
    return (
        <div className='pointer-events-none absolute inset-0 overflow-hidden' aria-hidden>
            {/* Base gradient */}
            <div
                className='absolute inset-0 opacity-[0.85] dark:opacity-100'
                style={{
                    background:
                        'radial-gradient(ellipse 120% 80% at 50% -20%, hsl(var(--primary) / 0.25), transparent 50%), radial-gradient(ellipse 80% 60% at 80% 50%, hsl(var(--primary) / 0.15), transparent 45%), radial-gradient(ellipse 70% 70% at 20% 80%, hsl(var(--primary) / 0.12), transparent 45%), hsl(var(--background))',
                }}
            />
            {/* Previously animated blobs; now always static since motion is forced off. */}
            <div
                className='absolute inset-0 opacity-30 dark:opacity-40'
                style={{
                    background:
                        'radial-gradient(ellipse 60% 50% at 70% 30%, hsl(var(--primary) / 0.4), transparent), radial-gradient(ellipse 50% 60% at 30% 70%, hsl(var(--primary) / 0.3), transparent)',
                }}
            />
            {/* Subtle grain overlay */}
            <div
                className='absolute inset-0 opacity-[0.03] dark:opacity-[0.05]'
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />
        </div>
    );
}
