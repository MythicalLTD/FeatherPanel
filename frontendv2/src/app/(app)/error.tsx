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

/** Detect errors caused by stale cached assets after a new deploy (chunk load failures). */
function isStaleVersionError(error: Error): boolean {
    const msg = (error?.message || '').toLowerCase();
    return (
        msg.includes('loading chunk') ||
        msg.includes('chunkloaderror') ||
        msg.includes('failed to fetch dynamically imported module') ||
        msg.includes('importing a module script failed') ||
        msg.includes('loading css chunk') ||
        msg.includes('error loading dynamically imported module') ||
        msg.includes('load failed')
    );
}

/** Force a full reload bypassing cache so user gets the new build. */
function hardRefresh(): void {
    const url = new URL(window.location.href);
    url.searchParams.set('_', String(Date.now()));
    window.location.href = url.toString();
}

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const { backgroundType, backgroundImage, backdropBlur, backdropDarken, backgroundImageFit } = useTheme();
    const { core } = useSettings();
    const { t } = useTranslation();
    const staleVersion = isStaleVersionError(error);

    useEffect(() => {
        console.error(error);
    }, [error]);

    const themeGradient =
        'linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 50%, hsl(var(--primary) / 0.12) 100%)';

    const renderBackground = () => {
        switch (backgroundType) {
            case 'aurora':
            case 'gradient':
                return <div className='pointer-events-none absolute inset-0' style={{ background: themeGradient }} />;
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
        <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4'>
            {renderBackground()}
            {hasOverlay && (
                <div className='pointer-events-none absolute inset-0 z-[1]' style={overlayStyle} aria-hidden />
            )}

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
                                    {staleVersion ? t('errors.500.stale_version_title') : t('errors.500.title')}
                                </h2>
                                <p className='text-muted-foreground max-w-md mx-auto'>
                                    {staleVersion ? t('errors.500.stale_version_message') : t('errors.500.message')}
                                </p>
                                {!staleVersion && error.digest && (
                                    <p className='text-xs text-muted-foreground font-mono bg-muted px-3 py-1 rounded-lg inline-block'>
                                        {t('errors.500.error_id')}: {error.digest}
                                    </p>
                                )}
                            </div>

                            <div className='flex flex-col sm:flex-row gap-3 justify-center pt-4'>
                                <Button
                                    onClick={staleVersion ? hardRefresh : reset}
                                    variant='outline'
                                    className='group'
                                >
                                    <RefreshCw className='h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-500' />
                                    {staleVersion ? t('errors.500.refresh_page') : t('errors.500.try_again')}
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
