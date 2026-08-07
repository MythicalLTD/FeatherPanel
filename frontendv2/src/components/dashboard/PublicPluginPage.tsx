/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPluginIframeThemeOverrideCss } from '@/lib/pluginIframeThemeCss';
import { isCloudflareChallengeDocument, withCacheBuster } from '@/lib/cloudflare-challenge';
import type { PluginPublicPage } from '@/types/plugin-public-pages';

interface PublicPluginPageProps {
    page: PluginPublicPage;
}

function buildIframeSrc(page: PluginPublicPage, theme: string): string {
    const componentPath = page.component.replace(/^\/+/, '');
    const url = new URL(`/components/${page.plugin}/${componentPath}`, window.location.origin);

    Object.entries(page.query || {}).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    url.searchParams.set('__theme', theme);

    return `${url.pathname}${url.search}`;
}

export default function PublicPluginPage({ page }: PublicPluginPageProps) {
    const { theme } = useTheme();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const challengeRetryCountRef = useRef(0);
    const challengeRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [iframeSrc, setIframeSrc] = useState<string | null>(null);
    const [iframeLoading, setIframeLoading] = useState(true);
    const [iframeError, setIframeError] = useState<string | null>(null);

    const MAX_CHALLENGE_RETRIES = 4;

    useEffect(() => {
        setIframeSrc(withCacheBuster(buildIframeSrc(page, theme)));
        setIframeLoading(true);
        setIframeError(null);
        challengeRetryCountRef.current = 0;
    }, [page, theme]);

    useEffect(() => {
        return () => {
            if (challengeRetryTimerRef.current) {
                clearTimeout(challengeRetryTimerRef.current);
            }
        };
    }, []);

    const injectThemeStyles = () => {
        if (!iframeRef.current) return;

        try {
            const iframe = iframeRef.current;
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) return;

            const existingStyle = iframeDoc.getElementById('featherpanel-theme-override');
            if (existingStyle) {
                existingStyle.remove();
            }

            const root = iframeDoc.documentElement;
            root.setAttribute('data-fp-theme', theme);
            root.style.colorScheme = theme;
            if (theme === 'light') {
                root.classList.add('light');
                root.classList.remove('dark');
            } else {
                root.classList.add('dark');
                root.classList.remove('light');
            }

            const style = iframeDoc.createElement('style');
            style.id = 'featherpanel-theme-override';
            style.textContent = getPluginIframeThemeOverrideCss(theme);
            if (iframeDoc.head) {
                iframeDoc.head.appendChild(style);
            }
        } catch {
            // Cross-origin / sandbox limitations theme URL param still applies.
        }
    };

    useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ type: 'featherpanel-theme', theme }, '*');
            injectThemeStyles();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme]);

    const onIframeLoad = () => {
        if (iframeRef.current) {
            try {
                const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
                if (isCloudflareChallengeDocument(iframeDoc)) {
                    if (challengeRetryCountRef.current < MAX_CHALLENGE_RETRIES) {
                        challengeRetryCountRef.current += 1;
                        setIframeLoading(true);
                        const retryDelayMs = 800 * challengeRetryCountRef.current;
                        const retryTarget = iframeRef.current.src || iframeSrc || '';
                        challengeRetryTimerRef.current = setTimeout(() => {
                            if (iframeRef.current && retryTarget) {
                                iframeRef.current.src = withCacheBuster(retryTarget);
                            }
                        }, retryDelayMs);
                        return;
                    }

                    setIframeError('Cloudflare verification is still in progress. Please wait a moment and try again.');
                    setIframeLoading(false);
                    return;
                }
            } catch {
                // Ignore cross-origin access errors.
            }
        }

        challengeRetryCountRef.current = 0;
        setIframeError(null);
        setIframeLoading(false);
        iframeRef.current?.contentWindow?.postMessage({ type: 'featherpanel-theme', theme }, '*');
        setTimeout(() => injectThemeStyles(), 100);
    };

    const retryLoad = () => {
        challengeRetryCountRef.current = 0;
        setIframeError(null);
        setIframeLoading(true);
        if (iframeRef.current && iframeSrc) {
            iframeRef.current.src = '';
            setTimeout(() => {
                if (iframeRef.current) {
                    iframeRef.current.src = withCacheBuster(iframeSrc);
                }
            }, 100);
        }
    };

    if (iframeError) {
        return (
            <div className='flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center'>
                <AlertTriangle className='h-10 w-10 text-amber-500' />
                <p className='text-muted-foreground text-sm'>{iframeError}</p>
                <Button type='button' variant='outline' onClick={retryLoad}>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className='relative h-full min-h-0 w-full overflow-hidden'>
            {iframeLoading && (
                <div className='bg-background/60 absolute inset-0 z-10 flex items-center justify-center'>
                    <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
                </div>
            )}
            {iframeSrc && (
                <iframe
                    ref={iframeRef}
                    src={iframeSrc}
                    title={page.name}
                    className='h-full min-h-0 w-full border-0'
                    style={{ background: 'transparent', colorScheme: theme }}
                    onLoad={onIframeLoad}
                />
            )}
        </div>
    );
}
