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

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

type Range = 60 | 360 | 1440;

interface Sample {
    at: number;
    cpu_percent: number | null;
    memory_used_bytes: number | null;
    disk_used_bytes: number;
}

interface WebSpaceResourceGraphsProps {
    uuidShort: string;
    /** Limits in bytes, 0 means unlimited. */
    memoryLimitBytes: number;
    diskLimitBytes: number;
}

const METRICS = [
    { key: 'cpu', color: '#3b82f6' },
    { key: 'memory', color: '#8b5cf6' },
    { key: 'disk', color: '#10b981' },
] as const;

/** CPU, memory and disk for a WebSpace over the last hour, 6 hours or 24 hours (sampled once a minute by the node). */
export function WebSpaceResourceGraphs({ uuidShort, memoryLimitBytes, diskLimitBytes }: WebSpaceResourceGraphsProps) {
    const { t, locale } = useTranslation();
    const [range, setRange] = useState<Range>(60);
    const [samples, setSamples] = useState<Sample[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        axios
            .get(`/api/user/webspaces/${encodeURIComponent(uuidShort)}/utilization/history`, {
                params: { minutes: range },
            })
            .then(({ data }) => {
                if (!cancelled) setSamples(data?.success ? ((data.data?.samples ?? []) as Sample[]) : []);
            })
            .catch(() => {
                if (!cancelled) setSamples([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [uuidShort, range]);

    const rows = useMemo(
        () =>
            samples.map((s) => ({
                t: s.at * 1000,
                cpu: s.cpu_percent ?? 0,
                memory: s.memory_used_bytes ?? 0,
                disk: s.disk_used_bytes,
            })),
        [samples],
    );

    const limits = { cpu: 0, memory: memoryLimitBytes, disk: diskLimitBytes };
    const formatValue = (key: string, value: number) =>
        key === 'cpu' ? `${value.toFixed(1)}%` : formatBytes(value, 1);
    const formatTime = (ms: number) => new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    return (
        <PageCard
            title={t('webSpaces.graphs.title')}
            description={t('webSpaces.graphs.description')}
            icon={LineChartIcon}
            action={
                <div className='bg-muted/40 flex rounded-lg p-0.5 text-xs font-medium'>
                    {([60, 360, 1440] as Range[]).map((r) => (
                        <button
                            key={r}
                            type='button'
                            onClick={() => setRange(r)}
                            className={cn(
                                'rounded-md px-3 py-1 transition-colors',
                                range === r ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                            )}
                        >
                            {t(`webSpaces.graphs.range_${r}`)}
                        </button>
                    ))}
                </div>
            }
        >
            {loading && rows.length === 0 ? (
                <p className='text-muted-foreground py-10 text-center text-sm'>{t('common.loading')}</p>
            ) : rows.length === 0 ? (
                <p className='text-muted-foreground py-10 text-center text-sm'>{t('webSpaces.graphs.empty')}</p>
            ) : (
                <div className='grid gap-4 lg:grid-cols-3'>
                    {METRICS.map((m) => {
                        const limit = limits[m.key];
                        const peak = Math.max(...rows.map((r) => r[m.key]));
                        return (
                            <div key={m.key} className='border-border/50 rounded-xl border p-3'>
                                <div className='mb-2 flex items-baseline justify-between gap-2'>
                                    <span className='text-sm font-semibold'>{t(`webSpaces.graphs.${m.key}`)}</span>
                                    <span className='text-muted-foreground text-xs'>
                                        {t('webSpaces.graphs.peak', { value: formatValue(m.key, peak) })}
                                        {limit > 0 && ` / ${formatValue(m.key, limit)}`}
                                    </span>
                                </div>
                                <div className='h-40'>
                                    <ResponsiveContainer width='100%' height='100%'>
                                        <AreaChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                            <CartesianGrid strokeDasharray='3 3' stroke='currentColor' opacity={0.08} />
                                            <XAxis
                                                dataKey='t'
                                                type='number'
                                                domain={['dataMin', 'dataMax']}
                                                tickFormatter={formatTime}
                                                tick={{ fontSize: 10 }}
                                                minTickGap={40}
                                            />
                                            <YAxis
                                                width={56}
                                                tick={{ fontSize: 10 }}
                                                domain={[0, limit > 0 ? Math.max(limit, peak) : 'auto']}
                                                tickFormatter={(v: number) => formatValue(m.key, v)}
                                            />
                                            <Tooltip
                                                isAnimationActive={false}
                                                labelFormatter={(v) => formatTime(Number(v))}
                                                formatter={(v) => [
                                                    formatValue(m.key, Number(v)),
                                                    t(`webSpaces.graphs.${m.key}`),
                                                ]}
                                                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                            />
                                            {limit > 0 && (
                                                <ReferenceLine y={limit} stroke='#ef4444' strokeDasharray='4 4' />
                                            )}
                                            <Area
                                                type='monotone'
                                                dataKey={m.key}
                                                stroke={m.color}
                                                fill={m.color}
                                                fillOpacity={0.15}
                                                isAnimationActive={false}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </PageCard>
    );
}
