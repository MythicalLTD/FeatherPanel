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
import { backgroundFitToCssSize } from '@/lib/backgroundImageFit';
import { useTranslation } from '@/contexts/TranslationContext';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import { PanelBrandingFooter } from '@/components/branding/PanelBrandingFooter';
import { Home, RefreshCw } from 'lucide-react';

/** Detect errors caused by stale cached assets after a new deploy (chunk load failures). */
function isStaleVersionError(error: Error): boolean {
    const msg = (error?.message || '').toLowerCase();
    const name = (error?.name || '').toLowerCase();
    return (
        name.includes('chunkloaderror') ||
        msg.includes('loading chunk') ||
        msg.includes('chunkloaderror') ||
        msg.includes('failed to fetch dynamically imported module') ||
        msg.includes('importing a module script failed') ||
        msg.includes('loading css chunk') ||
        msg.includes('error loading dynamically imported module') ||
        msg.includes('load failed') ||
        msg.includes('networkerror when attempting to fetch resource') ||
        msg.includes('failed to load resource') ||
        msg.includes('unable to preload css') ||
        msg.includes('error: loading chunk') ||
        msg.includes('dynamically imported module')
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
    const { t } = useTranslation();
    const staleVersion = isStaleVersionError(error);

    useEffect(() => {
        console.error(error);
        if (staleVersion) {
            const alreadyRefreshed = sessionStorage.getItem('stale-refresh-attempted');
            if (!alreadyRefreshed) {
                sessionStorage.setItem('stale-refresh-attempted', '1');
                hardRefresh();
            }
        }
    }, [error, staleVersion]);

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
                            backgroundSize: backgroundFitToCssSize(backgroundImageFit),
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
        <div className='bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4'>
            {renderBackground()}
            {hasOverlay && (
                <div className='pointer-events-none absolute inset-0 z-1' style={overlayStyle} aria-hidden />
            )}

            <div className='pointer-events-auto absolute top-4 right-4 z-50'>
                <ThemeCustomizer />
            </div>

            <div className='relative z-10 w-full max-w-2xl'>
                <div className='group relative'>
                    <div className='from-destructive/50 to-destructive/30 absolute -inset-0.5 rounded-3xl bg-linear-to-r opacity-20 blur transition duration-1000 group-hover:opacity-30' />

                    <div className='border-border/50 bg-card/95 relative rounded-3xl border p-8 backdrop-blur-xl md:p-12'>
                        <div className='space-y-6 text-center'>
                            <div className='relative'>
                                <div className='bg-destructive/10 mb-4 inline-flex h-24 w-24 items-center justify-center rounded-3xl'>
                                    <svg
                                        className='text-destructive h-12 w-12'
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
                                <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
                                    {staleVersion ? t('errors.500.stale_version_title') : t('errors.500.title')}
                                </h2>
                                <p className='text-muted-foreground mx-auto max-w-md'>
                                    {staleVersion ? t('errors.500.stale_version_message') : t('errors.500.message')}
                                </p>
                                {!staleVersion && error.digest && (
                                    <p className='text-muted-foreground bg-muted inline-block rounded-lg px-3 py-1 font-mono text-xs'>
                                        {t('errors.500.error_id')}: {error.digest}
                                    </p>
                                )}
                            </div>

                            <div className='flex flex-col justify-center gap-3 pt-4 sm:flex-row'>
                                <Button
                                    onClick={staleVersion ? hardRefresh : reset}
                                    variant='outline'
                                    className='group'
                                >
                                    <RefreshCw className='mr-2 h-4 w-4 transition-transform duration-500 group-hover:rotate-180' />
                                    {staleVersion ? t('errors.500.refresh_page') : t('errors.500.try_again')}
                                </Button>
                                <Link href='/'>
                                    <Button className='group w-full sm:w-auto'>
                                        <Home className='mr-2 h-4 w-4' />
                                        {t('errors.500.go_home')}
                                    </Button>
                                </Link>
                            </div>

                            {process.env.NODE_ENV === 'development' && (
                                <details className='border-border/50 border-t pt-6 text-left'>
                                    <summary className='hover:text-primary cursor-pointer text-sm font-medium transition-colors'>
                                        {t('errors.500.details')}
                                    </summary>
                                    <div className='bg-muted mt-4 max-h-60 overflow-auto rounded-xl p-4 font-mono text-xs'>
                                        <p className='text-destructive mb-2 font-semibold'>{error.name}</p>
                                        <p className='whitespace-pre-wrap'>{error.message}</p>
                                        {error.stack && <pre className='text-muted-foreground mt-4'>{error.stack}</pre>}
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <PanelBrandingFooter className='relative z-10 mt-8' />
        </div>
    );
}
