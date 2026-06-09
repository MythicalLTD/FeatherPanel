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

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { RefreshCw, AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, isEnabled } from '@/lib/utils';
import type { PluginSidebarItem } from '@/types/navigation';
import { usePluginRoutes } from '@/hooks/usePluginRoutes';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { isCloudflareChallengeDocument, withCacheBuster } from '@/lib/cloudflare-challenge';
import { getPluginIframeThemeOverrideCss } from '@/lib/pluginIframeThemeCss';

interface PluginPageProps {
    context: 'admin' | 'client' | 'server' | 'vds';
    serverUuid?: string;
    vdsId?: string;
}

export default function PluginPage({ context, serverUuid, vdsId }: PluginPageProps) {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { theme } = useTheme();
    const pathname = usePathname();
    const router = useRouter();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const challengeRetryCountRef = useRef(0);
    const challengeRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const iframeReadyRef = useRef(false);

    const pluginData = usePluginRoutes();

    const injectThemeStyles = () => {
        if (!iframeRef.current) return;

        try {
            const iframe = iframeRef.current;
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

            if (!iframeDoc) return;

            // Remove existing theme styles
            const existingStyle = iframeDoc.getElementById('featherpanel-theme-override');
            if (existingStyle) {
                existingStyle.remove();
            }

            // `data-fp-theme` + postMessage / `__theme=` for plugin JS.
            // Light: `html.light` + color-scheme (see getPluginIframeThemeOverrideCss).
            // Dark: `html.dark` so shadcn/Tailwind flip semantic colors (otherwise
            // light-mode --foreground stays dark and you get unreadable text on a
            // transparent body over the panel). Shell transparency is enforced in
            // injected CSS so the panel backdrop still shows through.
            const root = iframeDoc.documentElement;
            root.setAttribute('data-fp-theme', theme);
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
        } catch (err) {
            console.debug('Could not inject theme into iframe (cross-origin limitation):', err);
        }
    };

    // Send theme to iframe via postMessage when it changes and inject styles
    useEffect(() => {
        if (iframeRef.current?.contentWindow && iframeReadyRef.current) {
            iframeRef.current.contentWindow.postMessage({ type: 'featherpanel-theme', theme }, '*');
            injectThemeStyles();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme]);

    // Also listen for plugin ready signal
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'featherpanel-ready') {
                iframeReadyRef.current = true;
                // Send current theme when plugin signals it's ready
                if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({ type: 'featherpanel-theme', theme }, '*');
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [theme]);

    const { server } = useServerPermissions(serverUuid || '');
    const serverSpellId = server?.spell_id || null;

    const [loading, setLoading] = useState(true);
    const [iframeLoading, setIframeLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [iframeError, setIframeError] = useState<string | null>(null);
    const [iframeSrc, setIframeSrc] = useState<string | null>(null);

    const MAX_CHALLENGE_RETRIES = 4;

    useEffect(() => {
        challengeRetryCountRef.current = 0;
        if (challengeRetryTimerRef.current) {
            clearTimeout(challengeRetryTimerRef.current);
            challengeRetryTimerRef.current = null;
        }
    }, [iframeSrc]);

    useEffect(() => {
        return () => {
            if (challengeRetryTimerRef.current) {
                clearTimeout(challengeRetryTimerRef.current);
                challengeRetryTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const processPluginData = () => {
            setLoading(true);
            setError(null);

            if (context === 'server' && serverUuid) {
                document.cookie = `serverUuid=${serverUuid}; path=/; max-age=3600; SameSite=Lax`;
            }
            if (context === 'vds' && vdsId) {
                document.cookie = `vdsId=${vdsId}; path=/; max-age=3600; SameSite=Lax`;
            }

            try {
                if (!pluginData) {
                    return;
                }

                let sidebarSection: Record<string, PluginSidebarItem> = {};

                if (context === 'admin') {
                    sidebarSection = pluginData.admin || {};
                } else if (context === 'vds') {
                    sidebarSection = pluginData.vds || {};
                } else if (context === 'server') {
                    sidebarSection = pluginData.server || {};
                } else {
                    sidebarSection = pluginData.client || {};
                }

                let pluginPath = '';
                if (context === 'admin') {
                    pluginPath = pathname.replace('/admin', '');
                } else if (context === 'vds' && vdsId) {
                    const vdsPrefix = `/vds/${vdsId}`;
                    pluginPath = pathname.replace(vdsPrefix, '');
                } else if (context === 'server' && serverUuid) {
                    const serverPrefix = `/server/${serverUuid}`;
                    pluginPath = pathname.replace(serverPrefix, '');
                } else if (context === 'client') {
                    pluginPath = pathname.replace('/dashboard', '');
                }

                let matchingItem = sidebarSection[pluginPath];
                if (!matchingItem) {
                    for (const [key, value] of Object.entries(sidebarSection)) {
                        if (
                            key === pluginPath ||
                            (value.redirect && (pluginPath === value.redirect || pluginPath.endsWith(value.redirect)))
                        ) {
                            matchingItem = value;
                            break;
                        }
                    }
                }

                if (!matchingItem && (context === 'client' || context === 'admin')) {
                    for (const value of Object.values(sidebarSection)) {
                        if (value.component && pathname.includes(value.plugin)) {
                            matchingItem = value;
                            break;
                        }
                    }
                }

                if (matchingItem && matchingItem.component) {
                    if (context === 'server') {
                        const normalizedSpellId =
                            serverSpellId === null || serverSpellId === undefined ? null : Number(serverSpellId);
                        const allowedSpells = matchingItem.allowedOnlyOnSpells;
                        if (allowedSpells && allowedSpells.length > 0) {
                            const spellAllowed =
                                normalizedSpellId !== null &&
                                Number.isFinite(normalizedSpellId) &&
                                allowedSpells.some((allowedId) => Number(allowedId) === normalizedSpellId);
                            if (!spellAllowed) {
                                setError(t('errors.plugin.spell_restriction'));
                                setLoading(false);
                                return;
                            }
                        }
                    }

                    let componentUrl = `/components/${matchingItem.plugin}/${matchingItem.component}`;

                    if (context === 'server' && serverUuid) {
                        if (componentUrl.includes('serverUuid=notFound')) {
                            componentUrl = componentUrl.replace('serverUuid=notFound', `serverUuid=${serverUuid}`);
                        } else if (!componentUrl.includes('serverUuid=')) {
                            const separator = componentUrl.includes('?') ? '&' : '?';
                            componentUrl += `${separator}serverUuid=${serverUuid}`;
                        }
                    }

                    if (context === 'vds' && vdsId) {
                        if (componentUrl.includes('vdsId=notFound')) {
                            componentUrl = componentUrl.replace('vdsId=notFound', `vdsId=${vdsId}`);
                        } else if (!componentUrl.includes('vdsId=')) {
                            const separator = componentUrl.includes('?') ? '&' : '?';
                            componentUrl += `${separator}vdsId=${vdsId}`;
                        }
                    }

                    // Add theme as URL parameter for immediate access on load
                    const themeSeparator = componentUrl.includes('?') ? '&' : '?';
                    const urlWithTheme = `${componentUrl}${themeSeparator}__theme=${theme}`;
                    setIframeSrc(urlWithTheme);
                } else {
                    setError(t('errors.plugin.not_found'));
                }
            } catch (err) {
                console.error('Error processing plugin data:', err);
                setError(t('errors.plugin.load_failed'));
            } finally {
                setLoading(false);
            }
        };

        processPluginData();
    }, [pathname, context, serverUuid, vdsId, t, pluginData, serverSpellId, theme]);

    const injectScrollbarStyles = () => {
        if (!iframeRef.current) return;

        try {
            const iframe = iframeRef.current;
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

            if (!iframeDoc) return;
            if (iframeDoc.getElementById('featherpanel-custom-scrollbar')) return;

            const style = iframeDoc.createElement('style');
            style.id = 'featherpanel-custom-scrollbar';
            style.textContent = `
                * {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
                }
                *::-webkit-scrollbar { width: 10px; height: 10px; }
                *::-webkit-scrollbar-track { background: transparent; border-radius: 10px; }
                *::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.5);
                    border-radius: 10px;
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }
                @media (prefers-color-scheme: dark) {
                    * { scrollbar-color: rgba(100, 116, 139, 0.5) transparent; }
                    *::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.5); }
                }
            `;
            if (iframeDoc.head) {
                iframeDoc.head.appendChild(style);
            }
        } catch (err) {
            console.debug('Could not inject styles into iframe (cross-origin limitation):', err);
        }
    };

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
                // Ignore cross-origin access errors and treat as normal content.
            }
        }

        challengeRetryCountRef.current = 0;
        setIframeError(null);
        setIframeLoading(false);
        iframeReadyRef.current = true;

        // Send current theme to iframe on load
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ type: 'featherpanel-theme', theme }, '*');
        }

        // Inject theme styles directly
        setTimeout(() => {
            injectScrollbarStyles();
            injectThemeStyles();
        }, 100);
    };

    const onIframeError = () => {
        setIframeError('Failed to load content');
        setIframeLoading(false);
    };

    const retryLoad = () => {
        challengeRetryCountRef.current = 0;
        setIframeError(null);
        setIframeLoading(true);
        if (iframeRef.current && iframeSrc) {
            iframeRef.current.src = '';
            setTimeout(() => {
                if (iframeRef.current) iframeRef.current.src = withCacheBuster(iframeSrc);
            }, 100);
        }
    };

    if (loading) {
        return (
            <div className='flex h-[50vh] items-center justify-center'>
                <div className='text-muted-foreground flex items-center gap-3'>
                    <RefreshCw className='text-primary h-6 w-6 animate-spin' />
                    <span>{t('common.loading')}...</span>
                </div>
            </div>
        );
    }

    if (error) {
        const isSpellRestriction =
            error.includes('not available for this server type') || error === t('errors.plugin.spell_restriction');
        const isPluginNotFound = error === t('errors.plugin.not_found') || error === 'Plugin page not found';

        if (isPluginNotFound) {
            return (
                <div className='flex min-h-[60vh] flex-col items-center justify-center p-8 text-center'>
                    <div className='relative mb-8'>
                        <h1 className='from-primary via-primary/80 to-primary/60 bg-linear-to-br bg-clip-text text-9xl leading-none font-black text-transparent md:text-[12rem]'>
                            404
                        </h1>
                        <div className='absolute inset-0 flex items-center justify-center'>
                            <div className='text-6xl opacity-10 md:text-7xl'>🔍</div>
                        </div>
                    </div>
                    <div className='max-w-md space-y-4'>
                        <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>{t('errors.404.title')}</h2>
                        <p className='text-muted-foreground'>{t('errors.404.message')}</p>
                        <div className='flex flex-col justify-center gap-3 pt-4 sm:flex-row'>
                            <Button onClick={() => router.back()} variant='outline' className='group'>
                                <ArrowLeft className='mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1' />
                                {t('errors.404.go_back')}
                            </Button>
                            <Link href='/dashboard'>
                                <Button className='group w-full sm:w-auto'>
                                    <Home className='mr-2 h-4 w-4' />
                                    {t('errors.404.go_home')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className='flex h-[50vh] flex-col items-center justify-center p-4 text-center'>
                <AlertTriangle className='text-destructive mb-4 h-12 w-12' />
                <h3 className='mb-2 text-xl font-bold'>{error}</h3>
                <p className='text-muted-foreground mb-4'>
                    {isSpellRestriction ? t('errors.plugin.spell_restriction') : t('errors.plugin.load_failed')}
                </p>
                {isSpellRestriction && serverUuid && (
                    <Button
                        onClick={() => router.push(`/server/${serverUuid}`)}
                        className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 transition-colors'
                    >
                        {t('errors.plugin.return_to_console')}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className='relative h-full w-full overflow-hidden'>
            {isEnabled(settings?.app_developer_mode) && (
                <div className='absolute right-6 bottom-6 z-30'>
                    <button
                        onClick={retryLoad}
                        className='bg-primary text-primary-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all hover:shadow-xl'
                        title={t('errors.plugin.reload_title')}
                    >
                        <RefreshCw className={cn('h-4 w-4', iframeLoading && 'animate-spin')} />
                        <span>{t('errors.plugin.reload')}</span>
                    </button>
                </div>
            )}

            {iframeLoading && (
                <div className='bg-background/20 absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm'>
                    <div className='relative mb-6'>
                        <div className='border-muted border-t-primary h-16 w-16 animate-spin rounded-full border-4' />
                        <div className='bg-primary/20 absolute inset-0 h-16 w-16 animate-pulse rounded-full' />
                    </div>
                    <p className='text-muted-foreground text-lg font-medium'>{t('errors.plugin.loading_content')}</p>
                </div>
            )}

            {iframeError && (
                <div className='bg-background/50 absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md'>
                    <div className='bg-destructive/10 mb-6 flex h-20 w-20 items-center justify-center rounded-full'>
                        <AlertTriangle className='text-destructive h-10 w-10' />
                    </div>
                    <h3 className='mb-3 text-xl font-bold'>{t('errors.plugin.failed_to_load')}</h3>
                    <p className='text-muted-foreground mb-6 max-w-md'>{iframeError}</p>
                    <button
                        onClick={retryLoad}
                        className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 py-3 font-medium transition-all'
                    >
                        {t('errors.plugin.retry_loading')}
                    </button>
                </div>
            )}

            {iframeSrc && (
                <iframe
                    key={`${iframeSrc}-${theme}`}
                    ref={iframeRef}
                    src={iframeSrc}
                    className={cn(
                        'h-full w-full border-0 transition-all duration-500',
                        iframeLoading ? 'scale-95 opacity-0' : 'scale-100 opacity-100',
                    )}
                    style={{ background: 'transparent' }}
                    onLoad={onIframeLoad}
                    onError={onIframeError}
                    {...{ allowtransparency: 'true' }}
                />
            )}
        </div>
    );
}
