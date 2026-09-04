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
import type { ReactNode } from 'react';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import { PanelBrandingFooter } from '@/components/branding/PanelBrandingFooter';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { parseAuthFooterStyle } from '@/lib/authPageConfig';
import { cn } from '@/lib/utils';

/** Kept so older call sites compile. */
export function AuthAsideSlot({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

export default function AuthShell({ children }: { children: ReactNode }) {
    const { theme } = useTheme();
    const { settings } = useSettings();

    const appName = settings?.app_name || 'FeatherPanel';
    const logoUrl =
        theme === 'dark'
            ? settings?.app_logo_dark || settings?.app_logo_white || '/assets/logo.png'
            : settings?.app_logo_white || settings?.app_logo_dark || '/assets/logo.png';

    const showThemeCustomizer = settings?.auth_show_theme_customizer !== 'false';
    const footerStyle = parseAuthFooterStyle(settings?.auth_footer_style);

    return (
        <div className='relative flex min-h-svh w-full flex-col'>
            {/* Theme-aware atmosphere over whatever BackgroundWrapper provides */}
            <div aria-hidden className='pointer-events-none absolute inset-0 overflow-hidden'>
                <div className='from-primary/25 via-background/40 to-primary/10 absolute inset-0 bg-gradient-to-br' />
                <div className='bg-primary/30 absolute top-[-18%] left-[8%] h-[28rem] w-[28rem] rounded-full blur-3xl' />
                <div className='bg-primary/20 absolute right-[-12%] bottom-[-10%] h-[26rem] w-[26rem] rounded-full blur-3xl' />
                <div className='bg-background/50 absolute inset-0 backdrop-blur-[2px]' />
            </div>

            {showThemeCustomizer ? (
                <div className='pointer-events-auto absolute top-3 right-3 z-50 sm:top-4 sm:right-4'>
                    <ThemeCustomizer />
                </div>
            ) : null}

            <main className='relative z-10 flex min-h-svh w-full flex-1 flex-col'>
                <div className='flex flex-1 flex-col px-4 py-5 sm:px-6 sm:py-8 md:py-10'>
                    <div className='mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-[52rem]'>
                        <div className='mb-5 flex shrink-0 justify-center sm:mb-7'>
                            <Link
                                href='/'
                                className='focus-visible:ring-primary focus-visible:ring-offset-background flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                            >
                                <div className='border-border/60 bg-card/90 relative h-8 w-8 overflow-hidden rounded-md border shadow-sm sm:h-9 sm:w-9'>
                                    <Image
                                        src={logoUrl}
                                        alt={appName}
                                        width={36}
                                        height={36}
                                        className='object-contain p-0.5'
                                        unoptimized
                                        priority
                                    />
                                </div>
                                <span className='text-foreground text-[15px] font-semibold tracking-tight drop-shadow-sm sm:text-base'>
                                    {appName}
                                </span>
                            </Link>
                        </div>

                        {/* Mobile: top-align so long forms + keyboard don't trap content in a centered viewport */}
                        <div className='flex flex-1 flex-col justify-start md:justify-center'>
                            <div className='animate-fade-in-up relative w-full'>{children}</div>
                        </div>

                        {footerStyle !== 'hidden' ? (
                            <PanelBrandingFooter
                                appName={appName}
                                className={cn(
                                    'mx-auto mt-6 w-full max-w-md shrink-0 pb-2 text-center sm:mt-8',
                                    footerStyle === 'minimal' && 'opacity-70',
                                )}
                            />
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}
