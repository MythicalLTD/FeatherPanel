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
import type { ResourcePoint, ServerResourceHistory } from '@/lib/resource-history';

type Range = '24h' | '7d';

interface ServerResourceGraphsProps {
    uuidShort: string;
    /** Limits as configured on the server: CPU in percent, memory and disk in MiB. 0 means unlimited. */
    cpuLimit: number;
    memoryLimit: number;
    diskLimit: number;
}

const METRICS = [
    { key: 'cpu', index: 1, color: '#3b82f6' },
    { key: 'memory', index: 2, color: '#8b5cf6' },
    { key: 'disk', index: 3, color: '#10b981' },
] as const;

/** CPU, memory and disk over the last 24 hours or 7 days, with the server limits drawn in. */
export function ServerResourceGraphs({ uuidShort, cpuLimit, memoryLimit, diskLimit }: ServerResourceGraphsProps) {
    const { t, locale } = useTranslation();
    const [range, setRange] = useState<Range>('24h');
    const [data, setData] = useState<ServerResourceHistory | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        axios
            .get(`/api/user/servers/${encodeURIComponent(uuidShort)}/resource-history`, { params: { range } })
            .then(({ data: body }) => {
                if (!cancelled && body?.success) setData(body.data as ServerResourceHistory);
            })
            .catch(() => {
                if (!cancelled) setData(null);
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
            (data?.points ?? []).map((p: ResourcePoint) => ({
                t: p[0] * 1000,
                cpu: p[1],
                memory: p[2],
                disk: p[3],
            })),
        [data],
    );

    const limits: Record<(typeof METRICS)[number]['key'], number> = {
        cpu: cpuLimit,
        memory: memoryLimit * 1024 * 1024,
        disk: diskLimit * 1024 * 1024,
    };

    const formatValue = (key: string, value: number) =>
        key === 'cpu' ? `${value.toFixed(1)}%` : formatBytes(value, 1);
    const formatTime = (ms: number) =>
        new Date(ms).toLocaleString(
            locale,
            range === '24h' ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'short', hour: '2-digit' },
        );

    return (
        <PageCard
            title={t('servers.console.graphs.title')}
            description={t('servers.console.graphs.description')}
            icon={LineChartIcon}
            action={
                <div className='bg-muted/40 flex rounded-lg p-0.5 text-xs font-medium'>
                    {(['24h', '7d'] as Range[]).map((r) => (
                        <button
                            key={r}
                            type='button'
                            onClick={() => setRange(r)}
                            className={cn(
                                'rounded-md px-3 py-1 transition-colors',
                                range === r ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                            )}
                        >
                            {t(`servers.console.graphs.range_${r}`)}
                        </button>
                    ))}
                </div>
            }
        >
            {loading && rows.length === 0 ? (
                <p className='text-muted-foreground py-10 text-center text-sm'>{t('common.loading')}</p>
            ) : rows.length === 0 ? (
                <p className='text-muted-foreground py-10 text-center text-sm'>{t('servers.console.graphs.empty')}</p>
            ) : (
                <div className='grid gap-4 lg:grid-cols-3'>
                    {METRICS.map((m) => {
                        const limit = limits[m.key];
                        const peak = Math.max(...rows.map((r) => r[m.key]));
                        return (
                            <div key={m.key} className='border-border/50 rounded-xl border p-3'>
                                <div className='mb-2 flex items-baseline justify-between gap-2'>
                                    <span className='text-sm font-semibold'>
                                        {t(`servers.console.graphs.${m.key}`)}
                                    </span>
                                    <span className='text-muted-foreground text-xs'>
                                        {t('servers.console.graphs.peak', { value: formatValue(m.key, peak) })}
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
                                                    t(`servers.console.graphs.${m.key}`),
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
