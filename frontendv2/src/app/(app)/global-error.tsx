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

import Link from 'next/link';
import { Button } from '@/components/featherui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { backgroundFitToCssSize } from '@/lib/backgroundImageFit';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

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

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const { backgroundType, backgroundImage, backdropBlur, backdropDarken, backgroundImageFit } = useTheme();
    const [version, setVersion] = useState<string>('');
    const staleVersion = isStaleVersionError(error);

    useEffect(() => {
        try {
            const cached = localStorage.getItem('app_settings');
            if (cached) {
                const { data } = JSON.parse(cached);
                if (data?.core?.version) {
                    requestAnimationFrame(() => setVersion(data.core.version));
                }
            }
        } catch {}
    }, []);

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
        <html lang='en' suppressHydrationWarning>
            <body className='bg-background text-foreground'>
                <div className='bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 sm:p-6'>
                    {renderBackground()}
                    {hasOverlay && (
                        <div className='pointer-events-none absolute inset-0 z-[1]' style={overlayStyle} aria-hidden />
                    )}

                    <div className='pointer-events-auto absolute top-4 right-4 z-50'>
                        <ThemeCustomizer />
                    </div>

                    <div className='relative z-10 w-full max-w-md'>
                        <div className='bg-card/90 rounded-3xl border border-white/15 p-8 backdrop-blur-2xl sm:p-10'>
                            <div className='flex flex-col items-center text-center'>
                                <div className='bg-destructive/10 text-destructive border-destructive/20 mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border'>
                                    <AlertTriangle className='h-7 w-7' strokeWidth={1.5} />
                                </div>

                                <p className='text-muted-foreground mb-2 font-mono text-xs tracking-[0.25em] uppercase'>
                                    {staleVersion ? 'Update' : '500'}
                                </p>
                                <h1 className='text-foreground mb-3 text-2xl font-bold tracking-tight sm:text-3xl'>
                                    {staleVersion ? 'New Version Available' : 'Critical Error'}
                                </h1>
                                <p className='text-muted-foreground mb-6 max-w-sm text-sm leading-relaxed'>
                                    {staleVersion
                                        ? 'The app was updated. Please refresh the page to load the latest version.'
                                        : 'A critical error occurred that prevented the application from loading. Please try refreshing the page.'}
                                </p>

                                {!staleVersion && error.digest && (
                                    <p className='text-muted-foreground bg-muted/50 border-border/50 mb-6 rounded-lg border px-3 py-1.5 font-mono text-xs'>
                                        Error ID: {error.digest}
                                    </p>
                                )}

                                <div className='flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center'>
                                    <Button
                                        onClick={staleVersion ? hardRefresh : reset}
                                        variant='outline'
                                        className='group w-full sm:w-auto'
                                    >
                                        <RefreshCw className='mr-2 h-4 w-4 transition-transform duration-500 group-hover:rotate-180' />
                                        {staleVersion ? 'Refresh Page' : 'Try Again'}
                                    </Button>
                                    <Link href='/' className='w-full sm:w-auto'>
                                        <Button className='w-full'>
                                            <Home className='mr-2 h-4 w-4' />
                                            Go Home
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className='text-muted-foreground mt-8 text-center text-xs'>
                            <p className='mb-2 font-medium'>Running on FeatherPanel {version ? `v${version}` : ''}</p>
                            <a
                                href='https://featherpanel.com'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-primary hover:text-primary/80 inline-flex items-center gap-1.5 font-medium underline-offset-4 transition-all duration-200 hover:underline'
                            >
                                MythicalSystems
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
            </body>
        </html>
    );
}
