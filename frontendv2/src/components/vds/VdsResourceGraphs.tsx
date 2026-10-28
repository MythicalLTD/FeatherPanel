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

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    type TooltipContentProps,
} from 'recharts';
import { Activity, Cpu, Database, Globe, HardDrive, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn, formatFileSize } from '@/lib/utils';
import type { VdsTimeframe } from '@/hooks/useVdsFeatures';

interface RrdPoint {
    time: number;
    cpu: number | null;
    maxcpu: number | null;
    mem: number | null;
    maxmem: number | null;
    netin: number | null;
    netout: number | null;
    diskread: number | null;
    diskwrite: number | null;
}

interface Series {
    key: string;
    label: string;
    color: string;
}

interface ChartDef {
    id: string;
    title: string;
    icon: LucideIcon;
    series: Series[];
    format: (v: number) => string;
    domainMax?: number;
}

const PRIMARY = 'hsl(var(--primary))';
/** Second series (outbound / write): a cool accent that reads well next to the primary in both themes. */
const SECONDARY = 'hsl(199 89% 48%)';
const REFRESH_MS: Record<VdsTimeframe, number> = {
    hour: 60_000,
    day: 300_000,
    week: 1_800_000,
    month: 3_600_000,
    year: 3_600_000,
};

const bytesPerSec = (v: number) => `${formatFileSize(Math.max(0, v))}/s`;

function formatTick(ts: number, timeframe: VdsTimeframe): string {
    const d = new Date(ts * 1000);
    if (timeframe === 'hour' || timeframe === 'day') {
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    if (timeframe === 'year') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

/**
 * Resource history per VDS from Proxmox RRD data (GET /api/user/vm-instances/{id}/rrd), with a
 * range selector limited to the admin's maximum timeframe.
 */
export function VdsResourceGraphs({ vmId, timeframes }: { vmId: number; timeframes: VdsTimeframe[] }) {
    const { t } = useTranslation();
    const [timeframe, setTimeframe] = useState<VdsTimeframe>(timeframes[0] ?? 'hour');
    const [points, setPoints] = useState<RrdPoint[] | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${vmId}/rrd`, {
                params: { timeframe },
                timeout: 15_000,
            });
            setPoints((data?.data?.points as RrdPoint[]) ?? []);
            setError(false);
        } catch {
            setError(true);
            setPoints([]);
        } finally {
            setLoading(false);
        }
    }, [vmId, timeframe]);

    useEffect(() => {
        const first = setTimeout(() => void load(), 0);
        const timer = setInterval(() => void load(), REFRESH_MS[timeframe]);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
        };
    }, [load, timeframe]);

    const rows = useMemo(
        () =>
            (points ?? [])
                .filter((p) => p.cpu !== null || p.mem !== null)
                .map((p) => ({
                    time: p.time,
                    cpu: (p.cpu ?? 0) * 100,
                    mem: p.mem ?? 0,
                    netin: p.netin ?? 0,
                    netout: p.netout ?? 0,
                    diskread: p.diskread ?? 0,
                    diskwrite: p.diskwrite ?? 0,
                })),
        [points],
    );
    const maxmem = useMemo(() => {
        const last = [...(points ?? [])].reverse().find((p) => p.maxmem);
        return last?.maxmem ?? undefined;
    }, [points]);

    const charts: ChartDef[] = [
        {
            id: 'cpu',
            title: t('vds.graphs.cpu'),
            icon: Cpu,
            series: [{ key: 'cpu', label: t('vds.graphs.cpu'), color: PRIMARY }],
            format: (v) => `${v.toFixed(1)}%`,
            domainMax: 100,
        },
        {
            id: 'mem',
            title: t('vds.graphs.memory'),
            icon: Database,
            series: [{ key: 'mem', label: t('vds.graphs.memory'), color: PRIMARY }],
            format: (v) => formatFileSize(v),
            domainMax: maxmem,
        },
        {
            id: 'net',
            title: t('vds.graphs.network'),
            icon: Globe,
            series: [
                { key: 'netin', label: t('vds.graphs.inbound'), color: PRIMARY },
                { key: 'netout', label: t('vds.graphs.outbound'), color: SECONDARY },
            ],
            format: bytesPerSec,
        },
        {
            id: 'disk',
            title: t('vds.graphs.disk_io'),
            icon: HardDrive,
            series: [
                { key: 'diskread', label: t('vds.graphs.read'), color: PRIMARY },
                { key: 'diskwrite', label: t('vds.graphs.write'), color: SECONDARY },
            ],
            format: bytesPerSec,
        },
    ];

    return (
        <section className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <h2 className='flex items-center gap-2 text-base font-semibold'>
                    <Activity className='text-muted-foreground h-4 w-4' />
                    {t('vds.graphs.title')}
                </h2>
                <div className='flex items-center gap-2'>
                    <div
                        role='tablist'
                        aria-label={t('vds.graphs.range')}
                        className='border-border bg-muted/30 flex items-center rounded-lg border p-0.5'
                    >
                        {timeframes.map((tf) => (
                            <button
                                key={tf}
                                type='button'
                                role='tab'
                                aria-selected={tf === timeframe}
                                onClick={() => setTimeframe(tf)}
                                className={cn(
                                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                    tf === timeframe
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {t(`vds.graphs.timeframes.${tf}`)}
                            </button>
                        ))}
                    </div>
                    <Button
                        variant='outline'
                        size='icon'
                        className='h-8 w-8'
                        onClick={() => void load()}
                        disabled={loading}
                        aria-label={t('navigation.items.refresh')}
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                    </Button>
                </div>
            </div>
            <div className='grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2'>
                {charts.map((chart) => (
                    <GraphCard
                        key={chart.id}
                        chart={chart}
                        rows={rows}
                        timeframe={timeframe}
                        loading={points === null}
                        empty={error ? t('vds.graphs.error') : t('vds.graphs.no_data')}
                    />
                ))}
            </div>
        </section>
    );
}

function GraphCard({
    chart,
    rows,
    timeframe,
    loading,
    empty,
}: {
    chart: ChartDef;
    rows: Array<Record<string, number>>;
    timeframe: VdsTimeframe;
    loading: boolean;
    empty: string;
}) {
    const { icon: Icon, series, format } = chart;
    const latest = rows.length ? rows[rows.length - 1] : null;
    const tooltip = useMemo(
        () =>
            function GraphTooltip({ active, payload, label }: TooltipContentProps) {
                if (!active || !payload?.length) return null;
                return (
                    <div className='bg-popover/95 border-border space-y-1 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur'>
                        <p className='text-muted-foreground'>{new Date(Number(label) * 1000).toLocaleString()}</p>
                        {payload.map((p) => {
                            const s = series.find((x) => x.key === p.dataKey);
                            return (
                                <p key={String(p.dataKey)} className='flex items-center gap-2 font-medium tabular-nums'>
                                    <span className='h-2 w-2 rounded-full' style={{ backgroundColor: s?.color }} />
                                    <span className='text-muted-foreground'>{s?.label}</span>
                                    <span className='ml-auto pl-3'>{format(Number(p.value ?? 0))}</span>
                                </p>
                            );
                        })}
                    </div>
                );
            },
        [series, format],
    );

    return (
        <div className='fp-surface-solid hover:border-primary/25 min-w-0 rounded-xl border p-4 transition-colors sm:p-5'>
            <div className='mb-3 flex items-center justify-between gap-2'>
                <h3 className='flex min-w-0 items-center gap-2 text-sm font-medium'>
                    <Icon className='text-muted-foreground h-4 w-4 shrink-0' />
                    <span className='truncate'>{chart.title}</span>
                </h3>
                <div className='flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs tabular-nums'>
                    {series.map((s) => (
                        <span key={s.key} className='flex items-center gap-1.5'>
                            <span className='h-2 w-2 rounded-full' style={{ backgroundColor: s.color }} />
                            {series.length > 1 && <span className='text-muted-foreground'>{s.label}</span>}
                            <span className='font-medium'>{latest ? format(latest[s.key] ?? 0) : '-'}</span>
                        </span>
                    ))}
                </div>
            </div>
            <div className='h-[180px] w-full min-w-0'>
                {loading ? (
                    <div className='bg-muted/40 h-full w-full animate-pulse rounded-lg' aria-busy />
                ) : rows.length === 0 ? (
                    <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>{empty}</div>
                ) : (
                    <ResponsiveContainer width='100%' height={180} debounce={80}>
                        <AreaChart data={rows} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                            <defs>
                                {series.map((s) => (
                                    <linearGradient
                                        key={s.key}
                                        id={`vds-g-${chart.id}-${s.key}`}
                                        x1='0'
                                        y1='0'
                                        x2='0'
                                        y2='1'
                                    >
                                        <stop offset='0%' stopColor={s.color} stopOpacity={0.25} />
                                        <stop offset='100%' stopColor={s.color} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' vertical={false} />
                            <XAxis
                                dataKey='time'
                                tickFormatter={(v) => formatTick(Number(v), timeframe)}
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={40}
                            />
                            <YAxis domain={[0, chart.domainMax ?? 'auto']} hide />
                            <Tooltip
                                content={tooltip}
                                isAnimationActive={false}
                                cursor={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.35, strokeDasharray: '4 4' }}
                            />
                            {series.map((s) => (
                                <Area
                                    key={s.key}
                                    type='monotone'
                                    dataKey={s.key}
                                    stroke={s.color}
                                    strokeWidth={1.75}
                                    fill={`url(#vds-g-${chart.id}-${s.key})`}
                                    isAnimationActive={false}
                                    dot={false}
                                    activeDot={{ r: 3, strokeWidth: 0, fill: s.color }}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
