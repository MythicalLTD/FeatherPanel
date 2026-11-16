/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Activity,
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpFromLine,
    CheckCircle2,
    Cpu,
    Flame,
    Globe,
    HardDrive,
    HeartPulse,
    KeyRound,
    Loader2,
    MemoryStick,
    Network,
    RefreshCw,
    Server,
    Shield,
    ShieldAlert,
    Terminal,
    XCircle,
    Archive,
    Plug,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import Permissions from '@/lib/permissions';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DaemonHealthBadge, DAEMON_STATUS_STYLES } from './DaemonHealthBadge';
import type {
    DaemonHealthCheck,
    DaemonHealthReport,
    DaemonHost,
    DaemonKind,
    QuilldSummary,
    WingsSummary,
} from './types';

const REFRESH_MS = 15000;

type TFn = (key: string, params?: Record<string, string>) => string;

function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '-';
    const s = Math.max(0, Math.floor(seconds));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

function formatAgo(t: TFn, unix: number | null | undefined, now: number): string {
    if (!unix) return '-';
    const diff = Math.max(0, Math.round(now / 1000 - unix));
    return t('admin.daemonHealth.ago', { time: formatDuration(diff) });
}

function percent(used: number | null | undefined, total: number | null | undefined): number {
    if (!used || !total || total <= 0) return 0;
    return Math.min(100, (used / total) * 100);
}

function checkLabel(t: TFn, name: string): string {
    const key = `admin.daemonHealth.checks.${name}`;
    const label = t(key);
    return label === key ? name.replace(/_/g, ' ') : label;
}

function Stat({
    icon: Icon,
    label,
    value,
    sub,
    tone,
}: {
    icon: typeof Activity;
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    tone?: 'ok' | 'warn' | 'bad';
}) {
    return (
        <div className='border-border/60 bg-muted/20 rounded-xl border p-4'>
            <div className='text-muted-foreground flex items-center gap-2 text-xs font-medium'>
                <Icon className='h-3.5 w-3.5' />
                <span className='truncate'>{label}</span>
            </div>
            <div
                className={cn(
                    'mt-1.5 text-2xl font-semibold tabular-nums',
                    tone === 'ok' && 'text-emerald-600 dark:text-emerald-400',
                    tone === 'warn' && 'text-amber-600 dark:text-amber-400',
                    tone === 'bad' && 'text-red-600 dark:text-red-400',
                )}
            >
                {value}
            </div>
            {sub ? <div className='text-muted-foreground mt-1 text-xs'>{sub}</div> : null}
        </div>
    );
}

function Chips({ values, t, prefix }: { values: Record<string, number>; t: TFn; prefix: string }) {
    const entries = Object.entries(values);
    if (entries.length === 0) return null;
    return (
        <div className='flex flex-wrap gap-1.5'>
            {entries.map(([key, count]) => {
                const tKey = `${prefix}.${key}`;
                const label = t(tKey);
                return (
                    <span
                        key={key}
                        className='border-border/60 bg-background/60 text-muted-foreground inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]'
                    >
                        <span className='text-foreground font-semibold tabular-nums'>{count}</span>
                        {label === tKey ? key : label}
                    </span>
                );
            })}
        </div>
    );
}

function CheckRow({ check, t }: { check: DaemonHealthCheck; t: TFn }) {
    const Icon = check.status === 'ok' ? CheckCircle2 : check.status === 'degraded' ? AlertTriangle : XCircle;
    const color =
        check.status === 'ok'
            ? 'text-emerald-600 dark:text-emerald-400'
            : check.status === 'degraded'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400';
    const dataEntries = Object.entries(check.data ?? {}).filter(([, v]) => v !== null && v !== '');
    return (
        <div className='border-border/60 flex items-start gap-3 rounded-xl border p-3'>
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', color)} />
            <div className='min-w-0 flex-1 space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-semibold'>{checkLabel(t, check.name)}</span>
                    <span className={cn('text-xs font-medium', color)}>
                        {t(`admin.daemonHealth.check_status.${check.status}`)}
                    </span>
                    {check.critical === true ? (
                        <span className='border-border/60 text-muted-foreground rounded border px-1 text-[10px] tracking-wide uppercase'>
                            {t('admin.daemonHealth.critical')}
                        </span>
                    ) : null}
                    {check.duration_ms !== null ? (
                        <span className='text-muted-foreground ml-auto text-[11px] tabular-nums'>
                            {check.duration_ms} ms
                        </span>
                    ) : null}
                </div>
                {check.message ? <p className='text-muted-foreground text-xs break-words'>{check.message}</p> : null}
                {check.error ? (
                    <p className='text-xs break-words text-red-600 dark:text-red-400'>{check.error}</p>
                ) : null}
                {dataEntries.length > 0 ? (
                    <div className='flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5'>
                        {dataEntries.map(([k, v]) => (
                            <span key={k} className='text-muted-foreground font-mono text-[11px] break-all'>
                                {k}={typeof v === 'number' && /bytes$/.test(k) ? formatBytes(v) : String(v)}
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function HostCard({ host, t }: { host: DaemonHost; t: TFn }) {
    const items = [
        {
            key: 'cpu',
            icon: Cpu,
            label: t('admin.daemonHealth.host.cpu'),
            value: host.cpu_percent ?? 0,
            text: host.cpu_percent !== null ? `${host.cpu_percent.toFixed(1)}%` : '-',
            sub:
                host.load_average1 !== null
                    ? t('admin.daemonHealth.host.load', {
                          load: [host.load_average1, host.load_average5, host.load_average15]
                              .map((v) => (v === null ? '-' : Number(v).toFixed(2)))
                              .join(' / '),
                      })
                    : host.cpu_threads
                      ? t('admin.daemonHealth.host.threads', { count: String(host.cpu_threads) })
                      : null,
        },
        {
            key: 'memory',
            icon: MemoryStick,
            label: t('admin.daemonHealth.host.memory'),
            value: percent(host.memory_used, host.memory_total),
            text:
                host.memory_total !== null
                    ? `${formatBytes(host.memory_used ?? 0)} / ${formatBytes(host.memory_total)}`
                    : '-',
            sub:
                host.swap_total && host.swap_total > 0
                    ? t('admin.daemonHealth.host.swap', {
                          used: formatBytes(host.swap_used ?? 0),
                          total: formatBytes(host.swap_total),
                      })
                    : null,
        },
        {
            key: 'disk',
            icon: HardDrive,
            label: t('admin.daemonHealth.host.disk'),
            value: percent(host.disk_used, host.disk_total),
            text:
                host.disk_total !== null
                    ? `${formatBytes(host.disk_used ?? 0)} / ${formatBytes(host.disk_total)}`
                    : '-',
            sub: null,
        },
    ];
    return (
        <PageCard title={t('admin.daemonHealth.host.title')} icon={Activity}>
            <div className='grid gap-4 md:grid-cols-3'>
                {items.map((item) => (
                    <div key={item.key} className='space-y-2'>
                        <div className='flex items-center justify-between gap-2 text-sm'>
                            <span className='text-muted-foreground inline-flex items-center gap-1.5 font-medium'>
                                <item.icon className='h-4 w-4' />
                                {item.label}
                            </span>
                            <span className='font-semibold tabular-nums'>{item.text}</span>
                        </div>
                        <Progress
                            value={item.value}
                            className={cn(
                                'h-2',
                                item.value >= 90
                                    ? '[&>div]:bg-red-500'
                                    : item.value >= 75
                                      ? '[&>div]:bg-amber-500'
                                      : '',
                            )}
                        />
                        {item.sub ? <div className='text-muted-foreground text-xs'>{item.sub}</div> : null}
                    </div>
                ))}
            </div>
        </PageCard>
    );
}

function WingsMetrics({ summary, t, now }: { summary: WingsSummary; t: TFn; now: number }) {
    const transfersInProgress = summary.transfers.incoming + summary.transfers.outgoing;
    return (
        <>
            <PageCard title={t('admin.daemonHealth.wings.title')} icon={Server}>
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                    <Stat
                        icon={Server}
                        label={t('admin.daemonHealth.wings.servers')}
                        value={summary.servers.total}
                        sub={<Chips values={summary.servers.by_state} t={t} prefix='admin.daemonHealth.server_state' />}
                    />
                    <Stat
                        icon={Archive}
                        label={t('admin.daemonHealth.wings.backups')}
                        value={summary.backups.in_progress}
                        tone={summary.backups.in_progress > 0 ? 'warn' : undefined}
                        sub={t('admin.daemonHealth.wings.backups_totals', {
                            success: String(summary.backups.succeeded_total),
                            failure: String(summary.backups.failed_total),
                        })}
                    />
                    <Stat
                        icon={ArrowUpFromLine}
                        label={t('admin.daemonHealth.wings.transfers')}
                        value={transfersInProgress}
                        tone={transfersInProgress > 0 ? 'warn' : undefined}
                        sub={t('admin.daemonHealth.wings.transfers_split', {
                            incoming: String(summary.transfers.incoming),
                            outgoing: String(summary.transfers.outgoing),
                        })}
                    />
                    <Stat
                        icon={Terminal}
                        label={t('admin.daemonHealth.wings.sftp')}
                        value={summary.sftp.sessions}
                        tone={summary.sftp.listening === false ? 'bad' : undefined}
                        sub={
                            summary.sftp.listening === false
                                ? t('admin.daemonHealth.wings.sftp_down')
                                : t('admin.daemonHealth.wings.sftp_up')
                        }
                    />
                    <Stat icon={Plug} label={t('admin.daemonHealth.wings.websockets')} value={summary.websockets} />
                    <Stat
                        icon={Shield}
                        label={t('admin.daemonHealth.wings.docker')}
                        value={
                            summary.docker_up === null
                                ? '-'
                                : summary.docker_up
                                  ? t('admin.daemonHealth.up')
                                  : t('admin.daemonHealth.down')
                        }
                        tone={summary.docker_up === false ? 'bad' : summary.docker_up ? 'ok' : undefined}
                    />
                    <Stat
                        icon={Network}
                        label={t('admin.daemonHealth.wings.panel_contact')}
                        value={<span className='text-base'>{formatAgo(t, summary.panel.last_contact_at, now)}</span>}
                        sub={
                            summary.panel.requests.network_error || summary.panel.requests.server_error
                                ? t('admin.daemonHealth.wings.panel_errors', {
                                      count: String(
                                          (summary.panel.requests.network_error ?? 0) +
                                              (summary.panel.requests.server_error ?? 0),
                                      ),
                                  })
                                : null
                        }
                    />
                    <Stat
                        icon={Activity}
                        label={t('admin.daemonHealth.daemon_uptime')}
                        value={<span className='text-base'>{formatDuration(summary.daemon.uptime_seconds)}</span>}
                        sub={
                            summary.daemon.resident_memory_bytes
                                ? t('admin.daemonHealth.wings.daemon_memory', {
                                      memory: formatBytes(summary.daemon.resident_memory_bytes),
                                  })
                                : null
                        }
                    />
                </div>
            </PageCard>

            <PageCard
                title={t('admin.daemonHealth.wings.usage_title')}
                description={t('admin.daemonHealth.wings.usage_description')}
                icon={Cpu}
            >
                {summary.servers.per_server_metrics ? (
                    <div className='space-y-4'>
                        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                            <Stat
                                icon={Cpu}
                                label={t('admin.daemonHealth.wings.cpu_total')}
                                value={`${summary.resources.cpu_percent.toFixed(1)}%`}
                            />
                            <Stat
                                icon={MemoryStick}
                                label={t('admin.daemonHealth.wings.memory_total')}
                                value={formatBytes(summary.resources.memory_bytes)}
                                sub={t('admin.daemonHealth.of', {
                                    total: formatBytes(summary.resources.memory_limit_bytes),
                                })}
                            />
                            <Stat
                                icon={HardDrive}
                                label={t('admin.daemonHealth.wings.disk_total')}
                                value={formatBytes(summary.resources.disk_bytes)}
                            />
                            <Stat
                                icon={ArrowDownToLine}
                                label={t('admin.daemonHealth.wings.network')}
                                value={
                                    <span className='text-base'>{formatBytes(summary.resources.network_rx_bytes)}</span>
                                }
                                sub={t('admin.daemonHealth.wings.network_tx', {
                                    tx: formatBytes(summary.resources.network_tx_bytes),
                                })}
                            />
                        </div>
                        {summary.top_servers.length > 0 ? (
                            <div className='border-border/60 overflow-x-auto rounded-xl border'>
                                <table className='w-full text-sm'>
                                    <thead className='bg-muted/30 text-muted-foreground text-xs'>
                                        <tr>
                                            <th className='px-3 py-2 text-left font-medium'>
                                                {t('admin.daemonHealth.wings.table.server')}
                                            </th>
                                            <th className='px-3 py-2 text-left font-medium'>
                                                {t('admin.daemonHealth.wings.table.state')}
                                            </th>
                                            <th className='px-3 py-2 text-right font-medium'>CPU</th>
                                            <th className='px-3 py-2 text-right font-medium'>
                                                {t('admin.daemonHealth.wings.table.memory')}
                                            </th>
                                            <th className='hidden px-3 py-2 text-right font-medium md:table-cell'>
                                                {t('admin.daemonHealth.wings.table.disk')}
                                            </th>
                                            <th className='hidden px-3 py-2 text-right font-medium md:table-cell'>
                                                {t('admin.daemonHealth.wings.table.uptime')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.top_servers.map((s) => (
                                            <tr key={s.uuid} className='border-border/60 border-t'>
                                                <td className='px-3 py-2'>
                                                    {s.server_id ? (
                                                        <Link
                                                            href={`/admin/servers/${s.server_id}/edit`}
                                                            className='text-primary font-medium underline-offset-2 hover:underline'
                                                        >
                                                            {s.name ?? s.uuid_short ?? s.uuid}
                                                        </Link>
                                                    ) : (
                                                        <span className='text-muted-foreground font-mono text-xs'>
                                                            {s.uuid}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className='px-3 py-2 text-xs'>
                                                    {t(`admin.daemonHealth.server_state.${s.state}`)}
                                                </td>
                                                <td className='px-3 py-2 text-right tabular-nums'>
                                                    {s.cpu_percent.toFixed(1)}%
                                                </td>
                                                <td className='px-3 py-2 text-right tabular-nums'>
                                                    {formatBytes(s.memory_bytes)}
                                                    {s.memory_limit_bytes > 0 ? (
                                                        <span className='text-muted-foreground'>
                                                            {' '}
                                                            / {formatBytes(s.memory_limit_bytes)}
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className='hidden px-3 py-2 text-right tabular-nums md:table-cell'>
                                                    {formatBytes(s.disk_bytes)}
                                                </td>
                                                <td className='hidden px-3 py-2 text-right tabular-nums md:table-cell'>
                                                    {s.uptime_seconds > 0 ? formatDuration(s.uptime_seconds) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <p className='text-muted-foreground text-sm'>{t('admin.daemonHealth.wings.per_server_off')}</p>
                )}
            </PageCard>
        </>
    );
}

function QuilldMetrics({ summary, t, now }: { summary: QuilldSummary; t: TFn; now: number }) {
    return (
        <>
            <PageCard title={t('admin.daemonHealth.quilld.title')} icon={Globe}>
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                    <Stat
                        icon={Globe}
                        label={t('admin.daemonHealth.quilld.webspaces')}
                        value={summary.webspaces.total}
                        sub={
                            <Chips
                                values={summary.webspaces.by_state}
                                t={t}
                                prefix='admin.daemonHealth.webspace_state'
                            />
                        }
                    />
                    <Stat icon={Network} label={t('admin.daemonHealth.quilld.domains')} value={summary.domains} />
                    <Stat
                        icon={Shield}
                        label={t('admin.daemonHealth.quilld.waf_enabled')}
                        value={summary.webspaces.waf_enabled}
                        sub={t('admin.daemonHealth.quilld.suspended', { count: String(summary.webspaces.suspended) })}
                    />
                    <Stat
                        icon={Activity}
                        label={t('admin.daemonHealth.daemon_uptime')}
                        value={<span className='text-base'>{formatDuration(summary.uptime_seconds)}</span>}
                        sub={
                            summary.panel_reachable === false
                                ? t('admin.daemonHealth.quilld.panel_unreachable')
                                : summary.version
                                  ? `v${summary.version}`
                                  : null
                        }
                        tone={summary.panel_reachable === false ? 'warn' : undefined}
                    />
                </div>
            </PageCard>

            <div className='grid gap-6 xl:grid-cols-2'>
                <PageCard title={t('admin.daemonHealth.quilld.proxy_title')} icon={Network}>
                    {summary.proxies.length === 0 ? (
                        <p className='text-muted-foreground text-sm'>{t('admin.daemonHealth.quilld.proxy_none')}</p>
                    ) : (
                        <div className='space-y-3'>
                            {summary.proxies.map((proxy) => {
                                const healthy = proxy.running !== false && proxy.last_reload_success !== false;
                                return (
                                    <div key={proxy.provider} className='border-border/60 rounded-xl border p-3'>
                                        <div className='flex flex-wrap items-center gap-2'>
                                            <span className='text-sm font-semibold capitalize'>{proxy.provider}</span>
                                            <span
                                                className={cn(
                                                    'text-xs font-medium',
                                                    healthy
                                                        ? DAEMON_STATUS_STYLES.healthy.text
                                                        : DAEMON_STATUS_STYLES.unhealthy.text,
                                                )}
                                            >
                                                {proxy.running === false
                                                    ? t('admin.daemonHealth.quilld.proxy_stopped')
                                                    : t('admin.daemonHealth.quilld.proxy_running')}
                                            </span>
                                            {proxy.enabled === false ? (
                                                <span className='text-muted-foreground text-xs'>
                                                    {t('admin.daemonHealth.quilld.proxy_unmanaged')}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className='text-muted-foreground mt-1.5 grid gap-1 text-xs sm:grid-cols-2'>
                                            <span>
                                                {t('admin.daemonHealth.quilld.last_reload', {
                                                    when: formatAgo(t, proxy.last_reload_at, now),
                                                })}{' '}
                                                {proxy.last_reload_success === false ? (
                                                    <span className='text-red-600 dark:text-red-400'>
                                                        ({t('admin.daemonHealth.quilld.reload_failed')})
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span>
                                                {t('admin.daemonHealth.quilld.reloads', {
                                                    success: String(proxy.reloads_succeeded_total),
                                                    failure: String(proxy.reloads_failed_total),
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </PageCard>

                <PageCard
                    title={t('admin.daemonHealth.quilld.firewall_title')}
                    description={t('admin.daemonHealth.quilld.firewall_description')}
                    icon={Flame}
                >
                    <div className='space-y-4'>
                        <div className='grid gap-3 sm:grid-cols-3'>
                            <Stat
                                icon={ShieldAlert}
                                label={t('admin.daemonHealth.quilld.events')}
                                value={summary.firewall.events_total}
                            />
                            <Stat
                                icon={XCircle}
                                label={t('admin.daemonHealth.quilld.blocked')}
                                value={summary.firewall.blocked_total}
                                tone={summary.firewall.blocked_total > 0 ? 'warn' : undefined}
                            />
                            <Stat
                                icon={KeyRound}
                                label={t('admin.daemonHealth.quilld.sftp_failures')}
                                value={summary.sftp.auth_failures_total}
                                sub={t('admin.daemonHealth.quilld.sftp_lockouts', {
                                    count: String(summary.sftp.lockouts_total),
                                })}
                            />
                        </div>
                        {Object.keys(summary.firewall.by_category).length > 0 ? (
                            <div className='space-y-1.5'>
                                <div className='text-muted-foreground text-xs font-medium'>
                                    {t('admin.daemonHealth.quilld.by_category')}
                                </div>
                                <Chips
                                    values={summary.firewall.by_category}
                                    t={t}
                                    prefix='admin.daemonHealth.waf_category'
                                />
                            </div>
                        ) : null}
                        {summary.firewall.top_webspaces.length > 0 ? (
                            <div className='space-y-1.5'>
                                <div className='text-muted-foreground text-xs font-medium'>
                                    {t('admin.daemonHealth.quilld.top_webspaces')}
                                </div>
                                <ul className='space-y-1 text-sm'>
                                    {summary.firewall.top_webspaces.map((w) => (
                                        <li key={w.uuid} className='flex items-center justify-between gap-2'>
                                            <span className='truncate'>{w.name}</span>
                                            <span className='text-muted-foreground tabular-nums'>{w.events}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                </PageCard>
            </div>
        </>
    );
}

function MetricsSettingsCard({
    kind,
    nodeId,
    report,
    onSaved,
}: {
    kind: DaemonKind;
    nodeId: string | number;
    report: DaemonHealthReport | null;
    onSaved: () => void;
}) {
    const { t } = useTranslation();
    const { hasPermission } = useSession();
    const canEdit = hasPermission(kind === 'wings' ? Permissions.ADMIN_NODES_EDIT : Permissions.ADMIN_WEB_NODES_EDIT);
    const [url, setUrl] = useState('');
    const [token, setToken] = useState('');
    const [saving, setSaving] = useState(false);
    const loadedUrl = report?.settings.metrics_url ?? '';
    const hasToken = report?.settings.has_metrics_token ?? false;
    const initialised = useRef(false);

    useEffect(() => {
        if (report && !initialised.current) {
            setUrl(loadedUrl);
            initialised.current = true;
        }
    }, [report, loadedUrl]);

    const save = async (body: Record<string, string | null>) => {
        setSaving(true);
        try {
            const base = kind === 'wings' ? '/api/admin/nodes' : '/api/admin/web-nodes';
            await axios.patch(`${base}/${nodeId}/daemon-metrics-settings`, body);
            toast.success(t('admin.daemonHealth.settings.saved'));
            setToken('');
            onSaved();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'admin.daemonHealth.settings.save_failed'));
        } finally {
            setSaving(false);
        }
    };

    const dirty = url.trim() !== loadedUrl || token.trim() !== '';

    return (
        <PageCard
            title={t('admin.daemonHealth.settings.title')}
            description={t(`admin.daemonHealth.settings.description_${kind}`)}
            icon={KeyRound}
        >
            <div className='grid gap-4 md:grid-cols-2'>
                <Input
                    label={t('admin.daemonHealth.settings.url')}
                    description={t('admin.daemonHealth.settings.url_help')}
                    placeholder={kind === 'wings' ? 'http://10.0.0.5:9101/metrics' : 'http://10.0.0.5:9464/metrics'}
                    value={url}
                    disabled={!canEdit || saving}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <Input
                    type='password'
                    autoComplete='off'
                    label={t('admin.daemonHealth.settings.token')}
                    description={
                        hasToken
                            ? t('admin.daemonHealth.settings.token_saved')
                            : t(`admin.daemonHealth.settings.token_help_${kind}`)
                    }
                    placeholder={hasToken ? '••••••••••••' : ''}
                    value={token}
                    disabled={!canEdit || saving}
                    onChange={(e) => setToken(e.target.value)}
                />
            </div>
            {canEdit ? (
                <div className='mt-4 flex flex-wrap gap-2'>
                    <Button
                        size='sm'
                        disabled={!dirty || saving}
                        loading={saving}
                        onClick={() =>
                            void save({
                                metrics_url: url.trim(),
                                ...(token.trim() !== '' ? { metrics_token: token.trim() } : {}),
                            })
                        }
                    >
                        {t('common.save')}
                    </Button>
                    {hasToken ? (
                        <Button
                            size='sm'
                            variant='outline'
                            disabled={saving}
                            onClick={() => void save({ metrics_token: '' })}
                        >
                            {t('admin.daemonHealth.settings.clear_token')}
                        </Button>
                    ) : null}
                </div>
            ) : (
                <p className='text-muted-foreground mt-3 text-xs'>{t('admin.daemonHealth.settings.read_only')}</p>
            )}
        </PageCard>
    );
}

interface DaemonHealthPanelProps {
    kind: DaemonKind;
    nodeId: string | number;
}

/**
 * Node detail panel: readiness checks, host resources and live daemon metrics read from
 * the node's /health/ready and /metrics endpoints, refreshed every 15 seconds.
 */
export function DaemonHealthPanel({ kind, nodeId }: DaemonHealthPanelProps) {
    const { t } = useTranslation();
    const [report, setReport] = useState<DaemonHealthReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [now, setNow] = useState(() => Date.now());
    const inFlight = useRef(false);

    const load = useCallback(
        async (force = false) => {
            if (inFlight.current) return;
            inFlight.current = true;
            if (force) setRefreshing(true);
            try {
                const base = kind === 'wings' ? '/api/admin/nodes' : '/api/admin/web-nodes';
                const { data } = await axios.get(`${base}/${nodeId}/daemon-health`, {
                    params: force ? { refresh: 1 } : undefined,
                });
                setReport(data.data as DaemonHealthReport);
                setError(null);
            } catch (err) {
                setError(getApiErrorMessage(err, t, 'admin.daemonHealth.load_failed'));
            } finally {
                inFlight.current = false;
                setLoading(false);
                setRefreshing(false);
                setNow(Date.now());
            }
        },
        [kind, nodeId, t],
    );

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!autoRefresh) return;
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') void load();
        }, REFRESH_MS);
        return () => window.clearInterval(timer);
    }, [autoRefresh, load]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 5000);
        return () => window.clearInterval(timer);
    }, []);

    const checks = useMemo(() => report?.health.checks ?? [], [report]);
    const failing = useMemo(() => checks.filter((c) => c.status !== 'ok').length, [checks]);
    const metrics = report?.metrics ?? null;

    if (loading && !report) {
        return (
            <div className='text-muted-foreground flex items-center gap-2 p-6 text-sm'>
                <Loader2 className='h-4 w-4 animate-spin' />
                {t('admin.daemonHealth.loading')}
            </div>
        );
    }

    if (!report) {
        return (
            <PageCard title={t('admin.daemonHealth.title')} icon={HeartPulse} variant='danger'>
                <p className='text-muted-foreground text-sm'>{error}</p>
                <Button className='mt-3' size='sm' variant='outline' onClick={() => void load(true)}>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {t('common.retry')}
                </Button>
            </PageCard>
        );
    }

    const status = report.status;

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.daemonHealth.title')}
                description={t(`admin.daemonHealth.description_${kind}`)}
                icon={HeartPulse}
                action={
                    <div className='flex items-center gap-3'>
                        <div className='flex items-center gap-2'>
                            <Switch
                                id={`daemon-health-auto-${kind}-${nodeId}`}
                                checked={autoRefresh}
                                onCheckedChange={setAutoRefresh}
                            />
                            <Label htmlFor={`daemon-health-auto-${kind}-${nodeId}`} className='text-xs'>
                                {t('admin.daemonHealth.auto_refresh')}
                            </Label>
                        </div>
                        <Button size='sm' variant='outline' onClick={() => void load(true)} disabled={refreshing}>
                            <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
                            {t('common.refresh')}
                        </Button>
                    </div>
                }
            >
                <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
                    <DaemonHealthBadge status={status} size='md' />
                    <span className='text-muted-foreground text-xs'>
                        {t(`admin.daemonHealth.status_hint.${status}`)}
                    </span>
                    <div className='text-muted-foreground ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
                        {report.health.latency_ms !== null ? (
                            <span>{t('admin.daemonHealth.latency', { ms: String(report.health.latency_ms) })}</span>
                        ) : null}
                        {report.health.version ? <span>v{report.health.version}</span> : null}
                        <span>{t('admin.daemonHealth.updated', { when: formatAgo(t, report.fetched_at, now) })}</span>
                    </div>
                </div>
                {error ? (
                    <div className='mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400'>
                        {error}
                    </div>
                ) : null}
                {status === 'unsupported' ? (
                    <div className='mt-4 flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-700 dark:text-sky-300'>
                        <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
                        <span>{t(`admin.daemonHealth.unsupported_${kind}`)}</span>
                    </div>
                ) : null}
                {status === 'unreachable' && report.health.error ? (
                    <div className='mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs break-all text-red-700 dark:text-red-400'>
                        {report.health.error}
                    </div>
                ) : null}
            </PageCard>

            {report.health.supported ? (
                <PageCard
                    title={t('admin.daemonHealth.checks_title')}
                    description={
                        failing > 0
                            ? t('admin.daemonHealth.checks_failing', { count: String(failing) })
                            : t('admin.daemonHealth.checks_passing')
                    }
                    icon={CheckCircle2}
                >
                    <div className='grid gap-3 md:grid-cols-2'>
                        {checks.map((check) => (
                            <CheckRow key={check.name} check={check} t={t} />
                        ))}
                    </div>
                    {!report.health.detailed ? (
                        <p className='text-muted-foreground mt-3 text-xs'>{t('admin.daemonHealth.details_hidden')}</p>
                    ) : null}
                </PageCard>
            ) : null}

            {report.host ? <HostCard host={report.host} t={t} /> : null}

            {metrics && metrics.state === 'ok' && metrics.summary ? (
                kind === 'wings' ? (
                    <WingsMetrics summary={metrics.summary as WingsSummary} t={t} now={now} />
                ) : (
                    <QuilldMetrics summary={metrics.summary as QuilldSummary} t={t} now={now} />
                )
            ) : metrics && status !== 'unreachable' ? (
                <PageCard title={t('admin.daemonHealth.metrics_title')} icon={Activity} variant='warning'>
                    <div className='space-y-1'>
                        <p className='text-sm font-medium'>{t(`admin.daemonHealth.metrics_state.${metrics.state}`)}</p>
                        <p className='text-muted-foreground text-sm'>
                            {t(`admin.daemonHealth.metrics_hint.${metrics.state}_${kind}`)}
                        </p>
                        {metrics.http_status ? (
                            <p className='text-muted-foreground font-mono text-xs'>HTTP {metrics.http_status}</p>
                        ) : null}
                    </div>
                </PageCard>
            ) : null}

            <MetricsSettingsCard kind={kind} nodeId={nodeId} report={report} onSaved={() => void load(true)} />
        </div>
    );
}
