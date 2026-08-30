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

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Activity, AlertTriangle, BarChart3, Globe, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { Button } from '@/components/featherui/Button';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { parseWebSpaceUtilization, type WebSpaceUtilization } from '@/components/webspace/WebSpaceInfoCards';
import { cn, formatFileSize } from '@/lib/utils';

interface AnalyticsSummary {
    total: number;
    by_day: { date: string; count: number }[];
    top_events: { event: string; count: number }[];
}

interface TrafficDay {
    date: string;
    hits: number;
    bytes: number;
}

interface TrafficFile {
    domain: string;
    hits: number;
    bytes: number;
    access_present?: boolean;
}

interface TrafficSummary {
    hits: number;
    bytes: number;
    status: Record<string, number>;
    files: TrafficFile[];
    by_day?: TrafficDay[];
}

function fillDaySeries(rows: TrafficDay[], days: number): TrafficDay[] {
    const map = new Map(rows.map((r) => [r.date, r]));
    const out: TrafficDay[] = [];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(end.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        out.push(map.get(key) ?? { date: key, hits: 0, bytes: 0 });
    }
    return out;
}

function groupStatusCodes(status: Record<string, number>) {
    const groups = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 };
    for (const [code, count] of Object.entries(status)) {
        const n = Number(code);
        if (n >= 200 && n < 300) groups['2xx'] += count;
        else if (n >= 300 && n < 400) groups['3xx'] += count;
        else if (n >= 400 && n < 500) groups['4xx'] += count;
        else if (n >= 500 && n < 600) groups['5xx'] += count;
        else groups.other += count;
    }
    return groups;
}

function statusGroupColor(group: string) {
    if (group === '2xx') return 'bg-emerald-500';
    if (group === '3xx') return 'bg-sky-500';
    if (group === '4xx') return 'bg-amber-500';
    if (group === '5xx') return 'bg-red-500';
    return 'bg-muted-foreground';
}

function formatEventLabel(event: string) {
    return event
        .replace(/_/g, ' ')
        .replace(/[.:]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function StatCard({
    label,
    value,
    hint,
    className,
}: {
    label: string;
    value: string;
    hint?: string;
    className?: string;
}) {
    return (
        <div className={cn('border-border/50 bg-card/50 rounded-xl border p-5 backdrop-blur-xl', className)}>
            <p className='text-3xl font-semibold tracking-tight'>{value}</p>
            <p className='text-muted-foreground mt-1 text-sm'>{label}</p>
            {hint ? <p className='text-muted-foreground/80 mt-2 text-xs'>{hint}</p> : null}
        </div>
    );
}

function DayBars({
    rows,
    valueKey,
    max,
    barClassName,
}: {
    rows: { date: string; hits?: number; bytes?: number; count?: number }[];
    valueKey: 'hits' | 'bytes' | 'count';
    max: number;
    barClassName?: string;
}) {
    return (
        <div className='flex h-36 items-end gap-1'>
            {rows.map((row) => {
                const value = Number(row[valueKey] ?? 0);
                const height = max > 0 ? Math.max(value > 0 ? 8 : 2, (value / max) * 100) : 2;
                const label = row.date.slice(5);
                return (
                    <div key={row.date} className='group flex min-w-0 flex-1 flex-col items-center gap-1'>
                        <div className='relative flex h-full w-full items-end'>
                            <div
                                className={cn(
                                    'bg-primary/80 group-hover:bg-primary mx-auto w-full max-w-4 rounded-t transition-colors',
                                    barClassName,
                                )}
                                style={{ height: `${height}%` }}
                                title={`${row.date}: ${value.toLocaleString()}`}
                            />
                        </div>
                        <span className='text-muted-foreground hidden truncate font-mono text-[10px] sm:block'>
                            {label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export default function WebSpaceAnalyticsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const [days, setDays] = useState('30');
    const [domain, setDomain] = useState('');
    const [domains, setDomains] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [traffic, setTraffic] = useState<TrafficSummary | null>(null);
    const [trafficError, setTrafficError] = useState<string | null>(null);
    const [util, setUtil] = useState<WebSpaceUtilization | null>(null);

    const dayCount = Number(days) || 30;

    const loadDomains = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}`);
            const list = Array.isArray(data?.data?.webspace?.domains)
                ? (data.data.webspace.domains as string[]).filter(Boolean)
                : [];
            setDomains(list);
            setDomain((current) => (current && list.includes(current) ? current : ''));
        } catch {
            setDomains([]);
        }
    }, [uuidShort]);

    const load = useCallback(
        async (silent = false) => {
            if (silent) setRefreshing(true);
            else setLoading(true);
            try {
                const [analyticsRes, utilRes] = await Promise.all([
                    axios.get(`/api/user/webspaces/${uuidShort}/analytics`, {
                        params: {
                            days: dayCount,
                            domain: domain || undefined,
                        },
                    }),
                    axios.get(`/api/user/webspaces/${uuidShort}/utilization`).catch(() => null),
                ]);
                setSummary((analyticsRes?.data?.data?.summary as AnalyticsSummary) ?? null);
                setTraffic((analyticsRes?.data?.data?.traffic as TrafficSummary) ?? null);
                setTrafficError(
                    typeof analyticsRes?.data?.data?.traffic_error === 'string'
                        ? analyticsRes.data.data.traffic_error
                        : null,
                );
                if (utilRes?.data?.data) setUtil(parseWebSpaceUtilization(utilRes.data.data));
            } catch {
                setSummary(null);
                setTraffic(null);
                setTrafficError(t('webSpaces.analytics.loadFailed'));
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [uuidShort, dayCount, domain, t],
    );

    useEffect(() => {
        void loadDomains();
    }, [loadDomains]);

    useEffect(() => {
        void load();
    }, [load]);

    const trafficDays = useMemo(() => fillDaySeries(traffic?.by_day ?? [], dayCount), [traffic?.by_day, dayCount]);
    const activityDays = useMemo(() => {
        const rows = summary?.by_day ?? [];
        const map = new Map(rows.map((r) => [r.date, r.count]));
        const out: { date: string; count: number }[] = [];
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        for (let i = dayCount - 1; i >= 0; i--) {
            const d = new Date(end);
            d.setDate(end.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            out.push({ date: key, count: map.get(key) ?? 0 });
        }
        return out;
    }, [summary?.by_day, dayCount]);

    const maxTrafficHits = Math.max(1, ...trafficDays.map((d) => d.hits));
    const maxActivity = Math.max(1, ...activityDays.map((d) => d.count));

    const statusGroups = useMemo(() => groupStatusCodes(traffic?.status ?? {}), [traffic?.status]);
    const statusRows = useMemo(() => {
        return Object.entries(traffic?.status ?? {}).sort(([a], [b]) => Number(a) - Number(b));
    }, [traffic?.status]);
    const maxStatusCount = Math.max(1, ...statusRows.map(([, count]) => count));

    const totalHits = traffic?.hits ?? 0;
    const totalBytes = traffic?.bytes ?? 0;
    const errorHits = statusGroups['4xx'] + statusGroups['5xx'];
    const errorRate = totalHits > 0 ? ((errorHits / totalHits) * 100).toFixed(1) : '0';
    const avgHitsPerDay = dayCount > 0 ? Math.round(totalHits / dayCount) : 0;

    const domainRows = useMemo(() => {
        const files = traffic?.files ?? [];
        return [...files].sort((a, b) => b.hits - a.hits);
    }, [traffic?.files]);

    const bandwidthUsed = util?.bandwidth_used_bytes ?? null;
    const bandwidthLimit = util?.bandwidth_limit_bytes ?? null;
    const bandwidthPct =
        bandwidthUsed != null && bandwidthLimit && bandwidthLimit > 0
            ? Math.min(100, (bandwidthUsed / bandwidthLimit) * 100)
            : null;

    const hasTraffic = totalHits > 0 || totalBytes > 0 || trafficDays.some((d) => d.hits > 0);
    const hasActivity = (summary?.total ?? 0) > 0;

    return (
        <WebSpacePageWidgets pageId='webspace-analytics'>
            <div className='space-y-8 pb-12'>
                <PageHeader
                    title={t('webSpaces.analytics.title')}
                    description={t('webSpaces.analytics.description')}
                    actions={
                        <div className='flex flex-wrap items-center gap-2'>
                            {domains.length > 0 ? (
                                <HeadlessSelect
                                    value={domain || '__all__'}
                                    onChange={(val) => setDomain(val === '__all__' ? '' : String(val))}
                                    options={[
                                        { id: '__all__', name: t('webSpaces.analytics.allDomains') },
                                        ...domains.map((d) => ({ id: d, name: d })),
                                    ]}
                                />
                            ) : null}
                            <HeadlessSelect
                                value={days}
                                onChange={(val) => setDays(String(val))}
                                options={[
                                    { id: '7', name: `7 ${t('webSpaces.analytics.days')}` },
                                    { id: '30', name: `30 ${t('webSpaces.analytics.days')}` },
                                    { id: '90', name: `90 ${t('webSpaces.analytics.days')}` },
                                ]}
                            />
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => void load(true)}
                                disabled={loading || refreshing}
                            >
                                <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
                                {t('common.refresh')}
                            </Button>
                        </div>
                    }
                />

                {loading ? (
                    <div className='flex flex-col items-center justify-center py-24'>
                        <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                        <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
                    </div>
                ) : (
                    <>
                        {trafficError ? (
                            <div className='flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100'>
                                <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
                                <div>
                                    <p className='font-medium'>{t('webSpaces.analytics.trafficUnavailable')}</p>
                                    <p className='opacity-80'>{trafficError}</p>
                                </div>
                            </div>
                        ) : null}

                        <section className='space-y-4'>
                            <div className='flex items-center gap-2'>
                                <Globe className='text-primary h-5 w-5' />
                                <h2 className='text-lg font-semibold'>{t('webSpaces.analytics.trafficSection')}</h2>
                            </div>

                            {!hasTraffic ? (
                                <EmptyState
                                    icon={BarChart3}
                                    title={t('webSpaces.analytics.noTrafficTitle')}
                                    description={t('webSpaces.analytics.noTrafficDescription')}
                                    action={
                                        <Button variant='outline' asChild>
                                            <Link href={`/webspace/${uuidShort}/logs`}>
                                                {t('webSpaces.analytics.viewLogs')}
                                            </Link>
                                        </Button>
                                    }
                                />
                            ) : (
                                <>
                                    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                                        <StatCard
                                            label={t('webSpaces.analytics.httpHits')}
                                            value={totalHits.toLocaleString()}
                                            hint={t('webSpaces.analytics.periodHint', { days: String(dayCount) })}
                                        />
                                        <StatCard
                                            label={t('webSpaces.analytics.bandwidth')}
                                            value={formatFileSize(totalBytes)}
                                            hint={t('webSpaces.analytics.bandwidthHint')}
                                        />
                                        <StatCard
                                            label={t('webSpaces.analytics.avgHitsPerDay')}
                                            value={avgHitsPerDay.toLocaleString()}
                                        />
                                        <StatCard
                                            label={t('webSpaces.analytics.errorRate')}
                                            value={`${errorRate}%`}
                                            hint={t('webSpaces.analytics.errorRateHint')}
                                        />
                                    </div>

                                    {bandwidthPct != null ? (
                                        <div className='border-border/50 bg-card/50 rounded-xl border p-5 backdrop-blur-xl'>
                                            <div className='mb-2 flex items-center justify-between text-sm'>
                                                <span className='font-medium'>
                                                    {t('webSpaces.analytics.bandwidthQuota')}
                                                </span>
                                                <span className='text-muted-foreground font-mono text-xs'>
                                                    {formatFileSize(bandwidthUsed ?? 0)} /{' '}
                                                    {formatFileSize(bandwidthLimit ?? 0)}
                                                </span>
                                            </div>
                                            <Progress value={bandwidthPct} className='h-2' />
                                            {util?.bandwidth_over_quota ? (
                                                <p className='text-destructive mt-2 text-xs font-medium'>
                                                    {t('webSpaces.analytics.bandwidthOverQuota')}
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <div className='border-border/50 bg-card/50 rounded-xl border p-5 backdrop-blur-xl'>
                                        <h3 className='mb-4 text-sm font-medium'>
                                            {t('webSpaces.analytics.httpByDay')}
                                        </h3>
                                        <DayBars rows={trafficDays} valueKey='hits' max={maxTrafficHits} />
                                    </div>

                                    <div className='grid gap-4 lg:grid-cols-2'>
                                        <div className='border-border/50 bg-card/50 rounded-xl border p-5 backdrop-blur-xl'>
                                            <h3 className='mb-4 text-sm font-medium'>
                                                {t('webSpaces.analytics.statusGroups')}
                                            </h3>
                                            <ul className='space-y-3'>
                                                {(['2xx', '3xx', '4xx', '5xx'] as const).map((group) => {
                                                    const count = statusGroups[group];
                                                    const total = Math.max(1, totalHits);
                                                    return (
                                                        <li key={group} className='space-y-1'>
                                                            <div className='flex items-center justify-between text-sm'>
                                                                <span className='font-mono font-medium'>{group}</span>
                                                                <span>{count.toLocaleString()}</span>
                                                            </div>
                                                            <div className='bg-muted h-2 overflow-hidden rounded-full'>
                                                                <div
                                                                    className={cn(
                                                                        'h-full rounded-full',
                                                                        statusGroupColor(group),
                                                                    )}
                                                                    style={{ width: `${(count / total) * 100}%` }}
                                                                />
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>

                                        <div className='border-border/50 bg-card/50 rounded-xl border p-5 backdrop-blur-xl'>
                                            <h3 className='mb-4 text-sm font-medium'>
                                                {t('webSpaces.analytics.statusCodes')}
                                            </h3>
                                            {statusRows.length ? (
                                                <ul className='max-h-48 space-y-2 overflow-y-auto pr-1'>
                                                    {statusRows.map(([code, count]) => (
                                                        <li key={code} className='space-y-1'>
                                                            <div className='flex items-center justify-between text-sm'>
                                                                <span className='font-mono'>{code}</span>
                                                                <span>{count.toLocaleString()}</span>
                                                            </div>
                                                            <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
                                                                <div
                                                                    className='bg-primary h-full rounded-full'
                                                                    style={{
                                                                        width: `${(count / maxStatusCount) * 100}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className='text-muted-foreground text-sm'>
                                                    {t('webSpaces.analytics.noTraffic')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {domainRows.length > 1 ? (
                                        <div className='border-border/50 bg-card/50 rounded-xl border p-5 backdrop-blur-xl'>
                                            <h3 className='mb-4 text-sm font-medium'>
                                                {t('webSpaces.analytics.byDomain')}
                                            </h3>
                                            <div className='overflow-x-auto'>
                                                <table className='w-full text-sm'>
                                                    <thead>
                                                        <tr className='text-muted-foreground border-b text-left'>
                                                            <th className='py-2 pr-4'>
                                                                {t('webSpaces.analytics.domainFilter')}
                                                            </th>
                                                            <th className='py-2 pr-4'>
                                                                {t('webSpaces.analytics.httpHits')}
                                                            </th>
                                                            <th className='py-2'>
                                                                {t('webSpaces.analytics.bandwidth')}
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {domainRows.map((row) => (
                                                            <tr key={row.domain} className='border-border/50 border-b'>
                                                                <td className='py-2 pr-4 font-mono'>{row.domain}</td>
                                                                <td className='py-2 pr-4'>
                                                                    {row.hits.toLocaleString()}
                                                                </td>
                                                                <td className='py-2'>{formatFileSize(row.bytes)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </section>

                        <section className='space-y-4'>
                            <div className='flex items-center gap-2'>
                                <Activity className='text-primary h-5 w-5' />
                                <h2 className='text-lg font-semibold'>{t('webSpaces.analytics.activitySection')}</h2>
                            </div>

                            {!hasActivity ? (
                                <div className='border-border/50 bg-card/50 text-muted-foreground rounded-xl border p-8 text-center text-sm'>
                                    {t('webSpaces.analytics.noData')}
                                </div>
                            ) : (
                                <div className='grid gap-4 lg:grid-cols-3'>
                                    <StatCard
                                        className='lg:col-span-1'
                                        label={t('webSpaces.analytics.totalEvents')}
                                        value={(summary?.total ?? 0).toLocaleString()}
                                        hint={t('webSpaces.analytics.periodHint', { days: String(dayCount) })}
                                    />
                                    <div className='border-border/50 bg-card/50 rounded-xl border p-5 backdrop-blur-xl lg:col-span-2'>
                                        <div className='mb-4 flex items-center gap-2'>
                                            <TrendingUp className='text-muted-foreground h-4 w-4' />
                                            <h3 className='text-sm font-medium'>{t('webSpaces.analytics.byDay')}</h3>
                                        </div>
                                        <DayBars
                                            rows={activityDays}
                                            valueKey='count'
                                            max={maxActivity}
                                            barClassName='bg-violet-500/80 group-hover:bg-violet-500'
                                        />
                                    </div>
                                    <div className='border-border/50 bg-card/50 rounded-xl border p-5 backdrop-blur-xl lg:col-span-3'>
                                        <h3 className='mb-4 text-sm font-medium'>
                                            {t('webSpaces.analytics.topEvents')}
                                        </h3>
                                        {summary?.top_events.length ? (
                                            <div className='overflow-x-auto'>
                                                <table className='w-full text-sm'>
                                                    <thead>
                                                        <tr className='text-muted-foreground border-b text-left'>
                                                            <th className='py-2 pr-4'>
                                                                {t('webSpaces.analytics.event')}
                                                            </th>
                                                            <th className='py-2'>{t('webSpaces.analytics.count')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {summary.top_events.map((row) => (
                                                            <tr key={row.event} className='border-border/50 border-b'>
                                                                <td className='py-2 pr-4'>
                                                                    {formatEventLabel(row.event)}
                                                                    <span className='text-muted-foreground ml-2 font-mono text-xs'>
                                                                        {row.event}
                                                                    </span>
                                                                </td>
                                                                <td className='py-2'>{row.count.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className='text-muted-foreground text-sm'>
                                                {t('webSpaces.analytics.noData')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </WebSpacePageWidgets>
    );
}
