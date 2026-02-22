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
import AuthBackground from '@/components/auth/AuthBackground';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const { backgroundType, backgroundImage, backdropBlur, backdropDarken, backgroundImageFit, theme } = useTheme();
    const { core, settings } = useSettings();
    const { t } = useTranslation();

    const appName = settings?.app_name || 'FeatherPanel';
    const logoUrl =
        theme === 'dark'
            ? settings?.app_logo_dark || settings?.app_logo_white || '/assets/logo.png'
            : settings?.app_logo_white || settings?.app_logo_dark || '/assets/logo.png';

    const renderBackground = () => {
        const gradientMap: Record<string, string> = {
            'purple-dream':
                'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 50%, rgba(147, 51, 234, 0.1) 100%)',
            'ocean-breeze':
                'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(6, 182, 212, 0.1) 100%)',
            'sunset-glow':
                'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(239, 68, 68, 0.05) 50%, rgba(251, 146, 60, 0.1) 100%)',
            'forest-mist':
                'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(34, 197, 94, 0.1) 100%)',
            'rose-garden':
                'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 50%, rgba(236, 72, 153, 0.1) 100%)',
            'golden-hour':
                'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 50%, rgba(251, 191, 36, 0.1) 100%)',
        };

        switch (backgroundType) {
            case 'gradient':
                const gradient = gradientMap[backgroundImage] || gradientMap['purple-dream'];
                return <div className='pointer-events-none absolute inset-0' style={{ background: gradient }} />;
            case 'solid':
                if (backgroundImage && backgroundImage.startsWith('#')) {
                    return (
                        <div
                            className='pointer-events-none absolute inset-0'
                            style={{ backgroundColor: backgroundImage }}
                        />
                    );
                }
                return null;
            case 'pattern':
                return (
                    <div
                        className='pointer-events-none absolute inset-0 opacity-[0.03]'
                        style={{
                            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
                            backgroundSize: '24px 24px',
                        }}
                    />
                );
            case 'image':
                return backgroundImage ? (
                    <div
                        className='absolute inset-0 bg-center bg-no-repeat'
                        style={{
                            backgroundImage: `url(${backgroundImage})`,
                            backgroundSize: backgroundImageFit,
                        }}
                    />
                ) : null;
            default:
                return null;
        }
    };

    const hasOverlay = backdropBlur > 0 || backdropDarken > 0;
    const overlayStyle: React.CSSProperties = {
        backdropFilter: backdropBlur > 0 ? `blur(${backdropBlur}px)` : undefined,
        WebkitBackdropFilter: backdropBlur > 0 ? `blur(${backdropBlur}px)` : undefined,
        backgroundColor: backdropDarken > 0 ? `rgba(0,0,0,${backdropDarken / 100})` : undefined,
    };

    return (
        <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6 md:p-10'>
            <AuthBackground />
            {renderBackground()}
            {hasOverlay && (
                <div className='pointer-events-none absolute inset-0 z-[1]' style={overlayStyle} aria-hidden />
            )}

            <div className='pointer-events-auto absolute top-4 right-4 z-50'>
                <ThemeCustomizer />
            </div>

            <div className='pointer-events-auto relative z-10 w-full max-w-md'>
                <div className='mb-6 flex flex-col items-center gap-4'>
                    <Link
                        href='/'
                        className='group flex flex-col items-center gap-3 font-medium transition-all duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl'
                    >
                        <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border/50 bg-card/80 shadow-lg transition-transform duration-300 group-hover:shadow-xl'>
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
                    <div className='absolute -inset-0.5 bg-linear-to-r from-primary/50 to-primary/30 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000' />

                    <div className='relative rounded-3xl border border-border/50 bg-card/95 backdrop-blur-xl p-8 shadow-2xl shadow-black/20 transition-all duration-300 animate-fade-in-up'>
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
    );
}
