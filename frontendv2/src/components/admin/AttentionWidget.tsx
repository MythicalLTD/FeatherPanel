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

import { AdminWidgetLoading } from './AdminWidgetLoading';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { BellRing, CheckCircle2, Clock, Database, Download, HardDrive, Server } from 'lucide-react';
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
    onRevealCron?: () => void;
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
    onRevealCron,
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
            href: '#admin-cron',
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
        danger: 'text-red-700 dark:text-red-400',
        warn: 'text-amber-800 dark:text-amber-400',
        info: 'text-foreground',
    };

    return (
        <PageCard
            title={t('admin.attention.title')}
            description={t('admin.attention.description')}
            icon={BellRing}
            className='space-y-4 p-4 sm:p-5 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child]:pb-4'
            variant={items.length > 0 ? 'warning' : 'default'}
        >
            {healthLoading && items.length === 0 ? (
                <AdminWidgetLoading label={t('admin.attention.title')} rows={2} />
            ) : items.length === 0 && (!stats || !selftest) ? (
                <div className='space-y-2 py-5'>
                    <p className='text-muted-foreground text-sm'>{t('admin.system_health.status.unavailable')}</p>
                    <Link
                        href='/admin/nodes/status'
                        className='inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4'
                    >
                        {t('admin.system_health.view_nodes')}
                    </Link>
                </div>
            ) : items.length === 0 ? (
                <div className='flex items-start gap-3 py-1'>
                    <CheckCircle2
                        className='mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400'
                        aria-hidden
                    />
                    <div className='space-y-1.5'>
                        <p className='text-sm font-medium'>{t('admin.attention.all_clear_title')}</p>
                        <p className='text-muted-foreground text-xs leading-relaxed'>
                            {t('admin.attention.all_clear_desc')}
                        </p>
                    </div>
                </div>
            ) : (
                <div className='divide-border divide-y'>
                    {items.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            onClick={item.id === 'cron' ? onRevealCron : undefined}
                            className={cn(
                                'group hover:bg-accent flex min-h-11 items-start gap-3 rounded-md px-1 py-3 transition-colors',
                                toneStyles[item.tone],
                            )}
                        >
                            <div className='flex h-6 w-5 shrink-0 items-center justify-center'>
                                <item.icon className='h-4 w-4' />
                            </div>
                            <div className='min-w-0 flex-1 space-y-0.5'>
                                <p className='text-sm font-medium'>{item.title}</p>
                                <p className='text-muted-foreground text-xs leading-relaxed'>{item.detail}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </PageCard>
    );
}
