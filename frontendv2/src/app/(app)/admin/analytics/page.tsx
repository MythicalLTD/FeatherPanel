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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Activity,
    ArrowRight,
    BookOpen,
    Boxes,
    CalendarRange,
    FileText,
    Globe,
    HardDrive,
    Puzzle,
    RefreshCw,
    Repeat,
    Server,
    Settings,
    Ticket,
    UserPlus,
    Users,
    type LucideIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { isModuleEnabled, type PanelModule } from '@/lib/modules';
import { PageHeader } from '@/components/featherui/PageHeader';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { ModuleBadge } from '@/components/ui/module-badge';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import {
    ActivityPanel,
    GrowthChart,
    KpiCard,
    ModuleMix,
    NodeCapacity,
    TicketsChart,
    TopConsumers,
} from '@/components/admin/analytics/KpiOverview';
import {
    KPI_PRESETS,
    formatCompact,
    formatRangeDay,
    isoDay,
    presetRange,
    type KpiOverview,
    type KpiPreset,
} from '@/lib/kpi-overview';

const fieldClass =
    'border-border/60 bg-background/60 focus-visible:ring-primary/40 h-8 rounded-lg border px-2.5 text-xs outline-none transition-colors focus-visible:ring-2';

function RangeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type='button'
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors',
                active
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border/60 bg-background/40 text-muted-foreground hover:text-foreground hover:border-border',
            )}
        >
            {children}
        </button>
    );
}

interface Report {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    module?: PanelModule;
}

export default function AnalyticsDashboardPage() {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { getWidgets } = usePluginWidgets('admin-analytics');

    const today = isoDay(new Date());
    const [preset, setPreset] = useState<KpiPreset>('d30');
    const [range, setRange] = useState(() => presetRange(30));
    const [data, setData] = useState<KpiOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: res } = await api.get('/admin/analytics/overview', {
                params: { from: range.from, to: range.to },
            });
            setData(res.data as KpiOverview);
        } catch (e) {
            setError(getApiErrorMessage(e, t, 'admin.analytics.overview.failed'));
        } finally {
            setLoading(false);
        }
    }, [range.from, range.to, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const choosePreset = (id: KpiPreset) => {
        setPreset(id);
        const p = KPI_PRESETS.find((x) => x.id === id);
        if (p) setRange(presetRange(p.days));
    };

    const setCustom = (key: 'from' | 'to', value: string) => {
        if (!value) return;
        setRange((prev) => {
            const next = { ...prev, [key]: value };
            if (next.from > next.to) {
                if (key === 'from') next.to = value;
                else next.from = value;
            }
            return next;
        });
    };

    const reports: Report[] = useMemo(
        () =>
            (
                [
                    {
                        title: t('admin.analytics.users.title'),
                        description: t('admin.analytics.nav.users_desc'),
                        icon: Users,
                        href: '/admin/analytics/users',
                    },
                    {
                        title: t('admin.analytics.activity.title'),
                        description: t('admin.analytics.nav.activity_desc'),
                        icon: Activity,
                        href: '/admin/analytics/activity',
                    },
                    {
                        title: t('admin.analytics.servers.title'),
                        description: t('admin.analytics.nav.servers_desc'),
                        icon: Server,
                        href: '/admin/analytics/servers',
                        module: 'game',
                    },
                    {
                        title: t('ui.admin.analytics.vDSPlatform'),
                        description: t('ui.admin.analytics.vDSOnlyAnalyticsInstancesNodesTemplates'),
                        icon: Boxes,
                        href: '/admin/analytics/vds',
                        module: 'vds',
                    },
                    {
                        title: t('admin.analytics.infrastructure.title'),
                        description: t('admin.analytics.nav.infrastructure_desc'),
                        icon: HardDrive,
                        href: '/admin/analytics/infrastructure',
                    },
                    {
                        title: t('ui.admin.analytics.tickets'),
                        description: t('ui.admin.analytics.dedicatedAnalyticsForTicketingMessagesStatuses'),
                        icon: Ticket,
                        href: '/admin/analytics/tickets',
                    },
                    {
                        title: t('admin.analytics.languages.title'),
                        description: t('admin.analytics.languages.subtitle'),
                        icon: Globe,
                        href: '/admin/analytics/languages',
                    },
                    {
                        title: t('admin.analytics.content.title'),
                        description: t('admin.analytics.nav.content_desc'),
                        icon: FileText,
                        href: '/admin/analytics/content',
                    },
                    {
                        title: t('admin.analytics.system.title'),
                        description: t('admin.analytics.nav.system_desc'),
                        icon: Settings,
                        href: '/admin/analytics/system',
                    },
                    {
                        title: t('ui.admin.analytics.pluginsIntegrations'),
                        description: t('ui.admin.analytics.pluginAdoptionPlusImportsProxiesTransfers'),
                        icon: Puzzle,
                        href: '/admin/analytics/plugins',
                    },
                    {
                        title: t('ui.admin.analytics.knowledgebase'),
                        description: t('ui.admin.analytics.knowledgebaseKPIsForCategoriesArticlesTags'),
                        icon: BookOpen,
                        href: '/admin/analytics/knowledgebase',
                    },
                ] as Report[]
            ).filter((r) => !r.module || isModuleEnabled(settings, r.module)),
        [settings, t],
    );

    const anyModule = Boolean(data && (data.game || data.web || data.vds));
    const activePct =
        data && data.users.seen_in_range > 0 ? Math.round((data.users.returning / data.users.seen_in_range) * 100) : 0;

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-analytics', 'top-of-page')} />
            <div className='space-y-5'>
                <PageHeader
                    title={t('admin.analytics.title')}
                    description={t('admin.analytics.subtitle')}
                    icon={Activity}
                    actions={
                        <button
                            type='button'
                            onClick={() => void load()}
                            disabled={loading}
                            aria-label={t('admin.analytics.overview.retry')}
                            className='border-border/60 bg-background/40 hover:bg-muted/50 inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-60'
                        >
                            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                        </button>
                    }
                />

                <div className='fp-surface flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='flex min-w-0 items-center gap-2'>
                        <CalendarRange className='text-muted-foreground hidden h-4 w-4 shrink-0 sm:block' />
                        <div
                            role='group'
                            aria-label={t('admin.analytics.overview.range.label')}
                            className='-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-0.5'
                        >
                            {KPI_PRESETS.map((p) => (
                                <RangeChip key={p.id} active={preset === p.id} onClick={() => choosePreset(p.id)}>
                                    {t(`admin.analytics.overview.range.${p.id}`)}
                                </RangeChip>
                            ))}
                            <RangeChip active={preset === 'custom'} onClick={() => setPreset('custom')}>
                                {t('admin.analytics.overview.range.custom')}
                            </RangeChip>
                        </div>
                    </div>
                    {preset === 'custom' ? (
                        <div className='flex min-w-0 items-center gap-2'>
                            <input
                                type='date'
                                aria-label={t('admin.analytics.overview.range.from')}
                                className={cn(fieldClass, 'min-w-0 flex-1 sm:w-36 sm:flex-none')}
                                value={range.from}
                                max={today}
                                onChange={(e) => setCustom('from', e.target.value)}
                            />
                            <span className='text-muted-foreground text-xs'>
                                {t('admin.analytics.overview.range.to')}
                            </span>
                            <input
                                type='date'
                                aria-label={t('admin.analytics.overview.range.to')}
                                className={cn(fieldClass, 'min-w-0 flex-1 sm:w-36 sm:flex-none')}
                                value={range.to}
                                max={today}
                                onChange={(e) => setCustom('to', e.target.value)}
                            />
                        </div>
                    ) : (
                        data && (
                            <span className='text-muted-foreground truncate text-xs'>
                                {t('admin.analytics.overview.range.comparing', {
                                    from: formatRangeDay(data.range.previous_from),
                                    to: formatRangeDay(data.range.previous_to),
                                })}
                            </span>
                        )
                    )}
                </div>

                {error && !data && (
                    <div className='fp-surface flex flex-col items-center gap-3 rounded-xl border p-8 text-center'>
                        <p className='text-sm'>{error}</p>
                        <button
                            type='button'
                            onClick={() => void load()}
                            className='border-border/60 hover:bg-muted/50 inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm'
                        >
                            <RefreshCw className='h-4 w-4' />
                            {t('admin.analytics.overview.retry')}
                        </button>
                    </div>
                )}

                {!data && loading && (
                    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4' aria-busy='true'>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className='fp-surface h-36 animate-pulse rounded-xl border' />
                        ))}
                        <span className='sr-only'>{t('admin.analytics.overview.loading')}</span>
                    </div>
                )}

                {data && (
                    <div className={cn('space-y-4 transition-opacity', loading && 'opacity-60')}>
                        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                            <KpiCard
                                icon={UserPlus}
                                label={t('admin.analytics.overview.kpi.new_users')}
                                value={formatCompact(data.users.new)}
                                current={data.users.new}
                                previous={data.users.new_previous}
                                hint={t('admin.analytics.overview.kpi.users_total', {
                                    count: formatCompact(data.users.total),
                                })}
                                series={data.series}
                                seriesKey='signups'
                                href='/admin/analytics/users'
                            />
                            <KpiCard
                                icon={Users}
                                label={t('admin.analytics.overview.kpi.active_users')}
                                value={formatCompact(data.users.seen_in_range)}
                                hint={t('admin.analytics.overview.kpi.active_hint', {
                                    day: formatCompact(data.users.active_24h),
                                    week: formatCompact(data.users.active_7d),
                                })}
                            />
                            <KpiCard
                                icon={Repeat}
                                label={t('admin.analytics.overview.kpi.returning')}
                                value={formatCompact(data.users.returning)}
                                hint={t('admin.analytics.overview.kpi.returning_hint', { percent: String(activePct) })}
                            />
                            <KpiCard
                                icon={Activity}
                                label={t('admin.analytics.overview.kpi.activity')}
                                value={formatCompact(data.activity.total)}
                                current={data.activity.total}
                                previous={data.activity.previous}
                                hint={t('admin.analytics.overview.kpi.activity_hint', {
                                    count: formatCompact(data.activity.unique_users),
                                })}
                                series={data.series}
                                seriesKey='activity'
                                href='/admin/analytics/activity'
                            />
                            {data.game && (
                                <KpiCard
                                    icon={Server}
                                    module='game'
                                    label={t('admin.analytics.overview.kpi.new_servers')}
                                    value={formatCompact(data.game.new)}
                                    current={data.game.new}
                                    previous={data.game.new_previous}
                                    hint={t('admin.analytics.overview.kpi.servers_hint', {
                                        total: formatCompact(data.game.total),
                                        suspended: formatCompact(data.game.suspended),
                                    })}
                                    series={data.series}
                                    seriesKey='servers'
                                    href='/admin/analytics/servers'
                                />
                            )}
                            {data.web && (
                                <KpiCard
                                    icon={Globe}
                                    module='web'
                                    label={t('admin.analytics.overview.kpi.new_webspaces')}
                                    value={formatCompact(data.web.new)}
                                    current={data.web.new}
                                    previous={data.web.new_previous}
                                    hint={t('admin.analytics.overview.kpi.webspaces_hint', {
                                        total: formatCompact(data.web.total),
                                    })}
                                    series={data.series}
                                    seriesKey='webspaces'
                                    href='/admin/webspaces'
                                />
                            )}
                            {data.vds && (
                                <KpiCard
                                    icon={Boxes}
                                    module='vds'
                                    label={t('admin.analytics.overview.kpi.new_vds')}
                                    value={formatCompact(data.vds.new)}
                                    current={data.vds.new}
                                    previous={data.vds.new_previous}
                                    hint={t('admin.analytics.overview.kpi.vds_hint', {
                                        total: formatCompact(data.vds.total),
                                        suspended: formatCompact(data.vds.suspended),
                                    })}
                                    series={data.series}
                                    seriesKey='vds'
                                    href='/admin/analytics/vds'
                                />
                            )}
                            {data.tickets && (
                                <KpiCard
                                    icon={Ticket}
                                    label={t('admin.analytics.overview.kpi.tickets')}
                                    value={formatCompact(data.tickets.opened)}
                                    current={data.tickets.opened}
                                    previous={data.tickets.opened_previous}
                                    hint={t('admin.analytics.overview.kpi.tickets_hint', {
                                        open: formatCompact(data.tickets.open_now),
                                        resolution:
                                            data.tickets.avg_resolution_hours === null
                                                ? t('admin.analytics.overview.kpi.none')
                                                : t('admin.analytics.overview.kpi.hours', {
                                                      value: String(data.tickets.avg_resolution_hours),
                                                  }),
                                    })}
                                    series={data.series}
                                    seriesKey='tickets_opened'
                                    href='/admin/analytics/tickets'
                                />
                            )}
                        </div>

                        <div className='grid gap-4 lg:grid-cols-3'>
                            <GrowthChart data={data} />
                            {anyModule && <ModuleMix data={data} />}
                        </div>

                        {anyModule && (
                            <div className='grid gap-4 lg:grid-cols-3'>
                                <NodeCapacity data={data} />
                                <TopConsumers data={data} />
                            </div>
                        )}

                        <div className='grid gap-4 lg:grid-cols-2'>
                            <TicketsChart data={data} />
                            <ActivityPanel data={data} />
                        </div>
                    </div>
                )}

                <section>
                    <div className='mb-3'>
                        <h2 className='text-sm font-semibold sm:text-base'>
                            {t('admin.analytics.overview.reports.title')}
                        </h2>
                        <p className='text-muted-foreground text-xs sm:text-sm'>
                            {t('admin.analytics.overview.reports.description')}
                        </p>
                    </div>
                    <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
                        {reports.map((r) => (
                            <Link
                                key={r.href}
                                href={r.href}
                                className='fp-surface fp-surface-interactive group flex items-center gap-3 rounded-xl border p-3'
                            >
                                <span className='fp-icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                                    <r.icon className='h-4 w-4' />
                                </span>
                                <span className='min-w-0 flex-1'>
                                    <span className='flex items-center gap-2'>
                                        <span className='truncate text-sm font-medium'>{r.title}</span>
                                        {r.module && <ModuleBadge module={r.module} />}
                                    </span>
                                    <span className='text-muted-foreground line-clamp-1 text-xs'>{r.description}</span>
                                </span>
                                <ArrowRight className='text-muted-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5' />
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
            <WidgetRenderer widgets={getWidgets('admin-analytics', 'bottom-of-page')} />
        </>
    );
}
