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
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    const router = useRouter();
    const { backgroundType, backgroundImage } = useTheme();
    const { core } = useSettings();
    const { t } = useTranslation();

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
                    <>
                        <div
                            className='absolute inset-0 bg-cover bg-center bg-no-repeat'
                            style={{ backgroundImage: `url(${backgroundImage})` }}
                        />
                        <div className='absolute inset-0 bg-background/80 backdrop-blur-sm' />
                    </>
                ) : null;
            default:
                return null;
        }
    };

    return (
        <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4'>
            {/* Dynamic background */}
            {renderBackground()}

            {/* Theme customizer */}
            <div className='pointer-events-auto absolute top-4 right-4 z-50'>
                <ThemeCustomizer />
            </div>

            {/* Error content */}
            <div className='relative z-10 w-full max-w-2xl'>
                <div className='relative group'>
                    {/* Glow effect */}
                    <div className='absolute -inset-0.5 bg-linear-to-r from-primary/50 to-primary/30 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000' />

                    <div className='relative rounded-3xl border border-border/50 bg-card/95 backdrop-blur-xl p-8 md:p-12 shadow-2xl shadow-black/20'>
                        <div className='text-center space-y-6'>
                            {/* 404 Number */}
                            <div className='relative'>
                                <h1 className='text-9xl md:text-[12rem] font-black bg-linear-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent leading-none'>
                                    404
                                </h1>
                                <div className='absolute inset-0 flex items-center justify-center'>
                                    <div className='text-6xl md:text-7xl opacity-10'>🔍</div>
                                </div>
                            </div>

                            {/* Message */}
                            <div className='space-y-3'>
                                <h2 className='text-2xl md:text-3xl font-bold tracking-tight'>
                                    {t('errors.404.title')}
                                </h2>
                                <p className='text-muted-foreground max-w-md mx-auto'>{t('errors.404.message')}</p>
                            </div>

                            {/* Actions */}
                            <div className='flex flex-col sm:flex-row gap-3 justify-center pt-4'>
                                <Button onClick={() => router.back()} variant='outline' className='group'>
                                    <ArrowLeft className='h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform' />
                                    {t('errors.404.go_back')}
                                </Button>
                                <Link href='/'>
                                    <Button className='w-full sm:w-auto group'>
                                        <Home className='h-4 w-4 mr-2' />
                                        {t('errors.404.go_home')}
                                    </Button>
                                </Link>
                            </div>

                            {/* Helpful links */}
                            <div className='pt-6 border-t border-border/50'>
                                <p className='text-sm text-muted-foreground mb-3'>{t('errors.404.looking_for')}</p>
                                <div className='flex flex-wrap gap-2 justify-center'>
                                    <Link href='/auth/login'>
                                        <button className='text-sm px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors'>
                                            {t('errors.404.login')}
                                        </button>
                                    </Link>
                                    <Link href='/dashboard'>
                                        <button className='text-sm px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors'>
                                            {t('errors.404.dashboard')}
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className='relative z-10 mt-8 text-center text-xs text-muted-foreground'>
                <p className='mb-2 font-medium'>
                    {t('branding.running_on', { name: 'FeatherPanel', version: core?.version || '' }).trim()}
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
    );
}
