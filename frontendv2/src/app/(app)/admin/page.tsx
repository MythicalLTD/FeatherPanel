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
import { Settings, Trash2, AlertTriangle, Download, RefreshCw, SlidersHorizontal, LayoutDashboard } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
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
import { Button } from '@/components/featherui/Button';
import { PageHeader } from '@/components/featherui/PageHeader';
import styles from './dashboard.module.css';

export default function AdminDashboardPage() {
    const { t } = useTranslation();
    const { data, loading, error, refresh } = useAdminDashboard();
    const initialLoading = loading && !data;
    const {
        stats: healthStats,
        nodes: healthNodes,
        selftest: healthSelftest,
        latency: healthLatency,
        systemsOk,
        loading: healthLoading,
        refresh: refreshHealth,
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
                const parsed: unknown = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) setHiddenWidgets(parsed);
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
            toast.error(getApiErrorMessage(err, t, 'admin.dashboard.cache_failed'), { id: toastId });
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

        if (!healthLoading && healthStats && healthSelftest) {
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
    }, [healthLoading, healthStats, healthSelftest, systemsOk, updateAvailable, latestVersion, t]);

    const frameProps = {
        isCustomizing,
        hiddenWidgets,
        onToggle: toggleWidgetVisibility,
    };

    return (
        <div className={cn(styles.dashboard, 'text-foreground space-y-6')}>
            <WidgetRenderer widgets={getWidgets('admin-home', 'top-of-page')} />

            <PageHeader
                icon={LayoutDashboard}
                title={t('admin.dashboard.title')}
                description={t('admin.dashboard.subtitle')}
                actions={
                    <div className='flex flex-wrap items-center gap-2'>
                        <Button
                            type='button'
                            variant='ghost'
                            onClick={() => {
                                refresh();
                                refreshHealth();
                            }}
                            loading={loading}
                            className='gap-2 px-4'
                        >
                            {!loading && <RefreshCw className='h-4 w-4' aria-hidden />}
                            {t('common.refresh')}
                        </Button>
                        <Button
                            type='button'
                            variant={isCustomizing ? 'warning' : 'secondary'}
                            onClick={() => setIsCustomizing(!isCustomizing)}
                            aria-pressed={isCustomizing}
                            className={cn('gap-2 px-4', isCustomizing && 'text-amber-800 dark:text-amber-400')}
                        >
                            <SlidersHorizontal className='h-4 w-4' aria-hidden />
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
                            onClick={clearCache}
                            loading={isClearingCache}
                            className='gap-2 px-4'
                        >
                            {!isClearingCache && <Trash2 className='h-4 w-4' />}
                            <span className='hidden sm:inline'>{t('admin.dashboard.clear_cache')}</span>
                            <span className='sm:hidden'>{t('admin.dashboard.clear')}</span>
                        </Button>
                        <Button asChild variant='secondary' className='gap-2 px-4'>
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

            {error && (
                <div
                    role='alert'
                    className='bg-card/50 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/30 p-4 backdrop-blur-sm'
                >
                    <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>
                    <Button
                        type='button'
                        variant='secondary'
                        onClick={refresh}
                        loading={loading}
                        className='rounded-lg font-medium'
                    >
                        {t('common.retry')}
                    </Button>
                </div>
            )}

            {showAppUrlWarning && (
                <div
                    role='alert'
                    className='bg-card/50 rounded-2xl border border-red-500/30 p-4 text-red-700 backdrop-blur-sm dark:text-red-400'
                >
                    <div className='relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center md:gap-6'>
                        <div className='flex min-w-0 flex-1 items-start gap-3 md:gap-4'>
                            <div className='flex h-10 w-6 shrink-0 items-center justify-center'>
                                <AlertTriangle className='h-5 w-5 md:h-6 md:w-6' />
                            </div>
                            <div className='min-w-0 flex-1 space-y-1'>
                                <h2 className='text-sm font-semibold'>{t('admin.dashboard.app_url_warning.title')}</h2>
                                <p className='text-muted-foreground text-sm leading-relaxed'>
                                    {t('admin.dashboard.app_url_warning.message')}
                                </p>
                            </div>
                        </div>
                        <div className='flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center'>
                            <button
                                type='button'
                                onClick={dismissWarning}
                                className='hover:bg-accent min-h-11 rounded-lg px-4 py-2 text-sm font-medium transition-colors'
                            >
                                {t('admin.dashboard.app_url_warning.remind_me')}
                            </button>
                            <Link
                                href='/admin/settings'
                                className='inline-flex min-h-11 items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800'
                            >
                                {t('admin.dashboard.app_url_warning.update_settings')}
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {updateAvailable && latestVersion && !showAppUrlWarning && (
                <div
                    role='status'
                    className='bg-card/50 rounded-2xl border border-amber-500/30 p-4 text-amber-800 backdrop-blur-sm dark:text-amber-400'
                >
                    <div className='relative z-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
                        <div className='flex min-w-0 items-start gap-3'>
                            <div className='flex h-10 w-6 shrink-0 items-center justify-center'>
                                <Download className='h-5 w-5' />
                            </div>
                            <div className='min-w-0 space-y-0.5'>
                                <h2 className='text-sm font-semibold'>
                                    {t('admin.dashboard.update_banner.title', { version: latestVersion })}
                                </h2>
                                <p className='text-muted-foreground text-sm'>
                                    {t('admin.dashboard.update_banner.message')}
                                </p>
                            </div>
                        </div>
                        <Link
                            href='/admin/updates'
                            className='inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400'
                        >
                            {t('admin.dashboard.update_banner.action')}
                        </Link>
                    </div>
                </div>
            )}

            <AdminWidgetFrame widgetId='welcome' {...frameProps}>
                <WelcomeWidget
                    version={initialLoading ? undefined : data?.version?.current?.version || t('common.unknown')}
                    chips={welcomeChips}
                    updateAvailable={updateAvailable}
                    latestVersion={latestVersion}
                />
            </AdminWidgetFrame>

            <AdminWidgetFrame widgetId='stats' {...frameProps}>
                <QuickStatsWidget stats={data?.count} loading={initialLoading} />
            </AdminWidgetFrame>

            <WidgetRenderer widgets={getWidgets('admin-home', 'before-widgets-grid')} />

            <div className='grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]'>
                <div className='min-w-0 space-y-5'>
                    <AdminWidgetFrame widgetId='health' {...frameProps}>
                        <SystemHealthWidget
                            stats={healthStats}
                            selftest={healthSelftest}
                            latency={healthLatency}
                            loading={healthLoading}
                        />
                    </AdminWidgetFrame>

                    <AdminWidgetFrame widgetId='nodes' {...frameProps}>
                        <NodesOverviewWidget nodes={healthNodes} loading={healthLoading} unavailable={!healthStats} />
                    </AdminWidgetFrame>

                    <AdminWidgetFrame widgetId='servers' {...frameProps}>
                        <RecentServersWidget />
                    </AdminWidgetFrame>

                    <AdminWidgetFrame widgetId='links' {...frameProps}>
                        <QuickLinksWidget onClearCache={clearCache} isClearingCache={isClearingCache} />
                    </AdminWidgetFrame>
                </div>

                <div className='min-w-0 space-y-5'>
                    <AdminWidgetFrame widgetId='attention' {...frameProps}>
                        <AttentionWidget
                            stats={healthStats}
                            selftest={healthSelftest}
                            healthLoading={healthLoading}
                            updateAvailable={updateAvailable}
                            latestVersion={latestVersion}
                            cronTasks={data?.cron?.recent}
                            onRevealCron={() => {
                                if (hiddenWidgets.includes('cron')) toggleWidgetVisibility('cron');
                                requestAnimationFrame(() =>
                                    document.getElementById('admin-cron')?.scrollIntoView({ block: 'start' }),
                                );
                            }}
                        />
                    </AdminWidgetFrame>
                    <AdminWidgetFrame widgetId='tickets' {...frameProps}>
                        <SupportTicketsWidget />
                    </AdminWidgetFrame>
                    <AdminWidgetFrame widgetId='activity' {...frameProps}>
                        <RecentActivityWidget />
                    </AdminWidgetFrame>

                    <AdminWidgetFrame widgetId='cron' {...frameProps}>
                        <CronStatusWidget tasks={data?.cron?.recent} loading={initialLoading} />
                    </AdminWidgetFrame>

                    <AdminWidgetFrame widgetId='version' {...frameProps}>
                        <VersionInfoWidget version={data?.version} loading={initialLoading} />
                    </AdminWidgetFrame>
                </div>
            </div>

            <AdminWidgetFrame widgetId='cloud' {...frameProps}>
                <CloudHubWidget />
            </AdminWidgetFrame>

            <WidgetRenderer widgets={getWidgets('admin-home', 'after-widgets-grid')} />
            <WidgetRenderer widgets={getWidgets('admin-home', 'bottom-of-page')} />
        </div>
    );
}
