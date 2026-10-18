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
import type { ReactNode } from 'react';
import {
    Activity as ActivityIcon,
    ArchiveRestore,
    ArrowDown,
    ArrowUp,
    BookOpen,
    CalendarClock,
    Gauge,
    KeyRound,
    LifeBuoy,
    Lock,
    PieChart,
    Server as ServerIcon,
    Timer,
    UserRound,
    Wifi,
    Zap,
} from 'lucide-react';

import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatRelativeTime } from '@/lib/dateUtils';
import { formatDisk, formatMemory, getStatusDotColor } from '@/lib/server-utils';
import { cn } from '@/lib/utils';
import type { VmInstance } from '@/lib/vms-api';
import { DashboardPanel } from '@/components/dashboard/DashboardOverview';

/** Shape of GET /api/user/dashboard/overview. */
export interface DashboardOverviewServerItem {
    uuidShort: string;
    name: string;
    status: string;
    cpu: number | null;
    memory_bytes: number | null;
    disk_bytes: number | null;
    uptime_ms: number | null;
    rx_bytes: number | null;
    tx_bytes: number | null;
}

export interface DashboardOverview {
    servers: {
        total: number;
        by_status: Record<string, number>;
        usage: {
            cpu_percent: number;
            cpu_limit_percent: number;
            memory_bytes: number;
            memory_limit_bytes: number;
            disk_bytes: number;
            disk_limit_bytes: number;
            network_rx_bytes: number;
            network_tx_bytes: number;
            unlimited: { cpu: number; memory: number; disk: number };
            reporting: number;
        } | null;
        items: DashboardOverviewServerItem[];
    };
    can_view?: { backups: boolean; schedules: boolean };
    backups: {
        uuid: string;
        name: string;
        bytes: number;
        state: 'running' | 'completed' | 'failed';
        locked: boolean;
        completed_at: string | null;
        created_at: string | null;
        server: { uuidShort: string; name: string };
    }[];
    schedules: {
        id: number;
        name: string;
        next_run_at: string;
        only_when_online: boolean;
        processing: boolean;
        server: { uuidShort: string; name: string };
    }[];
}

/** Raw webspace fields the widgets use (the list returns stored rows). */
export interface WebSpaceUsageFields {
    disk?: number | null;
    bandwidth_limit_gb?: number | null;
    bandwidth_used_bytes?: number | null;
}

const GIB = 1024 ** 3;

function Bar({ percent }: { percent: number | null }) {
    const tone =
        percent === null
            ? 'bg-primary/50'
            : percent >= 90
              ? 'bg-rose-500'
              : percent >= 70
                ? 'bg-amber-500'
                : 'bg-emerald-500';
    return (
        <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
            <div
                className={cn('h-full rounded-full transition-[width] duration-500', tone)}
                style={{ width: `${percent === null ? 0 : Math.min(100, Math.max(percent, 0))}%` }}
            />
        </div>
    );
}

function UsageRow({
    label,
    used,
    limit,
    percent,
}: {
    label: string;
    used: string;
    limit: string;
    percent: number | null;
}) {
    return (
        <div className='space-y-1.5'>
            <div className='flex items-baseline justify-between gap-2 text-xs'>
                <span className='text-muted-foreground font-medium'>{label}</span>
                <span className='truncate tabular-nums'>
                    <span className='font-semibold'>{used}</span>
                    <span className='text-muted-foreground'> / {limit}</span>
                </span>
            </div>
            <Bar percent={percent} />
        </div>
    );
}

function percentOf(used: number, limit: number): number | null {
    return limit > 0 ? (used / limit) * 100 : null;
}

function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className='fp-surface space-y-3 rounded-xl border p-4' aria-busy='true'>
            <div className='bg-muted h-4 w-28 animate-pulse rounded' />
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className='bg-muted/40 h-6 animate-pulse rounded' />
            ))}
        </div>
    );
}

function Quiet({ children }: { children: ReactNode }) {
    return <p className='text-muted-foreground py-1 text-sm'>{children}</p>;
}

export function UsageWidget({
    overview,
    loading,
    vms,
    webspaces,
}: {
    overview: DashboardOverview | null;
    loading: boolean;
    vms: VmInstance[];
    webspaces: WebSpaceUsageFields[];
}) {
    const { t } = useTranslation();
    if (loading && !overview) return <WidgetSkeleton />;
    const usage = overview?.servers.usage ?? null;
    const unlimited = t('dashboard.widgets.usage.unlimited');

    const vmCpu = vms.reduce((sum, vm) => sum + (vm.cores ? (vm.cpus || 1) * vm.cores : 0), 0);
    const vmRam = vms.reduce((sum, vm) => sum + (vm.memory || 0) * 1024 * 1024, 0);
    const vmDisk = vms.reduce((sum, vm) => sum + (vm.disk_gb || 0) * GIB, 0);
    const wsDisk = webspaces.reduce((sum, ws) => sum + (ws.disk || 0) * 1024 * 1024, 0);
    const bwUsed = webspaces.reduce((sum, ws) => sum + (ws.bandwidth_used_bytes || 0), 0);
    const bwLimitedCount = webspaces.filter((ws) => (ws.bandwidth_limit_gb || 0) > 0).length;
    const bwLimit = webspaces.reduce((sum, ws) => sum + (ws.bandwidth_limit_gb || 0) * GIB, 0);

    if (!usage && vms.length === 0 && webspaces.length === 0) return null;

    return (
        <DashboardPanel title={t('dashboard.widgets.usage.title')} icon={Gauge}>
            <div className='space-y-4'>
                {usage && (
                    <div className='space-y-3'>
                        <p className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
                            {t('dashboard.widgets.usage.game_servers', { count: String(overview?.servers.total ?? 0) })}
                        </p>
                        <UsageRow
                            label={t('dashboard.home.meters.cpu')}
                            used={`${Math.round(usage.cpu_percent)}%`}
                            limit={usage.unlimited.cpu > 0 ? unlimited : `${usage.cpu_limit_percent}%`}
                            percent={
                                usage.unlimited.cpu > 0 ? null : percentOf(usage.cpu_percent, usage.cpu_limit_percent)
                            }
                        />
                        <UsageRow
                            label={t('dashboard.home.meters.ram')}
                            used={formatMemory(usage.memory_bytes)}
                            limit={usage.unlimited.memory > 0 ? unlimited : formatMemory(usage.memory_limit_bytes)}
                            percent={
                                usage.unlimited.memory > 0
                                    ? null
                                    : percentOf(usage.memory_bytes, usage.memory_limit_bytes)
                            }
                        />
                        <UsageRow
                            label={t('dashboard.home.meters.disk')}
                            used={formatDisk(usage.disk_bytes)}
                            limit={usage.unlimited.disk > 0 ? unlimited : formatDisk(usage.disk_limit_bytes)}
                            percent={
                                usage.unlimited.disk > 0 ? null : percentOf(usage.disk_bytes, usage.disk_limit_bytes)
                            }
                        />
                        {usage.reporting < (overview?.servers.total ?? 0) && (
                            <p className='text-muted-foreground text-xs'>
                                {t('dashboard.widgets.usage.partial', {
                                    reporting: String(usage.reporting),
                                    total: String(overview?.servers.total ?? 0),
                                })}
                            </p>
                        )}
                    </div>
                )}
                {webspaces.length > 0 && (
                    <div className='space-y-3'>
                        <p className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
                            {t('dashboard.widgets.usage.webspaces', { count: String(webspaces.length) })}
                        </p>
                        {bwLimitedCount > 0 ? (
                            <UsageRow
                                label={t('dashboard.widgets.usage.bandwidth')}
                                used={formatDisk(bwUsed)}
                                limit={bwLimitedCount < webspaces.length ? unlimited : formatDisk(bwLimit)}
                                percent={bwLimitedCount < webspaces.length ? null : percentOf(bwUsed, bwLimit)}
                            />
                        ) : null}
                        {wsDisk > 0 && (
                            <p className='text-muted-foreground text-xs'>
                                {t('dashboard.widgets.usage.allocated_disk', { disk: formatDisk(wsDisk) })}
                            </p>
                        )}
                    </div>
                )}
                {vms.length > 0 && (
                    <div className='space-y-1.5'>
                        <p className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
                            {t('dashboard.widgets.usage.vds', { count: String(vms.length) })}
                        </p>
                        <p className='text-xs tabular-nums'>
                            {t('dashboard.widgets.usage.allocated_vds', {
                                cpu: String(vmCpu),
                                ram: formatMemory(vmRam),
                                disk: formatDisk(vmDisk),
                            })}
                        </p>
                    </div>
                )}
            </div>
        </DashboardPanel>
    );
}

const STATUS_ORDER = [
    'running',
    'starting',
    'stopping',
    'offline',
    'installing',
    'install_failed',
    'suspended',
    'restoring_backup',
    'transferring',
    'unknown',
];

const STATUS_BAR_COLORS: Record<string, string> = {
    running: 'bg-emerald-500',
    starting: 'bg-amber-400',
    stopping: 'bg-amber-500',
    offline: 'bg-muted-foreground/40',
    installing: 'bg-sky-500',
    install_failed: 'bg-rose-500',
    suspended: 'bg-rose-400',
    restoring_backup: 'bg-violet-500',
    transferring: 'bg-violet-400',
    unknown: 'bg-muted-foreground/20',
};

export function StatusWidget({ overview, loading }: { overview: DashboardOverview | null; loading: boolean }) {
    const { t } = useTranslation();
    if (loading && !overview) return <WidgetSkeleton rows={2} />;
    const total = overview?.servers.total ?? 0;
    if (!overview || total === 0) return null;
    const entries = Object.entries(overview.servers.by_status).sort(
        (a, b) =>
            ((STATUS_ORDER.indexOf(a[0]) + 100) % 100) - ((STATUS_ORDER.indexOf(b[0]) + 100) % 100) || b[1] - a[1],
    );
    return (
        <DashboardPanel title={t('dashboard.widgets.status.title')} icon={PieChart} count={total}>
            <div className='bg-muted flex h-2 overflow-hidden rounded-full'>
                {entries.map(([status, count]) => (
                    <div
                        key={status}
                        className={cn('h-full', STATUS_BAR_COLORS[status] ?? 'bg-primary/60')}
                        style={{ width: `${(count / total) * 100}%` }}
                        title={`${t(`servers.status.${status}`)}: ${count}`}
                    />
                ))}
            </div>
            <ul className='mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5'>
                {entries.map(([status, count]) => (
                    <li key={status} className='flex min-w-0 items-center gap-2 text-xs'>
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', getStatusDotColor(status))} aria-hidden />
                        <span className='text-muted-foreground min-w-0 flex-1 truncate'>
                            {t(`servers.status.${status}`)}
                        </span>
                        <span className='font-semibold tabular-nums'>{count}</span>
                    </li>
                ))}
            </ul>
        </DashboardPanel>
    );
}

/** "3d 4h", "5h 12m", "8m" */
export function formatUptime(ms: number, t: (key: string, params?: Record<string, string>) => string): string {
    const minutes = Math.floor(ms / 60_000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    if (days > 0) return t('dashboard.widgets.uptime.days_hours', { days: String(days), hours: String(hours) });
    if (hours > 0) return t('dashboard.widgets.uptime.hours_minutes', { hours: String(hours), minutes: String(mins) });
    return t('dashboard.widgets.uptime.minutes', { minutes: String(Math.max(mins, 0)) });
}

export function UptimeWidget({ overview, loading }: { overview: DashboardOverview | null; loading: boolean }) {
    const { t } = useTranslation();
    if (loading && !overview) return <WidgetSkeleton />;
    if (!overview || overview.servers.total === 0) return null;
    const running = overview.servers.items
        .filter((s) => (s.status === 'running' || s.status === 'starting') && (s.uptime_ms ?? 0) > 0)
        .sort((a, b) => (b.uptime_ms ?? 0) - (a.uptime_ms ?? 0));
    const online = overview.servers.items.filter((s) => s.status === 'running').length;
    return (
        <DashboardPanel title={t('dashboard.widgets.uptime.title')} icon={Timer}>
            <p className='text-sm'>
                <span className='font-semibold tabular-nums'>{online}</span>
                <span className='text-muted-foreground'>
                    {' '}
                    {t('dashboard.widgets.uptime.online_of', { total: String(overview.servers.total) })}
                </span>
            </p>
            {running.length === 0 ? (
                <Quiet>{t('dashboard.widgets.uptime.none_running')}</Quiet>
            ) : (
                <ul className='mt-2 space-y-1.5'>
                    {running.slice(0, 5).map((s) => (
                        <li key={s.uuidShort}>
                            <Link
                                href={`/server/${s.uuidShort}`}
                                className='hover:bg-muted/50 -mx-2 flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-sm'
                            >
                                <span className='h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500' aria-hidden />
                                <span className='min-w-0 flex-1 truncate'>{s.name}</span>
                                <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>
                                    {formatUptime(s.uptime_ms ?? 0, t)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </DashboardPanel>
    );
}

export function NetworkWidget({
    overview,
    loading,
    webspaces,
}: {
    overview: DashboardOverview | null;
    loading: boolean;
    webspaces: WebSpaceUsageFields[];
}) {
    const { t } = useTranslation();
    if (loading && !overview) return <WidgetSkeleton rows={2} />;
    const usage = overview?.servers.usage;
    const bwUsed = webspaces.reduce((sum, ws) => sum + (ws.bandwidth_used_bytes || 0), 0);
    if (!usage && webspaces.length === 0) return null;
    const top = (overview?.servers.items ?? [])
        .filter((s) => (s.rx_bytes ?? 0) + (s.tx_bytes ?? 0) > 0)
        .sort((a, b) => (b.rx_bytes ?? 0) + (b.tx_bytes ?? 0) - ((a.rx_bytes ?? 0) + (a.tx_bytes ?? 0)))
        .slice(0, 3);
    return (
        <DashboardPanel title={t('dashboard.widgets.network.title')} icon={Wifi}>
            {usage && (
                <>
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='fp-surface-inset rounded-lg px-3 py-2'>
                            <p className='text-muted-foreground flex items-center gap-1 text-[11px] font-medium'>
                                <ArrowDown className='h-3 w-3' aria-hidden />
                                {t('dashboard.widgets.network.inbound')}
                            </p>
                            <p className='mt-0.5 text-sm font-semibold tabular-nums'>
                                {formatDisk(usage.network_rx_bytes)}
                            </p>
                        </div>
                        <div className='fp-surface-inset rounded-lg px-3 py-2'>
                            <p className='text-muted-foreground flex items-center gap-1 text-[11px] font-medium'>
                                <ArrowUp className='h-3 w-3' aria-hidden />
                                {t('dashboard.widgets.network.outbound')}
                            </p>
                            <p className='mt-0.5 text-sm font-semibold tabular-nums'>
                                {formatDisk(usage.network_tx_bytes)}
                            </p>
                        </div>
                    </div>
                    <p className='text-muted-foreground mt-2 text-xs'>{t('dashboard.widgets.network.since_start')}</p>
                    {top.length > 1 && (
                        <ul className='mt-2 space-y-1'>
                            {top.map((s) => (
                                <li key={s.uuidShort} className='flex min-w-0 items-center gap-2 text-xs'>
                                    <span className='min-w-0 flex-1 truncate'>{s.name}</span>
                                    <span className='text-muted-foreground shrink-0 tabular-nums'>
                                        {formatDisk((s.rx_bytes ?? 0) + (s.tx_bytes ?? 0))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
            {webspaces.length > 0 && (
                <p className={cn('text-xs', usage && 'border-border/50 mt-3 border-t pt-3')}>
                    {t('dashboard.widgets.network.web_bandwidth', { used: formatDisk(bwUsed) })}
                </p>
            )}
        </DashboardPanel>
    );
}

const BACKUP_TONE: Record<string, string> = {
    completed: 'text-emerald-600 dark:text-emerald-400',
    failed: 'text-rose-600 dark:text-rose-400',
    running: 'text-sky-600 dark:text-sky-400',
};

const BACKUP_STATE_KEYS: Record<string, string> = {
    completed: 'dashboard.widgets.backups.state_completed',
    failed: 'dashboard.widgets.backups.state_failed',
    running: 'dashboard.widgets.backups.state_running',
};

export function BackupsWidget({ overview, loading }: { overview: DashboardOverview | null; loading: boolean }) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    if (loading && !overview) return <WidgetSkeleton />;
    if (!overview || overview.servers.total === 0 || overview.can_view?.backups === false) return null;
    const backups = overview.backups.slice(0, 5);
    return (
        <DashboardPanel title={t('dashboard.widgets.backups.title')} icon={ArchiveRestore}>
            {backups.length === 0 ? (
                <Quiet>{t('dashboard.widgets.backups.empty')}</Quiet>
            ) : (
                <ul className='space-y-1'>
                    {backups.map((b) => (
                        <li key={b.uuid}>
                            <Link
                                href={`/server/${b.server.uuidShort}/backups`}
                                className='hover:bg-muted/50 -mx-2 flex min-w-0 items-start gap-2 rounded-md px-2 py-1.5'
                            >
                                <span className='min-w-0 flex-1'>
                                    <span className='flex min-w-0 items-center gap-1.5 text-sm'>
                                        <span className='truncate font-medium'>{b.name}</span>
                                        {b.locked && (
                                            <Lock
                                                className='text-muted-foreground h-3 w-3 shrink-0'
                                                aria-label={t('dashboard.widgets.backups.locked')}
                                            />
                                        )}
                                    </span>
                                    <span className='text-muted-foreground block truncate text-xs'>
                                        {b.server.name}
                                        {' · '}
                                        {formatRelativeTime(b.completed_at || b.created_at || '', dateOpts)}
                                    </span>
                                </span>
                                <span className='shrink-0 text-right text-xs'>
                                    <span className={cn('block font-medium', BACKUP_TONE[b.state])}>
                                        {t(BACKUP_STATE_KEYS[b.state] ?? BACKUP_STATE_KEYS.completed)}
                                    </span>
                                    {b.state === 'completed' && b.bytes > 0 && (
                                        <span className='text-muted-foreground tabular-nums'>
                                            {formatDisk(b.bytes)}
                                        </span>
                                    )}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </DashboardPanel>
    );
}

export function SchedulesWidget({ overview, loading }: { overview: DashboardOverview | null; loading: boolean }) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    if (loading && !overview) return <WidgetSkeleton />;
    if (!overview || overview.servers.total === 0 || overview.can_view?.schedules === false) return null;
    const schedules = overview.schedules.slice(0, 5);
    return (
        <DashboardPanel title={t('dashboard.widgets.schedules.title')} icon={CalendarClock}>
            {schedules.length === 0 ? (
                <Quiet>{t('dashboard.widgets.schedules.empty')}</Quiet>
            ) : (
                <ul className='space-y-1'>
                    {schedules.map((s) => (
                        <li key={s.id}>
                            <Link
                                href={`/server/${s.server.uuidShort}/schedules`}
                                className='hover:bg-muted/50 -mx-2 flex min-w-0 items-start gap-2 rounded-md px-2 py-1.5'
                            >
                                <span className='min-w-0 flex-1'>
                                    <span className='block truncate text-sm font-medium'>{s.name}</span>
                                    <span className='text-muted-foreground block truncate text-xs'>
                                        {s.server.name}
                                        {s.only_when_online ? ` · ${t('dashboard.widgets.schedules.only_online')}` : ''}
                                    </span>
                                </span>
                                <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>
                                    {s.processing
                                        ? t('dashboard.widgets.schedules.running_now')
                                        : formatRelativeTime(s.next_run_at, dateOpts)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </DashboardPanel>
    );
}

export interface QuickAction {
    key: string;
    label: string;
    href: string;
    icon: typeof ServerIcon;
}

export function QuickActionsWidget({ actions }: { actions: QuickAction[] }) {
    const { t } = useTranslation();
    if (actions.length === 0) return null;
    return (
        <DashboardPanel title={t('dashboard.widgets.quick_actions.title')} icon={Zap}>
            <div className='grid grid-cols-2 gap-2'>
                {actions.map(({ key, label, href, icon: Icon }) => (
                    <Link
                        key={key}
                        href={href}
                        className='fp-surface-inset hover:border-primary/40 hover:text-primary flex min-w-0 items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-xs font-medium transition-colors'
                    >
                        <Icon className='h-4 w-4 shrink-0' aria-hidden />
                        <span className='truncate'>{label}</span>
                    </Link>
                ))}
            </div>
        </DashboardPanel>
    );
}

/** Icons for the quick actions the dashboard builds. */
export const QUICK_ACTION_ICONS = {
    servers: ServerIcon,
    ticket: LifeBuoy,
    knowledgebase: BookOpen,
    account: UserRound,
    ssh: KeyRound,
    activity: ActivityIcon,
};
