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

import React from 'react';
import Link from 'next/link';
import {
    Activity,
    Zap,
    Database,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Server,
    HardDrive,
    ArrowUpRight,
} from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { Progress } from '@/components/ui/progress';
import { cn, formatFileSize } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import type { GlobalStats, SelfTestResponse } from '@/hooks/useSystemHealth';

interface SystemHealthWidgetProps {
    stats: GlobalStats | null;
    selftest: SelfTestResponse | null;
    latency: number;
    loading: boolean;
}

export function SystemHealthWidget({ stats, selftest, latency, loading }: SystemHealthWidgetProps) {
    const { t } = useTranslation();

    const memoryPct = stats && stats.total_memory > 0 ? Math.round((stats.used_memory / stats.total_memory) * 100) : 0;
    const cpuPct = stats ? Math.min(100, Math.max(0, Math.round(stats.avg_cpu_percent))) : 0;

    const systems = [
        {
            name: t('admin.system_health.nodes'),
            status: stats ? (stats.unhealthy_nodes === 0 ? 'Healthy' : 'Degraded') : 'Unknown',
            icon: Zap,
            color: stats?.unhealthy_nodes === 0 ? 'text-primary' : 'text-amber-500',
            detail: stats
                ? t('admin.system_health.status.online', {
                      healthy: String(stats.healthy_nodes),
                      total: String(stats.total_nodes),
                  })
                : t('admin.system_health.status.loading'),
            loading,
        },
        {
            name: t('admin.system_health.startup'),
            status: 'Latency',
            icon: Clock,
            color: 'text-primary',
            detail: `${latency}ms`,
            loading,
        },
        {
            name: t('admin.system_health.database'),
            status: selftest?.checks.mysql.status ? 'Healthy' : 'Error',
            icon: Database,
            color: selftest?.checks.mysql.status ? 'text-primary' : 'text-red-500',
            detail:
                selftest?.checks.mysql.message === 'Successful'
                    ? t('admin.system_health.status.successful')
                    : selftest?.checks.mysql.message === 'Failed'
                      ? t('admin.system_health.status.failed')
                      : selftest?.checks.mysql.message || t('admin.system_health.status.connecting'),
            loading,
        },
        {
            name: t('admin.system_health.cache'),
            status: selftest?.checks.redis.status ? 'Healthy' : 'Error',
            icon: Server,
            color: selftest?.checks.redis.status ? 'text-primary' : 'text-red-500',
            detail:
                selftest?.checks.redis.message === 'Successful'
                    ? t('admin.system_health.status.successful')
                    : selftest?.checks.redis.message === 'Failed'
                      ? t('admin.system_health.status.failed')
                      : selftest?.checks.redis.message || t('admin.system_health.status.connecting'),
            loading,
        },
    ];

    return (
        <PageCard
            title={t('admin.system_health.title')}
            description={t('admin.system_health.description')}
            icon={Activity}
            className='h-full'
            action={
                <Link
                    href='/admin/nodes/status'
                    className='text-muted-foreground hover:text-primary flex items-center gap-1 text-[9px] font-black tracking-widest uppercase transition-colors md:text-[10px]'
                >
                    {t('admin.system_health.view_nodes')}
                    <ArrowUpRight className='h-3.5 w-3.5' />
                </Link>
            }
        >
            <div className='space-y-5'>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    <div className='bg-muted/10 border-border/50 space-y-3 rounded-xl border p-4 md:rounded-2xl'>
                        <div className='flex items-center justify-between gap-3'>
                            <div className='flex items-center gap-2'>
                                <div className='bg-primary/10 text-primary border-primary/20 flex h-9 w-9 items-center justify-center rounded-lg border'>
                                    <HardDrive className='h-4 w-4' />
                                </div>
                                <div>
                                    <p className='text-xs font-bold md:text-sm'>{t('admin.system_health.memory')}</p>
                                    <p className='text-muted-foreground text-[9px] font-bold tracking-tighter uppercase opacity-70 md:text-[10px]'>
                                        {loading
                                            ? t('admin.system_health.status.fetching')
                                            : stats
                                              ? `${formatFileSize(stats.used_memory)} / ${formatFileSize(stats.total_memory)}`
                                              : t('admin.system_health.status.unavailable')}
                                    </p>
                                </div>
                            </div>
                            <span className='text-sm font-black tabular-nums'>{loading ? '—' : `${memoryPct}%`}</span>
                        </div>
                        <Progress
                            value={loading ? 0 : memoryPct}
                            className='h-2'
                            indicatorClassName={
                                memoryPct > 90 ? 'bg-red-500' : memoryPct > 75 ? 'bg-amber-500' : undefined
                            }
                        />
                    </div>

                    <div className='bg-muted/10 border-border/50 space-y-3 rounded-xl border p-4 md:rounded-2xl'>
                        <div className='flex items-center justify-between gap-3'>
                            <div className='flex items-center gap-2'>
                                <div className='bg-primary/10 text-primary border-primary/20 flex h-9 w-9 items-center justify-center rounded-lg border'>
                                    <Activity className='h-4 w-4' />
                                </div>
                                <div>
                                    <p className='text-xs font-bold md:text-sm'>{t('admin.system_health.cpu_load')}</p>
                                    <p className='text-muted-foreground text-[9px] font-bold tracking-tighter uppercase opacity-70 md:text-[10px]'>
                                        {loading
                                            ? t('admin.system_health.status.fetching')
                                            : stats
                                              ? `${stats.avg_cpu_percent}% ${t('admin.system_health.avg')}`
                                              : t('admin.system_health.status.unavailable')}
                                    </p>
                                </div>
                            </div>
                            <span className='text-sm font-black tabular-nums'>{loading ? '—' : `${cpuPct}%`}</span>
                        </div>
                        <Progress
                            value={loading ? 0 : cpuPct}
                            className='h-2'
                            indicatorClassName={cpuPct > 90 ? 'bg-red-500' : cpuPct > 75 ? 'bg-amber-500' : undefined}
                        />
                    </div>
                </div>

                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    {systems.map((system) => {
                        const isOk =
                            system.status === 'Healthy' ||
                            system.status === 'Latency' ||
                            system.status === 'Usage' ||
                            system.status === 'Average';
                        return (
                            <div
                                key={system.name}
                                className='bg-muted/10 border-border/50 group hover:bg-muted/20 flex items-center justify-between gap-3 rounded-xl border p-3 transition-all md:rounded-2xl md:p-4'
                            >
                                <div className='flex min-w-0 flex-1 items-center gap-2 md:gap-3'>
                                    <div
                                        className={cn(
                                            'bg-background border-border/50 group-hover:border-primary/30 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-all md:h-10 md:w-10 md:rounded-xl',
                                            system.loading && 'animate-pulse',
                                        )}
                                    >
                                        <system.icon className={cn('h-4 w-4 md:h-5 md:w-5', system.color)} />
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <p className='truncate text-xs font-bold tracking-tight md:text-sm'>
                                            {system.name}
                                        </p>
                                        <p
                                            className='text-muted-foreground truncate text-[9px] font-bold tracking-tighter uppercase opacity-70 md:text-[10px]'
                                            title={system.detail}
                                        >
                                            {system.loading ? t('admin.system_health.status.fetching') : system.detail}
                                        </p>
                                    </div>
                                </div>
                                {system.loading ? (
                                    <div className='bg-muted-foreground/30 h-2 w-2 shrink-0 animate-pulse rounded-full' />
                                ) : isOk ? (
                                    <CheckCircle2 className='h-4 w-4 shrink-0 text-green-500 md:h-5 md:w-5' />
                                ) : (
                                    <AlertTriangle className='h-4 w-4 shrink-0 text-red-500 md:h-5 md:w-5' />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </PageCard>
    );
}
