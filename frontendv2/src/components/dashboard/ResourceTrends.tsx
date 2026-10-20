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

import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Sparkline } from '@/components/ui/sparkline';
import { formatCpu, formatDisk, formatMemory } from '@/lib/server-utils';
import { cn } from '@/lib/utils';
import { summarize, toSeries, type DashboardResourceHistory, type ResourceMetric } from '@/lib/resource-history';
import { Quiet, WidgetSkeleton } from '@/components/dashboard/DashboardWidgets';

const FORMAT: Record<ResourceMetric, (value: number) => string> = {
    cpu: formatCpu,
    memory: formatMemory,
    disk: formatDisk,
};

const METRIC_LABEL_KEYS: Record<ResourceMetric, string> = {
    cpu: 'dashboard.home.meters.cpu',
    memory: 'dashboard.home.meters.ram',
    disk: 'dashboard.home.meters.disk',
};

const STRIP_LABEL_KEYS: Record<'cpu' | 'memory', string> = {
    cpu: 'dashboard.trends.cpu_24h',
    memory: 'dashboard.trends.ram_24h',
};

const TONE: Record<ResourceMetric, string> = {
    cpu: 'text-primary',
    memory: 'text-sky-500',
    disk: 'text-violet-500',
};

interface TrendStripProps {
    cpu: ReadonlyArray<number | null> | null | undefined;
    memory: ReadonlyArray<number | null> | null | undefined;
    /** Limits for the scale; 0 means unlimited, so the line scales to its own peak. */
    cpuLimit?: number;
    memoryLimit?: number;
    size?: 'card' | 'header';
    className?: string;
}

/** CPU and RAM over the last 24 hours, side by side. Renders nothing until there is history. */
export function ResourceTrendStrip({
    cpu,
    memory,
    cpuLimit = 0,
    memoryLimit = 0,
    size = 'card',
    className,
}: TrendStripProps) {
    const { t } = useTranslation();
    const items = (
        [
            ['cpu', cpu, cpuLimit],
            ['memory', memory, memoryLimit],
        ] as const
    )
        .map(([metric, values, limit]) => ({ metric, values, limit, summary: values ? summarize(values) : null }))
        .filter((item) => item.summary !== null && item.values);
    if (items.length === 0) return null;

    const prepared = items.map(({ metric, values, limit, summary }) => {
        const peak = FORMAT[metric](summary!.peak);
        const average = FORMAT[metric](summary!.average);
        return { metric, values: values!, limit, peak, average };
    });

    if (size === 'card') {
        // Narrow cards: one row per metric with a shared caption, so nothing truncates.
        return (
            <div className={cn('space-y-1', className)}>
                <div className='text-muted-foreground flex justify-between text-[10px]'>
                    <span>{t('dashboard.trends.last_24h')}</span>
                    <span>{t('dashboard.trends.peak_label')}</span>
                </div>
                {prepared.map(({ metric, values, limit, peak, average }) => (
                    <div key={metric} className='grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2'>
                        <span className='text-muted-foreground text-[10px] font-medium'>
                            {t(METRIC_LABEL_KEYS[metric])}
                        </span>
                        <Sparkline
                            values={values}
                            max={limit > 0 ? limit : undefined}
                            label={t('dashboard.trends.chart_label', {
                                metric: t(STRIP_LABEL_KEYS[metric]),
                                peak,
                                average,
                            })}
                            className={cn('h-5', TONE[metric])}
                        />
                        <span className='text-[10px] font-medium tabular-nums'>{peak}</span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={cn('grid grid-cols-2 gap-3', className)}>
            {prepared.map(({ metric, values, limit, peak, average }) => {
                const name = t(STRIP_LABEL_KEYS[metric]);
                return (
                    <div key={metric} className='min-w-0'>
                        <div className='text-muted-foreground flex items-baseline justify-between gap-2 text-[11px]'>
                            <span className='truncate'>{name}</span>
                            <span className='shrink-0 tabular-nums'>{t('dashboard.trends.peak', { value: peak })}</span>
                        </div>
                        <Sparkline
                            values={values}
                            max={limit > 0 ? limit : undefined}
                            label={t('dashboard.trends.chart_label', { metric: name, peak, average })}
                            className={cn('mt-1 h-9', TONE[metric])}
                        />
                    </div>
                );
            })}
        </div>
    );
}

/** Dashboard card: total CPU, RAM or disk across the user's servers over the last 24 hours. */
export function TrendsWidget({
    history,
    loading,
    limits,
}: {
    history: DashboardResourceHistory | null;
    loading: boolean;
    /** Summed limits from the overview (0 = unlimited somewhere, scale to the data instead). */
    limits: Record<ResourceMetric, number>;
}) {
    const { t } = useTranslation();
    const [metric, setMetric] = useState<ResourceMetric>('cpu');

    const series = useMemo(() => (history ? toSeries(history.totals, history, metric) : null), [history, metric]);
    const summary = series ? summarize(series) : null;

    if (loading && !history) return <WidgetSkeleton rows={3} />;

    const format = FORMAT[metric];
    const limit = limits[metric];
    const name = t(METRIC_LABEL_KEYS[metric]);

    return (
        <section className='fp-surface min-w-0 overflow-hidden rounded-xl border'>
            <header className='flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 pb-2.5'>
                <div className='flex min-w-0 items-center gap-2'>
                    <TrendingUp className='text-muted-foreground h-4 w-4 shrink-0' aria-hidden />
                    <h2 className='truncate text-sm font-semibold'>{t('dashboard.widgets.names.trends')}</h2>
                    <span className='text-muted-foreground hidden text-xs sm:inline'>
                        {t('dashboard.trends.last_24h')}
                    </span>
                </div>
                <div
                    role='radiogroup'
                    aria-label={t('dashboard.widgets.heatmap.metric')}
                    className='bg-muted/50 inline-flex rounded-lg p-0.5'
                >
                    {(['cpu', 'memory', 'disk'] as const).map((m) => (
                        <button
                            key={m}
                            type='button'
                            role='radio'
                            aria-checked={metric === m}
                            onClick={() => setMetric(m)}
                            className={cn(
                                'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors',
                                metric === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                            )}
                        >
                            {t(METRIC_LABEL_KEYS[m])}
                        </button>
                    ))}
                </div>
            </header>
            <div className='px-4 pb-4'>
                {!series || !summary ? (
                    <Quiet>{t('dashboard.trends.empty')}</Quiet>
                ) : (
                    <>
                        <dl className='grid grid-cols-3 gap-2'>
                            {(
                                [
                                    ['dashboard.trends.now', summary.latest ?? 0],
                                    ['dashboard.trends.average', summary.average],
                                    ['dashboard.trends.peak_label', summary.peak],
                                ] as const
                            ).map(([key, value]) => (
                                <div key={key} className='fp-surface-inset min-w-0 rounded-lg px-2.5 py-1.5'>
                                    <dt className='text-muted-foreground truncate text-[11px]'>{t(key)}</dt>
                                    <dd className='truncate text-sm font-semibold tabular-nums'>{format(value)}</dd>
                                </div>
                            ))}
                        </dl>
                        {limit > 0 && (
                            <p className='text-muted-foreground mt-2 text-right text-[10px] tabular-nums'>
                                {t('dashboard.trends.scale', { limit: format(limit) })}
                            </p>
                        )}
                        <Sparkline
                            values={series}
                            max={limit > 0 ? Math.max(limit, summary.peak) : undefined}
                            label={t('dashboard.trends.chart_label', {
                                metric: name,
                                peak: format(summary.peak),
                                average: format(summary.average),
                            })}
                            className={cn('h-28', limit > 0 ? 'mt-1' : 'mt-3', TONE[metric])}
                        />
                        <div className='text-muted-foreground mt-1.5 flex justify-between text-[10px]'>
                            <span>{t('dashboard.trends.ago_24h')}</span>
                            <span>{t('dashboard.trends.ago_12h')}</span>
                            <span>{t('dashboard.trends.now')}</span>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
