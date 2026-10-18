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

import React, { useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { ModuleBadge } from '@/components/ui/module-badge';
import { cn } from '@/lib/utils';
import type { PanelModule } from '@/lib/modules';
import {
    formatBucketLabel,
    formatCompact,
    formatMegabytes,
    percentChange,
    type KpiBucket,
    type KpiConsumer,
    type KpiNode,
    type KpiOverview,
    type KpiSeriesRow,
    type KpiVdsNode,
} from '@/lib/kpi-overview';

export const SERIES_COLORS = {
    signups: 'hsl(var(--primary))',
    servers: '#10b981',
    webspaces: '#0ea5e9',
    vds: '#8b5cf6',
    activity: '#f59e0b',
    tickets_opened: '#f97316',
    tickets_closed: '#22c55e',
} as const;

type SeriesKey = keyof typeof SERIES_COLORS;

/* ------------------------------------------------------------------------------------------ */
/* Building blocks                                                                            */
/* ------------------------------------------------------------------------------------------ */

export function Panel({
    title,
    description,
    actions,
    className,
    children,
}: {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={cn('fp-surface flex min-w-0 flex-col rounded-xl border p-4 sm:p-5', className)}>
            <div className='mb-4 flex flex-wrap items-start justify-between gap-2'>
                <div className='min-w-0'>
                    <h2 className='text-sm font-semibold sm:text-base'>{title}</h2>
                    {description && <p className='text-muted-foreground mt-0.5 text-xs sm:text-sm'>{description}</p>}
                </div>
                {actions}
            </div>
            <div className='min-w-0 flex-1'>{children}</div>
        </section>
    );
}

function EmptyHint({ children }: { children: ReactNode }) {
    return (
        <div className='text-muted-foreground flex h-full min-h-32 items-center justify-center rounded-lg border border-dashed text-sm'>
            {children}
        </div>
    );
}

function Delta({ current, previous }: { current: number; previous: number }) {
    const { t } = useTranslation();
    const change = percentChange(current, previous);
    if (change === null) {
        return (
            <span className='bg-primary/12 text-primary inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold'>
                <ArrowUpRight className='h-3 w-3' />
                {t('admin.analytics.overview.delta_new')}
            </span>
        );
    }
    const up = change > 0;
    const flat = change === 0;
    const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                flat && 'bg-muted text-muted-foreground',
                up && 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
                !flat && !up && 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
            )}
        >
            <Icon className='h-3 w-3' />
            {`${up ? '+' : ''}${change}%`}
        </span>
    );
}

function Sparkline({ data, dataKey, color }: { data: KpiSeriesRow[]; dataKey: SeriesKey; color: string }) {
    const id = useId().replace(/:/g, '');
    if (data.length < 2) return null;
    return (
        <div className='pointer-events-none h-10 w-full' aria-hidden>
            <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id={`spark-${id}`} x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='0%' stopColor={color} stopOpacity={0.35} />
                            <stop offset='100%' stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type='monotone'
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={1.75}
                        fill={`url(#spark-${id})`}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export function KpiCard({
    icon: Icon,
    label,
    value,
    hint,
    current,
    previous,
    module,
    series,
    seriesKey,
    href,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    hint?: string;
    current?: number;
    previous?: number;
    module?: PanelModule;
    series?: KpiSeriesRow[];
    seriesKey?: SeriesKey;
    href?: string;
}) {
    const body = (
        <>
            <div className='flex items-start justify-between gap-2'>
                <div className='flex min-w-0 items-center gap-2'>
                    <span className='fp-icon-tile flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8'>
                        <Icon className='h-4 w-4' />
                    </span>
                    <span className='text-muted-foreground truncate text-xs font-medium sm:text-sm'>{label}</span>
                </div>
                {module && <ModuleBadge module={module} />}
            </div>
            <div className='mt-3 flex flex-wrap items-end justify-between gap-x-2 gap-y-1'>
                <span className='text-xl font-semibold tracking-tight tabular-nums sm:text-2xl'>{value}</span>
                {current !== undefined && previous !== undefined && <Delta current={current} previous={previous} />}
            </div>
            {hint && <p className='text-muted-foreground mt-1 line-clamp-2 text-xs'>{hint}</p>}
            {series && seriesKey && (
                <div className='mt-2'>
                    <Sparkline data={series} dataKey={seriesKey} color={SERIES_COLORS[seriesKey]} />
                </div>
            )}
        </>
    );
    const className = 'fp-surface flex min-w-0 flex-col rounded-xl border p-3 sm:p-4';
    if (href) {
        return (
            <Link href={href} className={cn(className, 'fp-surface-interactive')}>
                {body}
            </Link>
        );
    }
    return <div className={className}>{body}</div>;
}

interface TooltipEntry {
    name?: unknown;
    value?: unknown;
    color?: string;
    dataKey?: unknown;
}

function ChartTooltip({
    active,
    payload,
    label,
    bucket,
}: {
    active?: boolean;
    payload?: readonly TooltipEntry[];
    label?: unknown;
    bucket: KpiBucket;
}) {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className='bg-popover/95 text-popover-foreground min-w-36 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur'>
            <div className='text-muted-foreground mb-1.5 font-medium'>
                {formatBucketLabel(String(label ?? ''), bucket, true)}
            </div>
            <div className='space-y-1'>
                {payload.map((entry) => (
                    <div key={String(entry.dataKey)} className='flex items-center justify-between gap-4'>
                        <span className='flex items-center gap-1.5'>
                            <span className='h-2 w-2 rounded-full' style={{ backgroundColor: entry.color }} />
                            {String(entry.name ?? '')}
                        </span>
                        <span className='font-semibold tabular-nums'>{formatCompact(Number(entry.value ?? 0))}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const axisProps = {
    tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
    tickLine: false,
    axisLine: false,
} as const;

function LegendChip({
    active,
    color,
    label,
    total,
    onClick,
}: {
    active: boolean;
    color: string;
    label: string;
    total: number;
    onClick: () => void;
}) {
    return (
        <button
            type='button'
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
                active
                    ? 'border-border bg-background/60 text-foreground'
                    : 'border-border/50 text-muted-foreground opacity-60 hover:opacity-100',
            )}
        >
            <span className='h-2 w-2 rounded-full' style={{ backgroundColor: color }} />
            {label}
            <span className='text-muted-foreground tabular-nums'>{formatCompact(total)}</span>
        </button>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Charts                                                                                     */
/* ------------------------------------------------------------------------------------------ */

function useBucketLabel(bucket: KpiBucket): string {
    const { t } = useTranslation();
    return t(`admin.analytics.overview.growth.bucket_${bucket}`);
}

export function GrowthChart({ data }: { data: KpiOverview }) {
    const { t } = useTranslation();
    const bucketLabel = useBucketLabel(data.range.bucket);
    const keys = useMemo(() => {
        const list: { key: SeriesKey; label: string }[] = [
            { key: 'signups', label: t('admin.analytics.overview.growth.signups') },
        ];
        if (data.game) list.push({ key: 'servers', label: t('admin.analytics.overview.growth.servers') });
        if (data.web) list.push({ key: 'webspaces', label: t('admin.analytics.overview.growth.webspaces') });
        if (data.vds) list.push({ key: 'vds', label: t('admin.analytics.overview.growth.vds') });
        return list;
    }, [data.game, data.web, data.vds, t]);
    const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());
    const gid = useId().replace(/:/g, '');

    const totals = useMemo(() => {
        const out: Partial<Record<SeriesKey, number>> = {};
        for (const { key } of keys) out[key] = data.series.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
        return out;
    }, [data.series, keys]);

    const toggle = (key: SeriesKey) =>
        setHidden((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    return (
        <Panel
            title={t('admin.analytics.overview.growth.title')}
            description={t('admin.analytics.overview.growth.description', { bucket: bucketLabel })}
            className='lg:col-span-2'
        >
            <div className='mb-3 flex flex-wrap gap-1.5'>
                {keys.map(({ key, label }) => (
                    <LegendChip
                        key={key}
                        active={!hidden.has(key)}
                        color={SERIES_COLORS[key]}
                        label={label}
                        total={totals[key] ?? 0}
                        onClick={() => toggle(key)}
                    />
                ))}
            </div>
            <div className='h-64 sm:h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart data={data.series} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                        <defs>
                            {keys.map(({ key }) => (
                                <linearGradient key={key} id={`g-${gid}-${key}`} x1='0' y1='0' x2='0' y2='1'>
                                    <stop offset='0%' stopColor={SERIES_COLORS[key]} stopOpacity={0.28} />
                                    <stop offset='100%' stopColor={SERIES_COLORS[key]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid vertical={false} stroke='hsl(var(--border))' strokeOpacity={0.5} />
                        <XAxis
                            dataKey='date'
                            {...axisProps}
                            minTickGap={24}
                            tickFormatter={(v: string) => formatBucketLabel(v, data.range.bucket)}
                        />
                        <YAxis {...axisProps} allowDecimals={false} width={44} />
                        <Tooltip
                            cursor={{ stroke: 'hsl(var(--border))' }}
                            content={(p) => <ChartTooltip {...p} bucket={data.range.bucket} />}
                        />
                        {keys
                            .filter(({ key }) => !hidden.has(key))
                            .map(({ key, label }) => (
                                <Area
                                    key={key}
                                    type='monotone'
                                    dataKey={key}
                                    name={label}
                                    stroke={SERIES_COLORS[key]}
                                    strokeWidth={2}
                                    fill={`url(#g-${gid}-${key})`}
                                    activeDot={{ r: 3 }}
                                />
                            ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Panel>
    );
}

export function ModuleMix({ data }: { data: KpiOverview }) {
    const { t } = useTranslation();
    const slices = [
        data.game && {
            key: 'servers',
            module: 'game' as const,
            label: t('admin.analytics.overview.growth.servers'),
            value: data.game.total,
            color: SERIES_COLORS.servers,
        },
        data.web && {
            key: 'webspaces',
            module: 'web' as const,
            label: t('admin.analytics.overview.growth.webspaces'),
            value: data.web.total,
            color: SERIES_COLORS.webspaces,
        },
        data.vds && {
            key: 'vds',
            module: 'vds' as const,
            label: t('admin.analytics.overview.growth.vds'),
            value: data.vds.total,
            color: SERIES_COLORS.vds,
        },
    ].filter((s): s is Exclude<typeof s, null | false> => Boolean(s));
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    const statuses = data.game?.by_status ?? [];

    return (
        <Panel
            title={t('admin.analytics.overview.mix.title')}
            description={t('admin.analytics.overview.mix.description')}
        >
            {total === 0 ? (
                <EmptyHint>{t('admin.analytics.overview.mix.empty')}</EmptyHint>
            ) : (
                <div className='flex flex-col gap-4'>
                    <div className='relative mx-auto h-40 w-40'>
                        <ResponsiveContainer width='100%' height='100%'>
                            <PieChart>
                                <Pie
                                    data={slices.filter((s) => s.value > 0)}
                                    dataKey='value'
                                    nameKey='label'
                                    innerRadius={52}
                                    outerRadius={72}
                                    paddingAngle={3}
                                    stroke='none'
                                    isAnimationActive={false}
                                >
                                    {slices
                                        .filter((s) => s.value > 0)
                                        .map((s) => (
                                            <Cell key={s.key} fill={s.color} />
                                        ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
                            <span className='text-2xl font-semibold tabular-nums'>{formatCompact(total)}</span>
                            <span className='text-muted-foreground text-xs'>
                                {t('admin.analytics.overview.mix.total')}
                            </span>
                        </div>
                    </div>
                    <ul className='space-y-2'>
                        {slices.map((s) => (
                            <li key={s.key} className='flex items-center justify-between gap-2 text-sm'>
                                <span className='flex min-w-0 items-center gap-2'>
                                    <span
                                        className='h-2.5 w-2.5 shrink-0 rounded-full'
                                        style={{ backgroundColor: s.color }}
                                    />
                                    <span className='truncate'>{s.label}</span>
                                    <ModuleBadge module={s.module} />
                                </span>
                                <span className='font-medium tabular-nums'>{formatCompact(s.value)}</span>
                            </li>
                        ))}
                    </ul>
                    {statuses.length > 0 && (
                        <div className='border-t pt-3'>
                            <div className='text-muted-foreground mb-2 text-xs font-medium'>
                                {t('admin.analytics.overview.status.title')}
                            </div>
                            <div className='flex flex-wrap gap-1.5'>
                                {statuses.map((s) => (
                                    <span
                                        key={s.status}
                                        className='fp-surface-inset inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs'
                                    >
                                        <span className='capitalize'>{s.status}</span>
                                        <span className='text-muted-foreground tabular-nums'>{s.count}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Panel>
    );
}

function CapacityBar({
    label,
    allocated,
    capacity,
    percent,
    limit,
}: {
    label: string;
    allocated: number;
    capacity: number;
    percent: number | null;
    limit: number | null;
}) {
    const { t } = useTranslation();
    const pct = percent ?? 0;
    // The bar spans up to 150% so overcommit stays visible; the 100% mark is the physical capacity.
    const scale = Math.max(150, Math.min(pct, 300));
    const width = Math.min(100, (pct / scale) * 100);
    const capacityMark = (100 / scale) * 100;
    const limitPct = limit && capacity > 0 ? (limit / capacity) * 100 : null;
    const tone = pct > 100 ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500';

    return (
        <div>
            <div className='mb-1 flex items-baseline justify-between gap-2 text-xs'>
                <span className='text-muted-foreground'>{label}</span>
                <span className='tabular-nums'>
                    <span className={cn('font-semibold', pct > 100 && 'text-rose-500')}>
                        {percent === null ? t('admin.analytics.overview.kpi.none') : `${pct}%`}
                    </span>
                    <span className='text-muted-foreground'>{` ${formatMegabytes(allocated)} / ${formatMegabytes(capacity)}`}</span>
                </span>
            </div>
            <div
                className='bg-muted/60 relative h-2 overflow-hidden rounded-full'
                title={
                    limitPct === null
                        ? t('admin.analytics.overview.capacity.unlimited')
                        : t('admin.analytics.overview.capacity.limit', { value: `${Math.round(limitPct)}%` })
                }
            >
                <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${width}%` }} />
                <div className='bg-foreground/50 absolute inset-y-0 w-px' style={{ left: `${capacityMark}%` }} />
                {limitPct !== null && limitPct > 100 && (
                    <div
                        className='absolute inset-y-0 w-px bg-amber-400/80'
                        style={{ left: `${Math.min(100, (limitPct / scale) * 100)}%` }}
                    />
                )}
            </div>
        </div>
    );
}

function NodeRow({ node }: { node: KpiNode }) {
    const { t } = useTranslation();
    return (
        <li className='fp-surface-inset rounded-lg border p-3'>
            <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
                <span className='flex min-w-0 items-center gap-2'>
                    <span className='truncate text-sm font-medium'>{node.name}</span>
                    <ModuleBadge module={node.type} />
                    {node.overcommitted && (
                        <span className='inline-flex items-center gap-1 rounded-full bg-rose-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400'>
                            <TriangleAlert className='h-3 w-3' />
                            {t('admin.analytics.overview.capacity.overcommitted')}
                        </span>
                    )}
                </span>
                <span className='text-muted-foreground text-xs'>
                    {t(
                        node.type === 'game'
                            ? 'admin.analytics.overview.capacity.servers'
                            : 'admin.analytics.overview.capacity.webspaces',
                        { count: String(node.items) },
                    )}
                </span>
            </div>
            <div className='grid gap-2 sm:grid-cols-2'>
                <CapacityBar
                    label={t('admin.analytics.overview.capacity.memory')}
                    allocated={node.memory_allocated}
                    capacity={node.memory}
                    percent={node.memory_percent}
                    limit={node.memory_limit}
                />
                <CapacityBar
                    label={t('admin.analytics.overview.capacity.disk')}
                    allocated={node.disk_allocated}
                    capacity={node.disk}
                    percent={node.disk_percent}
                    limit={node.disk_limit}
                />
            </div>
        </li>
    );
}

export function NodeCapacity({ data }: { data: KpiOverview }) {
    const { t } = useTranslation();
    const nodes: KpiNode[] = [...(data.game?.nodes ?? []), ...(data.web?.nodes ?? [])].sort(
        (a, b) =>
            Math.max(b.memory_percent ?? 0, b.disk_percent ?? 0) - Math.max(a.memory_percent ?? 0, a.disk_percent ?? 0),
    );
    const vdsNodes: KpiVdsNode[] = data.vds?.nodes ?? [];

    return (
        <Panel
            title={t('admin.analytics.overview.capacity.title')}
            description={t('admin.analytics.overview.capacity.description')}
            className='lg:col-span-2'
        >
            {nodes.length === 0 && vdsNodes.length === 0 ? (
                <EmptyHint>{t('admin.analytics.overview.capacity.empty')}</EmptyHint>
            ) : (
                <div className='space-y-4'>
                    {nodes.length > 0 && (
                        <ul className='max-h-96 space-y-2 overflow-y-auto pr-1'>
                            {nodes.map((n) => (
                                <NodeRow key={`${n.type}-${n.id}`} node={n} />
                            ))}
                        </ul>
                    )}
                    {vdsNodes.length > 0 && (
                        <div>
                            <div className='mb-2 flex items-center gap-2 text-xs font-medium'>
                                {t('admin.analytics.overview.capacity.vds_nodes')}
                                <ModuleBadge module='vds' />
                            </div>
                            <p className='text-muted-foreground mb-2 text-xs'>
                                {t('admin.analytics.overview.capacity.vds_note')}
                            </p>
                            <ul className='grid gap-2 sm:grid-cols-2'>
                                {vdsNodes.map((n) => (
                                    <li
                                        key={n.id}
                                        className='fp-surface-inset flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm'
                                    >
                                        <span className='truncate font-medium'>{n.name}</span>
                                        <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>
                                            {`${t('admin.analytics.overview.capacity.instances', { count: String(n.instances) })}, ${formatMegabytes(n.memory_allocated)}`}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </Panel>
    );
}

export function TopConsumers({ data }: { data: KpiOverview }) {
    const { t } = useTranslation();
    const rows: KpiConsumer[] = data.top_consumers;
    const max = Math.max(1, ...rows.map((r) => r.memory));

    return (
        <Panel
            title={t('admin.analytics.overview.consumers.title')}
            description={t('admin.analytics.overview.consumers.description')}
        >
            {rows.length === 0 ? (
                <EmptyHint>{t('admin.analytics.overview.consumers.empty')}</EmptyHint>
            ) : (
                <ol className='space-y-2.5'>
                    {rows.map((r, i) => (
                        <li key={r.uuid}>
                            <Link
                                href={`/admin/users/${r.uuid}/edit`}
                                className='hover:bg-muted/40 -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors'
                            >
                                <span className='text-muted-foreground w-4 shrink-0 text-xs tabular-nums'>{i + 1}</span>
                                {r.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={r.avatar} alt='' className='h-7 w-7 shrink-0 rounded-full object-cover' />
                                ) : (
                                    <span className='bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase'>
                                        {r.username.slice(0, 1)}
                                    </span>
                                )}
                                <span className='min-w-0 flex-1'>
                                    <span className='flex items-center justify-between gap-2'>
                                        <span className='truncate text-sm font-medium'>{r.username}</span>
                                        <span className='shrink-0 text-xs font-semibold tabular-nums'>
                                            {formatMegabytes(r.memory)}
                                        </span>
                                    </span>
                                    <span className='mt-1 flex items-center gap-2'>
                                        <span className='bg-muted/60 h-1.5 flex-1 overflow-hidden rounded-full'>
                                            <span
                                                className='bg-primary block h-full rounded-full'
                                                style={{ width: `${(r.memory / max) * 100}%` }}
                                            />
                                        </span>
                                        <span className='text-muted-foreground flex shrink-0 gap-1.5 text-[11px] tabular-nums'>
                                            {data.game && r.servers > 0 && <span>{`${r.servers} GAME`}</span>}
                                            {data.web && r.webspaces > 0 && <span>{`${r.webspaces} WEB`}</span>}
                                            {data.vds && r.vds > 0 && <span>{`${r.vds} VDS`}</span>}
                                        </span>
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ol>
            )}
        </Panel>
    );
}

export function TicketsChart({ data }: { data: KpiOverview }) {
    const { t } = useTranslation();
    const bucketLabel = useBucketLabel(data.range.bucket);
    if (!data.tickets) return null;
    const empty = data.tickets.opened === 0 && data.tickets.closed === 0;

    return (
        <Panel
            title={t('admin.analytics.overview.tickets.title')}
            description={t('admin.analytics.overview.tickets.description', { bucket: bucketLabel })}
        >
            {empty ? (
                <EmptyHint>{t('admin.analytics.overview.tickets.empty')}</EmptyHint>
            ) : (
                <div className='h-56'>
                    <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={data.series} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barGap={2}>
                            <CartesianGrid vertical={false} stroke='hsl(var(--border))' strokeOpacity={0.5} />
                            <XAxis
                                dataKey='date'
                                {...axisProps}
                                minTickGap={24}
                                tickFormatter={(v: string) => formatBucketLabel(v, data.range.bucket)}
                            />
                            <YAxis {...axisProps} allowDecimals={false} width={44} />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                                content={(p) => <ChartTooltip {...p} bucket={data.range.bucket} />}
                            />
                            <Bar
                                dataKey='tickets_opened'
                                name={t('admin.analytics.overview.tickets.opened')}
                                fill={SERIES_COLORS.tickets_opened}
                                radius={[3, 3, 0, 0]}
                            />
                            <Bar
                                dataKey='tickets_closed'
                                name={t('admin.analytics.overview.tickets.closed')}
                                fill={SERIES_COLORS.tickets_closed}
                                radius={[3, 3, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Panel>
    );
}

export function ActivityPanel({ data }: { data: KpiOverview }) {
    const { t } = useTranslation();
    const bucketLabel = useBucketLabel(data.range.bucket);
    const gid = useId().replace(/:/g, '');
    const top = data.activity.top_events;
    const max = Math.max(1, ...top.map((e) => e.count));

    return (
        <Panel
            title={t('admin.analytics.overview.activity.title')}
            description={t('admin.analytics.overview.activity.description', { bucket: bucketLabel })}
            className={data.tickets ? undefined : 'lg:col-span-2'}
        >
            {data.activity.total === 0 ? (
                <EmptyHint>{t('admin.analytics.overview.activity.empty')}</EmptyHint>
            ) : (
                <div className='space-y-4'>
                    <div className='h-36'>
                        <ResponsiveContainer width='100%' height='100%'>
                            <AreaChart data={data.series} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                                <defs>
                                    <linearGradient id={`a-${gid}`} x1='0' y1='0' x2='0' y2='1'>
                                        <stop offset='0%' stopColor={SERIES_COLORS.activity} stopOpacity={0.3} />
                                        <stop offset='100%' stopColor={SERIES_COLORS.activity} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey='date'
                                    {...axisProps}
                                    minTickGap={24}
                                    tickFormatter={(v: string) => formatBucketLabel(v, data.range.bucket)}
                                />
                                <YAxis {...axisProps} allowDecimals={false} width={44} />
                                <Tooltip
                                    cursor={{ stroke: 'hsl(var(--border))' }}
                                    content={(p) => <ChartTooltip {...p} bucket={data.range.bucket} />}
                                />
                                <Area
                                    type='monotone'
                                    dataKey='activity'
                                    name={t('admin.analytics.overview.activity.events')}
                                    stroke={SERIES_COLORS.activity}
                                    strokeWidth={2}
                                    fill={`url(#a-${gid})`}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div>
                        <div className='text-muted-foreground mb-2 text-xs font-medium'>
                            {t('admin.analytics.overview.activity.top')}
                        </div>
                        <ul className='space-y-1.5'>
                            {top.slice(0, 6).map((e) => (
                                <li key={e.name} className='relative overflow-hidden rounded-md px-2 py-1 text-xs'>
                                    <span
                                        className='absolute inset-y-0 left-0 rounded-md bg-amber-500/12'
                                        style={{ width: `${(e.count / max) * 100}%` }}
                                    />
                                    <span className='relative flex items-center justify-between gap-2'>
                                        <span className='truncate font-mono'>{e.name}</span>
                                        <span className='font-semibold tabular-nums'>{formatCompact(e.count)}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </Panel>
    );
}
