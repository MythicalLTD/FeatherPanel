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
                            className='flex items-center justify-between p-4 rounded-2xl bg-muted/20 animate-pulse'
                        >
                            <div className='space-y-2'>
                                <div className='h-4 w-32 bg-muted rounded' />
                                <div className='h-3 w-24 bg-muted rounded' />
                            </div>
                            <div className='h-6 w-16 bg-muted rounded' />
                        </div>
                    ))
                ) : tasks && tasks.length > 0 ? (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl bg-muted/10 border border-border/50 group hover:bg-muted/20 transition-all'
                        >
                            <div className='flex items-center gap-3 min-w-0 flex-1'>
                                <div
                                    className={cn(
                                        'h-9 w-9 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0',
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
                                    <p className='text-xs md:text-sm font-bold tracking-tight truncate'>
                                        {task.task_name}
                                    </p>
                                    <p className='text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold opacity-70 truncate'>
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
                                    'px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wider shrink-0 self-start sm:self-auto',
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
                    <div className='text-center py-8'>
                        <AlertTriangle className='h-12 w-12 text-muted-foreground/30 mx-auto mb-3' />
                        <p className='text-sm text-muted-foreground font-bold italic'>{t('admin.cron.no_tasks')}</p>
                    </div>
                )}
            </div>
        </PageCard>
    );
}
