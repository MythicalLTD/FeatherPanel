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
import { ArrowRight, BellRing, CheckCircle2, Clock, Database, Download, HardDrive, Server } from 'lucide-react';
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
        danger: { dot: 'bg-red-500', tile: 'bg-red-500/10 text-red-600 dark:text-red-400' },
        warn: { dot: 'bg-amber-500', tile: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
        info: { dot: 'bg-sky-500', tile: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' },
    };

    return (
        <section className='fp-surface min-w-0 rounded-xl border p-4 sm:p-5'>
            <header className='flex items-center gap-3'>
                <span className='fp-icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'>
                    <BellRing className='h-4 w-4' aria-hidden />
                </span>
                <div className='min-w-0 flex-1'>
                    <h2 className='text-sm font-semibold'>{t('admin.attention.title')}</h2>
                    <p className='text-muted-foreground truncate text-xs'>{t('admin.attention.description')}</p>
                </div>
                {items.length > 0 && (
                    <span className='shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400'>
                        {t('admin.attention.count_badge', { count: String(items.length) })}
                    </span>
                )}
            </header>
            <div className='mt-4'>
                {healthLoading && items.length === 0 ? (
                    <AdminWidgetLoading label={t('admin.attention.title')} rows={2} />
                ) : items.length === 0 && (!stats || !selftest) ? (
                    <div className='space-y-2 py-2'>
                        <p className='text-muted-foreground text-sm'>{t('admin.system_health.status.unavailable')}</p>
                        <Link
                            href='/admin/nodes/status'
                            className='text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline'
                        >
                            {t('admin.system_health.view_nodes')}
                            <ArrowRight className='h-3.5 w-3.5' aria-hidden />
                        </Link>
                    </div>
                ) : items.length === 0 ? (
                    <div className='fp-surface-inset flex items-center gap-3 rounded-lg border p-3'>
                        <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
                            <CheckCircle2 className='h-4.5 w-4.5' aria-hidden />
                        </span>
                        <div className='min-w-0'>
                            <p className='text-sm font-medium'>{t('admin.attention.all_clear_title')}</p>
                            <p className='text-muted-foreground text-xs'>{t('admin.attention.all_clear_desc')}</p>
                        </div>
                    </div>
                ) : (
                    <ul className='space-y-2'>
                        {items.map((item) => (
                            <li key={item.id}>
                                <Link
                                    href={item.href}
                                    onClick={item.id === 'cron' ? onRevealCron : undefined}
                                    className='group fp-surface-inset hover:border-primary/40 flex items-center gap-3 rounded-lg border p-3 transition-colors'
                                >
                                    <span
                                        className={cn(
                                            'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                            toneStyles[item.tone].tile,
                                        )}
                                    >
                                        <item.icon className='h-4 w-4' aria-hidden />
                                        <span
                                            className={cn(
                                                'ring-card absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2',
                                                toneStyles[item.tone].dot,
                                            )}
                                            aria-hidden
                                        />
                                    </span>
                                    <span className='min-w-0 flex-1'>
                                        <span className='block truncate text-sm font-medium'>{item.title}</span>
                                        <span className='text-muted-foreground block text-xs'>{item.detail}</span>
                                    </span>
                                    <span className='text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium'>
                                        {t('admin.attention.action')}
                                        <ArrowRight
                                            className='h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5'
                                            aria-hidden
                                        />
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
