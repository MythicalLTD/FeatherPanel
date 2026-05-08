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

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, Trash2, AlertTriangle, LayoutDashboard, Eye, EyeOff } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import axios from 'axios';

import { WelcomeWidget } from '@/components/admin/WelcomeWidget';
import { QuickStatsWidget } from '@/components/admin/QuickStatsWidget';
import { CronStatusWidget } from '@/components/admin/CronStatusWidget';
import { SystemHealthWidget } from '@/components/admin/SystemHealthWidget';
import { VersionInfoWidget } from '@/components/admin/VersionInfoWidget';
import { QuickLinksWidget } from '@/components/admin/QuickLinksWidget';
import { EulaWidget } from '@/components/admin/EulaWidget';
import { PageHeader } from '@/components/featherui/PageHeader';

export default function AdminDashboardPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { data, loading, refresh } = useAdminDashboard();
    const { settings } = useSettings();

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-home');

    const [showAppUrlWarning, setShowAppUrlWarning] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [isCustomizing, setIsCustomizing] = useState(false);

    const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);

    useEffect(() => {
        fetchWidgets();

        const stored = localStorage.getItem('admin-hidden-widgets');
        if (stored) {
            try {
                setHiddenWidgets(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse hidden widgets', e);
            }
        }
    }, [fetchWidgets]);

    useEffect(() => {
        const defaultUrl = 'https://featherpanel.mythical.systems';
        const isDefault = settings?.app_url === defaultUrl;
        const isDismissed = localStorage.getItem('app-url-warning-dismissed');

        if (isDefault && !isDismissed) {
            const timer = setTimeout(() => setShowAppUrlWarning(true), 100);
            return () => clearTimeout(timer);
        }
    }, [settings?.app_url]);

    const clearCache = async () => {
        if (isClearingCache) return;

        setIsClearingCache(true);
        const toastId = toast.loading(t('admin.dashboard.clearing_cache'));

        try {
            const response = await axios.post('/api/admin/dashboard/cache/clear');
            if (response.data.success) {
                toast.success(t('admin.dashboard.cache_cleared'), {
                    id: toastId,
                });
                refresh();
            } else {
                toast.error(t('admin.dashboard.cache_failed'), {
                    description: response.data.message,
                    id: toastId,
                });
            }
        } catch (err: unknown) {
            let message = t('admin.dashboard.cache_failed');
            if (axios.isAxiosError(err)) {
                message = err.response?.data?.message || err.message;
            }
            toast.error(message, {
                id: toastId,
            });
        } finally {
            setIsClearingCache(false);
        }
    };

    const dismissWarning = () => {
        localStorage.setItem('app-url-warning-dismissed', 'true');
        setShowAppUrlWarning(false);
    };

    const toggleWidgetVisibility = (widgetId: string) => {
        const newHidden = hiddenWidgets.includes(widgetId)
            ? hiddenWidgets.filter((id: string) => id !== widgetId)
            : [...hiddenWidgets, widgetId];

        setHiddenWidgets(newHidden);
        localStorage.setItem('admin-hidden-widgets', JSON.stringify(newHidden));
    };

    const isVisible = (widgetId: string) => !hiddenWidgets.includes(widgetId) || isCustomizing;

    return (
        <div className='space-y-6 md:space-y-8'>
            <WidgetRenderer widgets={getWidgets('admin-home', 'top-of-page')} />

            <PageHeader
                title={t('admin.dashboard.title')}
                description={t('admin.dashboard.subtitle')}
                icon={LayoutDashboard}
                actions={
                    <div className='flex flex-wrap items-center gap-2 md:gap-3'>
                        <button
                            onClick={() => setIsCustomizing(!isCustomizing)}
                            className={cn(
                                'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all hover:scale-105 active:scale-95 md:rounded-2xl md:px-5 md:py-3',
                                isCustomizing
                                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-500'
                                    : 'bg-secondary/50 hover:bg-secondary border-border/50',
                            )}
                        >
                            <Settings className={cn('h-4 w-4', isCustomizing && 'animate-spin-slow')} />
                            <span className='hidden sm:inline'>
                                {isCustomizing ? t('admin.dashboard.stop_customizing') : t('admin.dashboard.customize')}
                            </span>
                            <span className='sm:hidden'>
                                {isCustomizing ? t('admin.dashboard.stop') : t('admin.dashboard.customize')}
                            </span>
                        </button>
                        <button
                            onClick={clearCache}
                            disabled={isClearingCache}
                            className='bg-secondary hover:bg-secondary/80 border-border/50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 md:rounded-2xl md:px-6 md:py-3'
                        >
                            <Trash2 className={cn('h-4 w-4', isClearingCache && 'animate-pulse')} />
                            <span className='hidden sm:inline'>{t('admin.dashboard.clear_cache')}</span>
                            <span className='sm:hidden'>{t('admin.dashboard.clear')}</span>
                        </button>
                        <Link
                            href='/admin/settings'
                            className='bg-primary text-primary-foreground flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all hover:scale-105 active:scale-95 md:rounded-2xl md:px-6 md:py-3'
                        >
                            <Settings className='h-4 w-4' />
                            <span className='hidden sm:inline'>{t('admin.dashboard.global_settings')}</span>
                            <span className='sm:hidden'>{t('admin.dashboard.settings')}</span>
                        </Link>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-home', 'after-header')} />

            {showAppUrlWarning && (
                <div className='animate-in slide-in-from-top-4 group relative overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/10 p-4 backdrop-blur-3xl duration-500 md:rounded-[2.5rem] md:p-6'>
                    <div className='absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full bg-red-500/10 blur-3xl transition-all duration-700 group-hover:bg-red-500/20' />

                    <div className='relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center md:gap-6'>
                        <div className='flex min-w-0 flex-1 items-start gap-3 md:gap-4'>
                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/20 text-red-500 md:h-12 md:w-12 md:rounded-2xl'>
                                <AlertTriangle className='h-5 w-5 md:h-6 md:w-6' />
                            </div>
                            <div className='min-w-0 flex-1 space-y-1'>
                                <h3 className='text-lg font-black tracking-tight text-red-500 uppercase md:text-xl'>
                                    {t('admin.dashboard.app_url_warning.title')}
                                </h3>
                                <p className='text-xs leading-relaxed font-bold text-red-500/70 md:text-sm'>
                                    {t('admin.dashboard.app_url_warning.message')}
                                </p>
                            </div>
                        </div>
                        <div className='flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center'>
                            <button
                                onClick={dismissWarning}
                                className='rounded-xl border border-red-500/20 px-4 py-2 text-[10px] font-black tracking-widest whitespace-nowrap text-red-500 uppercase transition-all hover:bg-red-500/10 md:px-5 md:py-2.5'
                            >
                                {t('admin.dashboard.app_url_warning.remind_me')}
                            </button>
                            <button
                                onClick={() => router.push('/admin/settings')}
                                className='rounded-xl bg-red-500 px-4 py-2 text-[10px] font-black tracking-widest whitespace-nowrap text-white uppercase transition-all hover:scale-105 md:px-5 md:py-2.5'
                            >
                                {t('admin.dashboard.app_url_warning.update_settings')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={cn('transition-all duration-500', !isVisible('welcome') && 'hidden')}>
                <div className='relative'>
                    {isCustomizing && (
                        <button
                            onClick={() => toggleWidgetVisibility('welcome')}
                            className='bg-background border-border text-muted-foreground absolute -top-3 -right-3 z-20 rounded-full border p-2 transition-transform hover:scale-105'
                        >
                            {hiddenWidgets.includes('welcome') ? (
                                <Eye className='h-4 w-4' />
                            ) : (
                                <EyeOff className='h-4 w-4' />
                            )}
                        </button>
                    )}
                    <div className={cn(hiddenWidgets.includes('welcome') && 'opacity-30 grayscale')}>
                        <WelcomeWidget version={data?.version?.current?.version} />
                    </div>
                </div>
            </div>

            <div className={cn('transition-all duration-500', !isVisible('stats') && 'hidden')}>
                <div className='relative'>
                    {isCustomizing && (
                        <button
                            onClick={() => toggleWidgetVisibility('stats')}
                            className='bg-background border-border text-muted-foreground absolute -top-3 -right-3 z-20 rounded-full border p-2 transition-transform hover:scale-105'
                        >
                            {hiddenWidgets.includes('stats') ? (
                                <Eye className='h-4 w-4' />
                            ) : (
                                <EyeOff className='h-4 w-4' />
                            )}
                        </button>
                    )}
                    <div className={cn(hiddenWidgets.includes('stats') && 'opacity-30 grayscale')}>
                        <QuickStatsWidget stats={data?.count} loading={loading} />
                    </div>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-home', 'before-widgets-grid')} />

            <div className='grid grid-cols-1 items-start gap-6 md:gap-8 lg:grid-cols-2'>
                <div className='space-y-6 md:space-y-8'>
                    <div className={cn('transition-all duration-500', !isVisible('health') && 'hidden')}>
                        <div className='relative'>
                            {isCustomizing && (
                                <button
                                    onClick={() => toggleWidgetVisibility('health')}
                                    className='bg-background border-border text-muted-foreground absolute -top-3 -right-3 z-20 rounded-full border p-2 transition-transform hover:scale-105'
                                >
                                    {hiddenWidgets.includes('health') ? (
                                        <Eye className='h-4 w-4' />
                                    ) : (
                                        <EyeOff className='h-4 w-4' />
                                    )}
                                </button>
                            )}
                            <div className={cn(hiddenWidgets.includes('health') && 'opacity-30 grayscale')}>
                                <SystemHealthWidget />
                            </div>
                        </div>
                    </div>

                    <div className={cn('transition-all duration-500', !isVisible('cron') && 'hidden')}>
                        <div className='relative'>
                            {isCustomizing && (
                                <button
                                    onClick={() => toggleWidgetVisibility('cron')}
                                    className='bg-background border-border text-muted-foreground absolute -top-3 -right-3 z-20 rounded-full border p-2 transition-transform hover:scale-105'
                                >
                                    {hiddenWidgets.includes('cron') ? (
                                        <Eye className='h-4 w-4' />
                                    ) : (
                                        <EyeOff className='h-4 w-4' />
                                    )}
                                </button>
                            )}
                            <div className={cn(hiddenWidgets.includes('cron') && 'opacity-30 grayscale')}>
                                <CronStatusWidget tasks={data?.cron?.recent} loading={loading} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className='space-y-6 md:space-y-8'>
                    <div className={cn('transition-all duration-500', !isVisible('version') && 'hidden')}>
                        <div className='relative'>
                            {isCustomizing && (
                                <button
                                    onClick={() => toggleWidgetVisibility('version')}
                                    className='bg-background border-border text-muted-foreground absolute -top-3 -right-3 z-20 rounded-full border p-2 transition-transform hover:scale-105'
                                >
                                    {hiddenWidgets.includes('version') ? (
                                        <Eye className='h-4 w-4' />
                                    ) : (
                                        <EyeOff className='h-4 w-4' />
                                    )}
                                </button>
                            )}
                            <div className={cn(hiddenWidgets.includes('version') && 'opacity-30 grayscale')}>
                                <VersionInfoWidget version={data?.version} />
                            </div>
                        </div>
                    </div>

                    <div className={cn('transition-all duration-500', !isVisible('links') && 'hidden')}>
                        <div className='relative'>
                            {isCustomizing && (
                                <button
                                    onClick={() => toggleWidgetVisibility('links')}
                                    className='bg-background border-border text-muted-foreground absolute -top-3 -right-3 z-20 rounded-full border p-2 transition-transform hover:scale-105'
                                >
                                    {hiddenWidgets.includes('links') ? (
                                        <Eye className='h-4 w-4' />
                                    ) : (
                                        <EyeOff className='h-4 w-4' />
                                    )}
                                </button>
                            )}
                            <div className={cn(hiddenWidgets.includes('links') && 'opacity-30 grayscale')}>
                                <QuickLinksWidget onClearCache={clearCache} isClearingCache={isClearingCache} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-home', 'after-widgets-grid')} />

            <div className={cn('transition-all duration-500', !isVisible('eula') && 'hidden')}>
                <div className='relative'>
                    {isCustomizing && (
                        <button
                            onClick={() => toggleWidgetVisibility('eula')}
                            className='bg-background border-border text-muted-foreground absolute -top-3 -right-3 z-20 rounded-full border p-2 transition-transform hover:scale-105'
                        >
                            {hiddenWidgets.includes('eula') ? (
                                <Eye className='h-4 w-4' />
                            ) : (
                                <EyeOff className='h-4 w-4' />
                            )}
                        </button>
                    )}
                    <div className={cn(hiddenWidgets.includes('eula') && 'opacity-30 grayscale')}>
                        <EulaWidget />
                    </div>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-home', 'bottom-of-page')} />
        </div>
    );
}
