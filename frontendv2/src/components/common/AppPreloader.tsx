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
import Image from 'next/image';
import { useSettings } from '@/contexts/SettingsContext';

export default function AppPreloader() {
    const { settings } = useSettings();
    const [theme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') return 'dark';
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return savedTheme || (prefersDark ? 'dark' : 'light');
    });

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const appName = settings?.app_name || 'FeatherPanel';
    const logoUrl =
        theme === 'dark'
            ? settings?.app_logo_dark || settings?.app_logo_white || 'https://github.com/featherpanel-com.png'
            : settings?.app_logo_white || 'https://github.com/featherpanel-com.png';

    return (
        <div className='bg-background animate-fade-in fixed inset-0 z-9999 flex items-center justify-center overflow-hidden'>
            <div
                className='absolute inset-0 animate-pulse opacity-5'
                style={{
                    background: 'radial-gradient(circle at 50% 50%, rgb(255, 255, 255) 0%, transparent 50%)',
                    animationDuration: '3s',
                }}
            />

            <div className='relative z-10 flex flex-col items-center gap-6'>
                <div className='animate-fade-in relative' style={{ animationDelay: '0.1s' }}>
                    <div
                        className='relative flex h-20 w-20 animate-bounce items-center justify-center'
                        style={{ animationDuration: '2s' }}
                    >
                        <Image src={logoUrl} alt={appName} fill className='object-contain' sizes='80px' priority />
                    </div>

                    <div
                        className='bg-primary/20 absolute inset-0 animate-pulse rounded-2xl blur-2xl'
                        style={{
                            animationDuration: '2s',
                        }}
                    />
                </div>

                <div className='animate-fade-in relative' style={{ animationDelay: '0.2s' }}>
                    <div
                        className='h-12 w-12 animate-spin rounded-full border-3 border-transparent'
                        style={{
                            borderTopColor: 'hsl(var(--primary))',
                            borderRightColor: 'hsl(var(--primary) / 0.3)',
                            animationDuration: '0.8s',
                        }}
                    />
                </div>

                <div className='animate-fade-in space-y-2 text-center' style={{ animationDelay: '0.3s' }}>
                    <p className='text-foreground text-lg font-semibold'>Loading {appName}</p>
                    <p className='text-muted-foreground animate-pulse text-sm'>Initializing application...</p>
                </div>
            </div>
        </div>
    );
}
