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
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import BackgroundWrapper from '@/components/theme/BackgroundWrapper';
import { PanelBrandingFooter } from '@/components/branding/PanelBrandingFooter';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

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

    return (
        <BackgroundWrapper>
            <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 sm:p-6'>
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
                                {staleVersion ? t('errors.500.stale_version_title') : t('errors.500.title')}
                            </h1>
                            <p className='text-muted-foreground mb-6 max-w-sm text-sm leading-relaxed'>
                                {staleVersion ? t('errors.500.stale_version_message') : t('errors.500.message')}
                            </p>

                            {!staleVersion && error.digest && (
                                <p className='text-muted-foreground bg-muted/50 border-border/50 mb-6 rounded-lg border px-3 py-1.5 font-mono text-xs'>
                                    {t('errors.500.error_id')}: {error.digest}
                                </p>
                            )}

                            <div className='flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center'>
                                <Button
                                    onClick={staleVersion ? hardRefresh : reset}
                                    variant='outline'
                                    className='group w-full sm:w-auto'
                                >
                                    <RefreshCw className='mr-2 h-4 w-4 transition-transform duration-500 group-hover:rotate-180' />
                                    {staleVersion ? t('errors.500.refresh_page') : t('errors.500.try_again')}
                                </Button>
                                <Link href='/' className='w-full sm:w-auto'>
                                    <Button className='w-full'>
                                        <Home className='mr-2 h-4 w-4' />
                                        {t('errors.500.go_home')}
                                    </Button>
                                </Link>
                            </div>

                            {process.env.NODE_ENV === 'development' && (
                                <details className='border-border/40 mt-8 w-full border-t pt-6 text-left'>
                                    <summary className='text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium transition-colors'>
                                        {t('errors.500.details')}
                                    </summary>
                                    <div className='bg-muted/50 border-border/50 mt-4 max-h-48 overflow-auto rounded-xl border p-4 font-mono text-xs'>
                                        <p className='text-destructive mb-2 font-semibold'>{error.name}</p>
                                        <p className='text-muted-foreground whitespace-pre-wrap'>{error.message}</p>
                                        {error.stack && (
                                            <pre className='text-muted-foreground/70 mt-4 text-[11px] leading-relaxed'>
                                                {error.stack}
                                            </pre>
                                        )}
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>

                    <PanelBrandingFooter className='mt-8' />
                </div>
            </div>
        </BackgroundWrapper>
    );
}
