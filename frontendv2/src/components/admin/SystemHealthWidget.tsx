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

import { SkeletonLine } from './AdminWidgetLoading';

import Link from 'next/link';
import { CheckCircle2, AlertTriangle, CircleHelp, Activity } from 'lucide-react';
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
    const memoryPct =
        stats && stats.total_memory > 0 ? Math.min(100, Math.round((stats.used_memory / stats.total_memory) * 100)) : 0;
    const cpuPct = stats ? Math.min(100, Math.max(0, Math.round(stats.avg_cpu_percent))) : 0;
    const unavailable = t('admin.system_health.status.unavailable');
    const checkMessage = (check?: { status: boolean; message: string }) => {
        if (!check) return unavailable;
        if (check.message === 'Successful') return t('admin.system_health.status.successful');
        if (check.message === 'Failed') return t('admin.system_health.status.failed');
        return check.message;
    };
    const systems = [
        {
            name: t('admin.system_health.nodes'),
            ok: stats ? stats.unhealthy_nodes === 0 : null,
            detail: stats
                ? t('admin.system_health.status.online', {
                      healthy: String(stats.healthy_nodes),
                      total: String(stats.total_nodes),
                  })
                : unavailable,
        },
        {
            name: t('admin.system_health.database'),
            ok: selftest?.checks.mysql.status ?? null,
            detail: checkMessage(selftest?.checks.mysql),
        },
        {
            name: t('admin.system_health.cache'),
            ok: selftest?.checks.redis.status ?? null,
            detail: checkMessage(selftest?.checks.redis),
        },
        {
            name: t('admin.system_health.startup'),
            ok: selftest ? true : null,
            detail: selftest ? `${latency} ms` : unavailable,
        },
    ];
    const resources = [
        {
            name: t('admin.system_health.memory'),
            value: memoryPct,
            detail: stats
                ? `${formatFileSize(stats.used_memory)} / ${formatFileSize(stats.total_memory)}`
                : unavailable,
        },
        { name: t('admin.system_health.cpu_load'), value: cpuPct, detail: t('admin.system_health.avg') },
    ];

    return (
        <PageCard
            className='space-y-4 p-4 sm:p-5 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child]:pb-4'
            title={t('admin.system_health.title')}
            icon={Activity}
            description={t('admin.system_health.description')}
            action={
                <Link
                    href='/admin/nodes/status'
                    className='text-muted-foreground hover:bg-accent hover:text-foreground inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-medium transition-colors'
                >
                    {t('admin.system_health.view_nodes')}
                </Link>
            }
        >
            <div className='space-y-6' aria-busy={loading}>
                {loading && (
                    <p role='status' className='text-muted-foreground text-xs'>
                        {t('admin.system_health.status.fetching')}
                    </p>
                )}
                <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8'>
                    {resources.map((resource) => (
                        <div key={resource.name} className='min-w-0 space-y-3'>
                            <div className='flex items-baseline justify-between gap-3'>
                                <span className='text-sm font-medium'>{resource.name}</span>
                                <span className='text-2xl font-semibold tracking-tight tabular-nums'>
                                    {loading ? (
                                        <SkeletonLine className='h-7 w-14' />
                                    ) : !stats ? (
                                        '…'
                                    ) : (
                                        `${resource.value}%`
                                    )}
                                </span>
                            </div>
                            {loading ? (
                                <SkeletonLine className='h-1.5 w-full' />
                            ) : (
                                <Progress
                                    value={stats && !loading ? resource.value : 0}
                                    className='bg-muted h-1.5'
                                    indicatorClassName={
                                        resource.value > 90
                                            ? 'bg-red-600 dark:bg-red-400'
                                            : resource.value > 75
                                              ? 'bg-amber-600 dark:bg-amber-400'
                                              : 'bg-foreground/65'
                                    }
                                />
                            )}
                            <p className='text-muted-foreground text-xs'>
                                {loading ? <SkeletonLine className='h-3 w-28' /> : resource.detail}
                            </p>
                        </div>
                    ))}
                </div>
                <dl className='grid grid-cols-1 gap-x-8 sm:grid-cols-2'>
                    {systems.map((system) => {
                        const Icon = system.ok === null ? CircleHelp : system.ok ? CheckCircle2 : AlertTriangle;
                        return (
                            <div
                                key={system.name}
                                className='border-border flex min-w-0 items-start justify-between gap-3 border-t py-3'
                            >
                                <dt className='text-sm'>{system.name}</dt>
                                <dd
                                    className={cn(
                                        'flex min-w-0 items-start gap-2 text-right text-xs leading-5',
                                        system.ok === null || loading
                                            ? 'text-muted-foreground'
                                            : system.ok
                                              ? 'text-emerald-700 dark:text-emerald-400'
                                              : 'text-red-700 dark:text-red-400',
                                    )}
                                >
                                    <span className='wrap-break-word'>
                                        {loading ? <SkeletonLine className='mt-1 h-3 w-20' /> : system.detail}
                                    </span>
                                    {!loading && <Icon className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />}
                                </dd>
                            </div>
                        );
                    })}
                </dl>
            </div>
        </PageCard>
    );
}
