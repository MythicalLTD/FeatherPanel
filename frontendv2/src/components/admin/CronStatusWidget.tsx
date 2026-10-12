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

import { Clock } from 'lucide-react';
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
            id='admin-cron'
            title={t('admin.cron.title')}
            description={t('admin.cron.description')}
            icon={Clock}
            className='scroll-mt-6 space-y-4 p-4 sm:p-5 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child]:pb-4'
        >
            {loading ? (
                <AdminWidgetLoading label={t('admin.cron.title')} rows={2} />
            ) : !tasks ? (
                <p className='text-muted-foreground py-8 text-sm'>{t('admin.system_health.status.unavailable')}</p>
            ) : tasks.length === 0 ? (
                <p className='text-muted-foreground py-8 text-sm'>{t('admin.cron.no_tasks')}</p>
            ) : (
                <div className='divide-border divide-y'>
                    {tasks.map((task) => {
                        const healthy = task.last_run_success && !task.late;
                        const failed = !task.last_run_success;
                        const statusLabel = healthy
                            ? t('admin.cron.healthy')
                            : failed
                              ? t('admin.cron.failed')
                              : t('admin.cron.late');
                        return (
                            <div key={task.id} className='flex flex-wrap items-center justify-between gap-3 py-3'>
                                <div className='min-w-0 flex-1 basis-36 space-y-1'>
                                    <p className='text-sm font-medium wrap-break-word'>{task.task_name}</p>
                                    <p className='text-muted-foreground text-xs leading-relaxed'>
                                        {t('admin.cron.last_run', {
                                            date: task.last_run_at
                                                ? formatRelativeTime(task.last_run_at, {
                                                      ...dateOpts,
                                                      relativeStyle: 'long',
                                                  })
                                                : t('admin.cron.never'),
                                        })}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'rounded-md px-2 py-1 text-xs font-medium',
                                        healthy
                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                            : failed
                                              ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                                              : 'bg-amber-500/10 text-amber-800 dark:text-amber-400',
                                    )}
                                >
                                    {statusLabel}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </PageCard>
    );
}
