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
import { RefreshCw, AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, isEnabled } from '@/lib/utils';
import type { PluginSidebarItem } from '@/types/navigation';
import { usePluginRoutes } from '@/hooks/usePluginRoutes';
import { useServerPermissions } from '@/hooks/useServerPermissions';

interface PluginPageProps {
    context: 'admin' | 'client' | 'server';
    serverUuid?: string;
}

export default function PluginPage({ context, serverUuid }: PluginPageProps) {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const pathname = usePathname();
    const router = useRouter();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const pluginData = usePluginRoutes();

    const { server } = useServerPermissions(serverUuid || '');
    const serverSpellId = server?.spell_id || null;

    const [loading, setLoading] = useState(true);
    const [iframeLoading, setIframeLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [iframeError, setIframeError] = useState<string | null>(null);
    const [iframeSrc, setIframeSrc] = useState<string | null>(null);

    useEffect(() => {
        const processPluginData = () => {
            setLoading(true);
            setError(null);

            if (context === 'server' && serverUuid) {
                document.cookie = `serverUuid=${serverUuid}; path=/; max-age=3600; SameSite=Lax`;
            }

            try {
                if (!pluginData) {
                    return;
                }

                let sidebarSection: Record<string, PluginSidebarItem> = {};

                if (context === 'admin') {
                    sidebarSection = pluginData.admin || {};
                } else if (context === 'server') {
                    sidebarSection = pluginData.server || {};
                } else {
                    sidebarSection = pluginData.client || {};
                }

                let pluginPath = '';
                if (context === 'admin') {
                    pluginPath = pathname.replace('/admin', '');
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
                    if (context === 'server' && serverSpellId !== null && serverSpellId !== undefined) {
                        if (
                            matchingItem.allowedOnlyOnSpells &&
                            Array.isArray(matchingItem.allowedOnlyOnSpells) &&
                            matchingItem.allowedOnlyOnSpells.length > 0
                        ) {
                            if (!matchingItem.allowedOnlyOnSpells.includes(serverSpellId)) {
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

                    setIframeSrc(componentUrl);
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
    }, [pathname, context, serverUuid, t, pluginData, serverSpellId]);

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
        setIframeError(null);
        setIframeLoading(false);
        setTimeout(injectScrollbarStyles, 100);
    };

    const onIframeError = () => {
        setIframeError('Failed to load content');
        setIframeLoading(false);
    };

    const retryLoad = () => {
        setIframeError(null);
        setIframeLoading(true);
        if (iframeRef.current && iframeSrc) {
            iframeRef.current.src = '';
            setTimeout(() => {
                if (iframeRef.current) iframeRef.current.src = iframeSrc;
            }, 100);
        }
    };

    if (loading) {
        return (
            <div className='flex h-[50vh] items-center justify-center'>
                <div className='flex items-center gap-3 text-muted-foreground'>
                    <RefreshCw className='h-6 w-6 animate-spin text-primary' />
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
                <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-8'>
                    <div className='relative mb-8'>
                        <h1 className='text-9xl md:text-[12rem] font-black bg-linear-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent leading-none'>
                            404
                        </h1>
                        <div className='absolute inset-0 flex items-center justify-center'>
                            <div className='text-6xl md:text-7xl opacity-10'>🔍</div>
                        </div>
                    </div>
                    <div className='space-y-4 max-w-md'>
                        <h2 className='text-2xl md:text-3xl font-bold tracking-tight'>{t('errors.404.title')}</h2>
                        <p className='text-muted-foreground'>{t('errors.404.message')}</p>
                        <div className='flex flex-col sm:flex-row gap-3 justify-center pt-4'>
                            <Button onClick={() => router.back()} variant='outline' className='group'>
                                <ArrowLeft className='h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform' />
                                {t('errors.404.go_back')}
                            </Button>
                            <Link href='/dashboard'>
                                <Button className='w-full sm:w-auto group'>
                                    <Home className='h-4 w-4 mr-2' />
                                    {t('errors.404.go_home')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className='flex flex-col items-center justify-center h-[50vh] text-center p-4'>
                <AlertTriangle className='h-12 w-12 text-destructive mb-4' />
                <h3 className='text-xl font-bold mb-2'>{error}</h3>
                <p className='text-muted-foreground mb-4'>
                    {isSpellRestriction ? t('errors.plugin.spell_restriction') : t('errors.plugin.load_failed')}
                </p>
                {isSpellRestriction && serverUuid && (
                    <Button
                        onClick={() => router.push(`/server/${serverUuid}`)}
                        className='px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors'
                    >
                        {t('errors.plugin.return_to_console')}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className='relative w-full h-full overflow-hidden'>
            {isEnabled(settings?.app_developer_mode) && (
                <div className='absolute bottom-6 right-6 z-30'>
                    <button
                        onClick={retryLoad}
                        className='flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:shadow-xl transition-all font-medium text-sm'
                        title={t('errors.plugin.reload_title')}
                    >
                        <RefreshCw className={cn('h-4 w-4', iframeLoading && 'animate-spin')} />
                        <span>{t('errors.plugin.reload')}</span>
                    </button>
                </div>
            )}

            {iframeLoading && (
                <div className='absolute inset-0 flex flex-col items-center justify-center bg-background/20 backdrop-blur-sm z-20'>
                    <div className='relative mb-6'>
                        <div className='animate-spin rounded-full h-16 w-16 border-4 border-muted border-t-primary' />
                        <div className='absolute inset-0 animate-pulse rounded-full h-16 w-16 bg-primary/20' />
                    </div>
                    <p className='text-muted-foreground text-lg font-medium'>{t('errors.plugin.loading_content')}</p>
                </div>
            )}

            {iframeError && (
                <div className='absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-md z-20 p-8 text-center'>
                    <div className='w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6'>
                        <AlertTriangle className='h-10 w-10 text-destructive' />
                    </div>
                    <h3 className='text-xl font-bold mb-3'>{t('errors.plugin.failed_to_load')}</h3>
                    <p className='text-muted-foreground mb-6 max-w-md'>{iframeError}</p>
                    <button
                        onClick={retryLoad}
                        className='px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-medium'
                    >
                        {t('errors.plugin.retry_loading')}
                    </button>
                </div>
            )}

            {iframeSrc && (
                <iframe
                    ref={iframeRef}
                    src={iframeSrc}
                    className={cn(
                        'w-full h-full border-0 transition-all duration-500',
                        iframeLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
                    )}
                    onLoad={onIframeLoad}
                    onError={onIframeError}
                />
            )}
        </div>
    );
}
