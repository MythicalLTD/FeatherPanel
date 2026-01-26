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

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import { Home, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const { backgroundType, backgroundImage } = useTheme();
    const { core } = useSettings();
    const { t } = useTranslation();

    useEffect(() => {
        console.error(error);
    }, [error]);

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
            {renderBackground()}

            <div className='pointer-events-auto absolute top-4 right-4 z-50'>
                <ThemeCustomizer />
            </div>

            <div className='relative z-10 w-full max-w-2xl'>
                <div className='relative group'>
                    <div className='absolute -inset-0.5 bg-linear-to-r from-destructive/50 to-destructive/30 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000' />

                    <div className='relative rounded-3xl border border-border/50 bg-card/95 backdrop-blur-xl p-8 md:p-12 shadow-2xl shadow-black/20'>
                        <div className='text-center space-y-6'>
                            <div className='relative'>
                                <div className='inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-destructive/10 mb-4'>
                                    <svg
                                        className='h-12 w-12 text-destructive'
                                        fill='none'
                                        viewBox='0 0 24 24'
                                        stroke='currentColor'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                        />
                                    </svg>
                                </div>
                            </div>

                            <div className='space-y-3'>
                                <h2 className='text-2xl md:text-3xl font-bold tracking-tight'>
                                    {t('errors.500.title')}
                                </h2>
                                <p className='text-muted-foreground max-w-md mx-auto'>{t('errors.500.message')}</p>
                                {error.digest && (
                                    <p className='text-xs text-muted-foreground font-mono bg-muted px-3 py-1 rounded-lg inline-block'>
                                        {t('errors.500.error_id')}: {error.digest}
                                    </p>
                                )}
                            </div>

                            <div className='flex flex-col sm:flex-row gap-3 justify-center pt-4'>
                                <Button onClick={reset} variant='outline' className='group'>
                                    <RefreshCw className='h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-500' />
                                    {t('errors.500.try_again')}
                                </Button>
                                <Link href='/'>
                                    <Button className='w-full sm:w-auto group'>
                                        <Home className='h-4 w-4 mr-2' />
                                        {t('errors.500.go_home')}
                                    </Button>
                                </Link>
                            </div>

                            {process.env.NODE_ENV === 'development' && (
                                <details className='pt-6 border-t border-border/50 text-left'>
                                    <summary className='text-sm font-medium cursor-pointer hover:text-primary transition-colors'>
                                        {t('errors.500.details')}
                                    </summary>
                                    <div className='mt-4 p-4 rounded-xl bg-muted text-xs font-mono overflow-auto max-h-60'>
                                        <p className='text-destructive font-semibold mb-2'>{error.name}</p>
                                        <p className='whitespace-pre-wrap'>{error.message}</p>
                                        {error.stack && <pre className='mt-4 text-muted-foreground'>{error.stack}</pre>}
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
