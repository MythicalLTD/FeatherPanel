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
import { Activity, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { cn } from '@/lib/utils';

interface CronTask {
    id: number;
    task_name: string;
    last_run_at: string | null;
    last_run_success: boolean;
    late: boolean;
}

interface CronStatusWidgetProps {
    tasks?: CronTask[];
    loading?: boolean;
}

export function CronStatusWidget({ tasks, loading }: CronStatusWidgetProps) {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.cron.title')} description={t('admin.cron.description')} icon={Activity}>
            <div className='space-y-4'>
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className='bg-muted/20 flex animate-pulse items-center justify-between rounded-2xl p-4'
                        >
                            <div className='space-y-2'>
                                <div className='bg-muted h-4 w-32 rounded' />
                                <div className='bg-muted h-3 w-24 rounded' />
                            </div>
                            <div className='bg-muted h-6 w-16 rounded' />
                        </div>
                    ))
                ) : tasks && tasks.length > 0 ? (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className='bg-muted/10 border-border/50 group hover:bg-muted/20 flex flex-col gap-3 rounded-xl border p-3 transition-all sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:rounded-2xl md:p-4'
                        >
                            <div className='flex min-w-0 flex-1 items-center gap-3'>
                                <div
                                    className={cn(
                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-10 md:w-10 md:rounded-xl',
                                        task.last_run_success && !task.late
                                            ? 'bg-green-500/10 text-green-500'
                                            : task.late
                                              ? 'bg-orange-500/10 text-orange-500'
                                              : 'bg-red-500/10 text-red-500',
                                    )}
                                >
                                    {task.last_run_success && !task.late ? (
                                        <CheckCircle2 className='h-4 w-4 md:h-5 md:w-5' />
                                    ) : task.late ? (
                                        <Clock className='h-4 w-4 md:h-5 md:w-5' />
                                    ) : (
                                        <XCircle className='h-4 w-4 md:h-5 md:w-5' />
                                    )}
                                </div>
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate text-xs font-bold tracking-tight md:text-sm'>
                                        {task.task_name}
                                    </p>
                                    <p className='text-muted-foreground truncate text-[9px] font-bold uppercase opacity-70 md:text-[10px]'>
                                        {t('admin.cron.last_run', {
                                            date: task.last_run_at
                                                ? new Date(task.last_run_at).toLocaleString()
                                                : t('admin.cron.never'),
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div
                                className={cn(
                                    'shrink-0 self-start rounded-lg px-2 py-1 text-[9px] font-black tracking-wider uppercase sm:self-auto md:text-[10px]',
                                    task.last_run_success && !task.late
                                        ? 'bg-green-500/20 text-green-500'
                                        : task.late
                                          ? 'bg-orange-500/20 text-orange-500'
                                          : 'bg-red-500/20 text-red-500',
                                )}
                            >
                                {task.last_run_success && !task.late
                                    ? t('admin.cron.healthy')
                                    : task.late
                                      ? t('admin.cron.late')
                                      : t('admin.cron.failed')}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className='py-8 text-center'>
                        <AlertTriangle className='text-muted-foreground/30 mx-auto mb-3 h-12 w-12' />
                        <p className='text-muted-foreground text-sm font-bold italic'>{t('admin.cron.no_tasks')}</p>
                    </div>
                )}
            </div>
        </PageCard>
    );
}
