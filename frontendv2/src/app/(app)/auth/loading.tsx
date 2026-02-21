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

export default function AuthLoading() {
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
        <div className='motion-always flex min-h-screen items-center justify-center'>
            <div className='relative'>
                <div
                    className='h-12 w-12 rounded-full border-3 border-transparent animate-spin'
                    style={{
                        borderTopColor: `hsl(${accentColor})`,
                        borderRightColor: `hsl(${accentColor} / 0.3)`,
                        animationDuration: '0.6s',
                    }}
                />

                <div className='absolute inset-0 flex items-center justify-center'>
                    <div
                        className='h-2 w-2 rounded-full animate-pulse'
                        style={{
                            backgroundColor: `hsl(${accentColor})`,
                            animationDuration: '1.2s',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
