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

import { useState } from 'react';

export default function Loading() {
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

    return (
        <div className='motion-always flex min-h-screen items-center justify-center bg-background'>
            <div className='relative'>
                <div
                    className='h-16 w-16 rounded-full border-4 border-transparent animate-spin'
                    style={{
                        borderTopColor: `hsl(${accentColor})`,
                        borderRightColor: `hsl(${accentColor} / 0.3)`,
                        animationDuration: '0.8s',
                    }}
                />

                <div className='absolute inset-0 flex items-center justify-center'>
                    <div
                        className='h-3 w-3 rounded-full animate-pulse'
                        style={{
                            backgroundColor: `hsl(${accentColor})`,
                            animationDuration: '1.5s',
                        }}
                    />
                </div>

                <div
                    className='absolute inset-0 rounded-full blur-xl opacity-20 animate-pulse'
                    style={{
                        backgroundColor: `hsl(${accentColor})`,
                        animationDuration: '2s',
                    }}
                />
            </div>
        </div>
    );
}
