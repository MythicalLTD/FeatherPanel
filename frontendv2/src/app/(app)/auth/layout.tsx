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
import { useTranslation } from '@/contexts/TranslationContext';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const { theme } = useTheme();
    const { core, settings } = useSettings();
    const { t } = useTranslation();

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
                            className='group flex flex-col items-center gap-3 font-medium transition-all duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl'
                        >
                            <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-card/80 backdrop-blur-md transition-transform duration-300 group-hover:border-primary/40'>
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
                            <span className='text-xl font-bold tracking-tight text-foreground'>{appName}</span>
                        </Link>
                    </div>

                    <div className='relative group motion-content'>
                        <div className='relative rounded-3xl border border-white/15 bg-card/90 backdrop-blur-2xl p-8 transition-all duration-300 animate-fade-in-up'>
                            <div className='relative z-10'>{children}</div>
                        </div>
                    </div>

                    <div className='mt-8 text-center text-xs text-muted-foreground transition-all duration-200'>
                        <p className='mb-2 font-medium'>
                            {t('branding.running_on', { name: appName, version: core?.version || '' }).trim()}
                        </p>
                        <a
                            href='https://featherpanel.com'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center gap-1.5 text-primary transition-all duration-200 hover:text-primary/80 hover:underline underline-offset-4 font-medium'
                        >
                            {t('branding.copyright', { company: 'MythicalSystems' })}
                            <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                                />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </BackgroundWrapper>
    );
}
