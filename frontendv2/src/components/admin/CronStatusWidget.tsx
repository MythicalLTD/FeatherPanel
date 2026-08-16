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
import { formatRelativeTime } from '@/lib/dateUtils';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';

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
    const dateOpts = useDateFormatOptions();

    return (
        <PageCard
            title={t('admin.cron.title')}
            description={t('admin.cron.description')}
            icon={Activity}
            className='h-full'
        >
            <div className='relative space-y-0'>
                {loading ? (
                    <div className='space-y-3'>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className='bg-muted/20 flex animate-pulse items-center gap-3 rounded-2xl p-3'>
                                <div className='bg-muted h-8 w-8 rounded-full' />
                                <div className='flex-1 space-y-2'>
                                    <div className='bg-muted h-3 w-32 rounded' />
                                    <div className='bg-muted h-2.5 w-24 rounded' />
                                </div>
                                <div className='bg-muted h-5 w-14 rounded-full' />
                            </div>
                        ))}
                    </div>
                ) : tasks && tasks.length > 0 ? (
                    <div className='space-y-1'>
                        {tasks.map((task, index) => {
                            const healthy = task.last_run_success && !task.late;
                            const statusLabel = healthy
                                ? t('admin.cron.healthy')
                                : task.late
                                  ? t('admin.cron.late')
                                  : t('admin.cron.failed');
                            return (
                                <div key={task.id} className='group relative flex gap-3'>
                                    <div className='flex w-8 shrink-0 flex-col items-center'>
                                        <div
                                            className={cn(
                                                'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border',
                                                healthy
                                                    ? 'border-green-500/30 bg-green-500/10 text-green-500'
                                                    : task.late
                                                      ? 'border-orange-500/30 bg-orange-500/10 text-orange-500'
                                                      : 'border-red-500/30 bg-red-500/10 text-red-500',
                                            )}
                                        >
                                            {healthy ? (
                                                <CheckCircle2 className='h-3.5 w-3.5' />
                                            ) : task.late ? (
                                                <Clock className='h-3.5 w-3.5' />
                                            ) : (
                                                <XCircle className='h-3.5 w-3.5' />
                                            )}
                                        </div>
                                        {index < tasks.length - 1 && (
                                            <div className='bg-border/60 my-1 min-h-3 w-px flex-1' />
                                        )}
                                    </div>
                                    <div className='bg-muted/10 border-border/40 hover:bg-muted/20 mb-2 flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border p-3 transition-all md:rounded-2xl'>
                                        <div className='min-w-0 flex-1'>
                                            <p className='truncate text-xs font-bold tracking-tight md:text-sm'>
                                                {task.task_name}
                                            </p>
                                            <p className='text-muted-foreground truncate text-[9px] font-bold uppercase opacity-70 md:text-[10px]'>
                                                {task.last_run_at
                                                    ? t('admin.cron.last_run', {
                                                          date: formatRelativeTime(task.last_run_at, {
                                                              ...dateOpts,
                                                              relativeStyle: 'long',
                                                          }),
                                                      })
                                                    : t('admin.cron.last_run', { date: t('admin.cron.never') })}
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                'shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black tracking-wider uppercase md:text-[10px]',
                                                healthy
                                                    ? 'bg-green-500/15 text-green-500'
                                                    : task.late
                                                      ? 'bg-orange-500/15 text-orange-500'
                                                      : 'bg-red-500/15 text-red-500',
                                            )}
                                        >
                                            {statusLabel}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className='py-8 text-center'>
                        <AlertTriangle className='text-muted-foreground/30 mx-auto mb-3 h-10 w-10' />
                        <p className='text-muted-foreground text-sm font-bold italic'>{t('admin.cron.no_tasks')}</p>
                    </div>
                )}
            </div>
        </PageCard>
    );
}
