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

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { BellRing, CheckCircle2, Clock, Database, Download, HardDrive, Server, ArrowUpRight } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { GlobalStats, SelfTestResponse } from '@/hooks/useSystemHealth';

interface CronTask {
    id: number;
    task_name: string;
    last_run_success: boolean;
    late: boolean;
}

interface AttentionWidgetProps {
    stats: GlobalStats | null;
    selftest: SelfTestResponse | null;
    healthLoading: boolean;
    updateAvailable?: boolean;
    latestVersion?: string;
    cronTasks?: CronTask[];
}

interface AttentionItem {
    id: string;
    title: string;
    detail: string;
    href: string;
    tone: 'danger' | 'warn' | 'info';
    icon: LucideIcon;
}

export function AttentionWidget({
    stats,
    selftest,
    healthLoading,
    updateAvailable,
    latestVersion,
    cronTasks = [],
}: AttentionWidgetProps) {
    const { t } = useTranslation();

    const items: AttentionItem[] = [];

    if (!healthLoading && stats && stats.unhealthy_nodes > 0) {
        items.push({
            id: 'nodes',
            title: t('admin.attention.unhealthy_nodes_title'),
            detail: t('admin.attention.unhealthy_nodes_detail', { count: String(stats.unhealthy_nodes) }),
            href: '/admin/nodes/status',
            tone: 'danger',
            icon: HardDrive,
        });
    }

    if (!healthLoading && selftest && !selftest.checks.mysql.status) {
        items.push({
            id: 'mysql',
            title: t('admin.attention.database_title'),
            detail: selftest.checks.mysql.message || t('admin.attention.database_detail'),
            href: '/admin/settings',
            tone: 'danger',
            icon: Database,
        });
    }

    if (!healthLoading && selftest && !selftest.checks.redis.status) {
        items.push({
            id: 'redis',
            title: t('admin.attention.cache_title'),
            detail: selftest.checks.redis.message || t('admin.attention.cache_detail'),
            href: '/admin/settings',
            tone: 'danger',
            icon: Server,
        });
    }

    const failedCron = cronTasks.filter((task) => !task.last_run_success || task.late);
    if (failedCron.length > 0) {
        items.push({
            id: 'cron',
            title: t('admin.attention.cron_title'),
            detail: t('admin.attention.cron_detail', { count: String(failedCron.length) }),
            href: '/admin',
            tone: 'warn',
            icon: Clock,
        });
    }

    if (updateAvailable && latestVersion) {
        items.push({
            id: 'update',
            title: t('admin.attention.update_title', { version: latestVersion }),
            detail: t('admin.attention.update_detail'),
            href: '/admin/updates',
            tone: 'info',
            icon: Download,
        });
    }

    const toneStyles = {
        danger: 'border-red-500/25 bg-red-500/10 text-red-500',
        warn: 'border-amber-500/25 bg-amber-500/10 text-amber-500',
        info: 'border-primary/25 bg-primary/10 text-primary',
    };

    return (
        <PageCard
            title={t('admin.attention.title')}
            description={t('admin.attention.description')}
            icon={BellRing}
            className='h-full'
            variant={items.length > 0 ? 'warning' : 'default'}
        >
            {healthLoading && items.length === 0 ? (
                <div className='space-y-3'>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className='bg-muted/20 h-16 animate-pulse rounded-2xl' />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className='flex flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-10 text-center'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500'>
                        <CheckCircle2 className='h-6 w-6' />
                    </div>
                    <p className='text-sm font-black tracking-tight text-emerald-500 uppercase'>
                        {t('admin.attention.all_clear_title')}
                    </p>
                    <p className='text-muted-foreground max-w-xs text-xs font-medium'>
                        {t('admin.attention.all_clear_desc')}
                    </p>
                </div>
            ) : (
                <div className='space-y-2.5'>
                    {items.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                                'group flex items-start gap-3 rounded-2xl border p-3.5 transition-all hover:scale-[1.01] active:scale-[0.99]',
                                toneStyles[item.tone],
                            )}
                        >
                            <div className='bg-background/40 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/20'>
                                <item.icon className='h-4 w-4' />
                            </div>
                            <div className='min-w-0 flex-1 space-y-0.5'>
                                <p className='truncate text-xs font-black tracking-wide uppercase md:text-[13px]'>
                                    {item.title}
                                </p>
                                <p className='text-[11px] leading-relaxed font-medium opacity-80 md:text-xs'>
                                    {item.detail}
                                </p>
                            </div>
                            <ArrowUpRight className='mt-1 h-3.5 w-3.5 shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
                        </Link>
                    ))}
                </div>
            )}
        </PageCard>
    );
}
