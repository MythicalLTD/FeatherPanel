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

import Link from 'next/link';
import Image from 'next/image';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import BackgroundWrapper from '@/components/theme/BackgroundWrapper';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { PanelBrandingFooter } from '@/components/branding/PanelBrandingFooter';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const { theme } = useTheme();
    const { settings } = useSettings();

    const appName = settings?.app_name || 'FeatherPanel';
    const logoUrl =
        theme === 'dark'
            ? settings?.app_logo_dark || settings?.app_logo_white || '/assets/logo.png'
            : settings?.app_logo_white || settings?.app_logo_dark || '/assets/logo.png';

    return (
        <BackgroundWrapper>
            <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 sm:p-6 md:p-10'>
                <div className='pointer-events-auto absolute top-4 right-4 z-50'>
                    <ThemeCustomizer />
                </div>

                <div className='pointer-events-auto relative z-10 w-full max-w-md'>
                    <div className='mb-6 flex flex-col items-center gap-4'>
                        <Link
                            href='/'
                            className='group focus-visible:ring-primary focus-visible:ring-offset-background flex flex-col items-center gap-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                        >
                            <div className='bg-card/80 group-hover:border-primary/40 relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/20 backdrop-blur-md transition-transform duration-300'>
                                <Image
                                    src={logoUrl}
                                    alt={appName}
                                    width={56}
                                    height={56}
                                    className='object-contain p-1.5'
                                    unoptimized
                                    priority
                                />
                            </div>
                            <span className='text-foreground text-xl font-bold tracking-tight'>{appName}</span>
                        </Link>
                    </div>

                    <div className='group motion-content relative'>
                        <div className='bg-card/90 animate-fade-in-up relative rounded-3xl border border-white/15 p-8 backdrop-blur-2xl transition-all duration-300'>
                            <div className='relative z-10'>{children}</div>
                        </div>
                    </div>

                    <PanelBrandingFooter appName={appName} className='mt-8' />
                </div>
            </div>
        </BackgroundWrapper>
    );
}
