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

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, Trash2, AlertTriangle, LayoutDashboard, Download } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import axios from 'axios';

import { WelcomeWidget, type WelcomeChip } from '@/components/admin/WelcomeWidget';
import { QuickStatsWidget } from '@/components/admin/QuickStatsWidget';
import { CronStatusWidget } from '@/components/admin/CronStatusWidget';
import { SystemHealthWidget } from '@/components/admin/SystemHealthWidget';
import { VersionInfoWidget } from '@/components/admin/VersionInfoWidget';
import { QuickLinksWidget } from '@/components/admin/QuickLinksWidget';
import { RecentActivityWidget } from '@/components/admin/RecentActivityWidget';
import { AttentionWidget } from '@/components/admin/AttentionWidget';
import { NodesOverviewWidget } from '@/components/admin/NodesOverviewWidget';
import { RecentServersWidget } from '@/components/admin/RecentServersWidget';
import { SupportTicketsWidget } from '@/components/admin/SupportTicketsWidget';
import { CloudHubWidget } from '@/components/admin/CloudHubWidget';
import { AdminWidgetFrame } from '@/components/admin/AdminWidgetFrame';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';

export default function AdminDashboardPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { data, loading, refresh } = useAdminDashboard();
    const {
        stats: healthStats,
        nodes: healthNodes,
        selftest: healthSelftest,
        latency: healthLatency,
        systemsOk,
        loading: healthLoading,
    } = useSystemHealth();
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
                toast.success(t('admin.dashboard.cache_cleared'), { id: toastId });
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
            toast.error(message, { id: toastId });
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

    const updateAvailable = Boolean(data?.version?.update_available);
    const latestVersion = data?.version?.latest?.version;

    const welcomeChips = useMemo(() => {
        const chips: WelcomeChip[] = [];

        if (!healthLoading && healthStats) {
            chips.push({
                id: 'nodes',
                label: t('admin.welcome.chip_nodes', {
                    healthy: String(healthStats.healthy_nodes),
                    total: String(healthStats.total_nodes),
                }),
                tone: healthStats.unhealthy_nodes === 0 ? 'ok' : 'warn',
                icon: 'nodes',
            });
        }

        if (!healthLoading) {
            chips.push({
                id: 'systems',
                label: systemsOk ? t('admin.welcome.chip_systems_ok') : t('admin.welcome.chip_systems_attention'),
                tone: systemsOk ? 'ok' : 'warn',
                icon: systemsOk ? 'ok' : 'warn',
            });
        }

        if (updateAvailable && latestVersion) {
            chips.push({
                id: 'update',
                label: t('admin.welcome.chip_update', { version: latestVersion }),
                tone: 'info',
                icon: 'info',
            });
        }

        return chips;
    }, [healthLoading, healthStats, systemsOk, updateAvailable, latestVersion, t]);

    const frameProps = {
        isCustomizing,
        hiddenWidgets,
        onToggle: toggleWidgetVisibility,
    };

    return (
        <div className='space-y-6 md:space-y-8'>
            <WidgetRenderer widgets={getWidgets('admin-home', 'top-of-page')} />

            <PageHeader
                title={t('admin.dashboard.title')}
                description={t('admin.dashboard.subtitle')}
                icon={LayoutDashboard}
                actions={
                    <div className='flex flex-wrap items-center gap-2 md:gap-3'>
                        <Button
                            type='button'
                            variant={isCustomizing ? 'warning' : 'secondary'}
                            size='sm'
                            onClick={() => setIsCustomizing(!isCustomizing)}
                            className={cn(
                                'gap-2 text-[10px] font-black tracking-widest',
                                isCustomizing && 'border-amber-500/50 bg-amber-500/10 text-amber-500',
                            )}
                        >
                            <Settings className={cn('h-4 w-4', isCustomizing && 'animate-spin-slow')} />
                            <span className='hidden sm:inline'>
                                {isCustomizing ? t('admin.dashboard.stop_customizing') : t('admin.dashboard.customize')}
                            </span>
                            <span className='sm:hidden'>
                                {isCustomizing ? t('admin.dashboard.stop') : t('admin.dashboard.customize')}
                            </span>
                        </Button>
                        <Button
                            type='button'
                            variant='secondary'
                            size='sm'
                            onClick={clearCache}
                            loading={isClearingCache}
                            className='gap-2 text-[10px] font-black tracking-widest'
                        >
                            {!isClearingCache && <Trash2 className='h-4 w-4' />}
                            <span className='hidden sm:inline'>{t('admin.dashboard.clear_cache')}</span>
                            <span className='sm:hidden'>{t('admin.dashboard.clear')}</span>
                        </Button>
                        <Button asChild size='sm' className='gap-2 text-[10px] font-black tracking-widest'>
                            <Link href='/admin/settings'>
                                <Settings className='h-4 w-4' />
                                <span className='hidden sm:inline'>{t('admin.dashboard.global_settings')}</span>
                                <span className='sm:hidden'>{t('admin.dashboard.settings')}</span>
                            </Link>
                        </Button>
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
                                type='button'
                                onClick={dismissWarning}
                                className='rounded-xl border border-red-500/20 px-4 py-2 text-[10px] font-black tracking-widest whitespace-nowrap text-red-500 uppercase transition-all hover:bg-red-500/10 md:px-5 md:py-2.5'
                            >
                                {t('admin.dashboard.app_url_warning.remind_me')}
                            </button>
                            <button
                                type='button'
                                onClick={() => router.push('/admin/settings')}
                                className='rounded-xl bg-red-500 px-4 py-2 text-[10px] font-black tracking-widest whitespace-nowrap text-white uppercase transition-all hover:scale-105 md:px-5 md:py-2.5'
                            >
                                {t('admin.dashboard.app_url_warning.update_settings')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {updateAvailable && latestVersion && !showAppUrlWarning && (
                <div className='group relative overflow-hidden rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 backdrop-blur-3xl md:rounded-3xl md:p-5'>
                    <div className='relative z-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
                        <div className='flex min-w-0 items-start gap-3'>
                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-500'>
                                <Download className='h-5 w-5' />
                            </div>
                            <div className='min-w-0 space-y-0.5'>
                                <h3 className='text-sm font-black tracking-tight text-amber-500 uppercase md:text-base'>
                                    {t('admin.dashboard.update_banner.title', { version: latestVersion })}
                                </h3>
                                <p className='text-xs font-bold text-amber-500/70'>
                                    {t('admin.dashboard.update_banner.message')}
                                </p>
                            </div>
                        </div>
                        <Link
                            href='/admin/updates'
                            className='shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-center text-[10px] font-black tracking-widest whitespace-nowrap text-black uppercase transition-all hover:scale-105'
                        >
                            {t('admin.dashboard.update_banner.action')}
                        </Link>
                    </div>
                </div>
            )}

            <AdminWidgetFrame widgetId='welcome' {...frameProps}>
                <WelcomeWidget
                    version={data?.version?.current?.version}
                    chips={welcomeChips}
                    updateAvailable={updateAvailable}
                    latestVersion={latestVersion}
                />
            </AdminWidgetFrame>

            <AdminWidgetFrame widgetId='stats' {...frameProps}>
                <QuickStatsWidget stats={data?.count} loading={loading} />
            </AdminWidgetFrame>

            <WidgetRenderer widgets={getWidgets('admin-home', 'before-widgets-grid')} />

            <div className='grid grid-cols-1 items-start gap-6 md:gap-8 lg:grid-cols-12'>
                <AdminWidgetFrame widgetId='health' {...frameProps} className='lg:col-span-8'>
                    <SystemHealthWidget
                        stats={healthStats}
                        selftest={healthSelftest}
                        latency={healthLatency}
                        loading={healthLoading}
                    />
                </AdminWidgetFrame>

                <AdminWidgetFrame widgetId='attention' {...frameProps} className='lg:col-span-4'>
                    <AttentionWidget
                        stats={healthStats}
                        selftest={healthSelftest}
                        healthLoading={healthLoading}
                        updateAvailable={updateAvailable}
                        latestVersion={latestVersion}
                        cronTasks={data?.cron?.recent}
                    />
                </AdminWidgetFrame>

                <AdminWidgetFrame widgetId='nodes' {...frameProps} className='lg:col-span-6'>
                    <NodesOverviewWidget nodes={healthNodes} loading={healthLoading} />
                </AdminWidgetFrame>

                <AdminWidgetFrame widgetId='activity' {...frameProps} className='lg:col-span-6'>
                    <RecentActivityWidget />
                </AdminWidgetFrame>

                <AdminWidgetFrame widgetId='servers' {...frameProps} className='lg:col-span-6'>
                    <RecentServersWidget />
                </AdminWidgetFrame>

                <AdminWidgetFrame widgetId='tickets' {...frameProps} className='lg:col-span-6'>
                    <SupportTicketsWidget />
                </AdminWidgetFrame>

                <AdminWidgetFrame widgetId='version' {...frameProps} className='lg:col-span-7'>
                    <VersionInfoWidget version={data?.version} loading={loading} />
                </AdminWidgetFrame>

                <AdminWidgetFrame widgetId='cron' {...frameProps} className='lg:col-span-5'>
                    <CronStatusWidget tasks={data?.cron?.recent} loading={loading} />
                </AdminWidgetFrame>

                <AdminWidgetFrame widgetId='cloud' {...frameProps} className='lg:col-span-12'>
                    <CloudHubWidget />
                </AdminWidgetFrame>

                <AdminWidgetFrame widgetId='links' {...frameProps} className='lg:col-span-12'>
                    <QuickLinksWidget onClearCache={clearCache} isClearingCache={isClearingCache} />
                </AdminWidgetFrame>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-home', 'after-widgets-grid')} />
            <WidgetRenderer widgets={getWidgets('admin-home', 'bottom-of-page')} />
        </div>
    );
}
