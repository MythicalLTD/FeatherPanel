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

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    HeartPulse,
    Database,
    Zap,
    Server,
    Clock,
    Inbox,
    HardDrive,
    Info,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    XCircle,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatFileSize, cn } from '@/lib/utils';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';

type Status = 'ok' | 'warn' | 'down';

interface Check {
    status: Status;
    message?: string;
    took_ms: number;
    details?: Record<string, unknown>;
}

interface HealthData {
    status: Status;
    checked_at: string;
    checks: Record<'database' | 'redis' | 'nodes' | 'crons' | 'queue' | 'disk', Check>;
    versions: Record<string, string | null>;
}

const STATUS_STYLE: Record<Status, { icon: typeof CheckCircle2; className: string }> = {
    ok: { icon: CheckCircle2, className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
    warn: { icon: AlertTriangle, className: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
    down: { icon: XCircle, className: 'text-red-500 bg-red-500/10 border-red-500/30' },
};

function StatusPill({ status, label }: { status: Status; label: string }) {
    const style = STATUS_STYLE[status] ?? STATUS_STYLE.down;
    const Icon = style.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs', style.className)}>
            <Icon className='h-3.5 w-3.5' />
            {label}
        </span>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className='flex items-center justify-between gap-3 py-1 text-sm'>
            <span className='text-muted-foreground'>{label}</span>
            <span className='min-w-0 truncate text-right font-medium'>{value ?? '-'}</span>
        </div>
    );
}

export default function AdminHealthPage() {
    const { t, locale } = useTranslation();
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/health');
            setData(res.data.data);
        } catch (error) {
            setData(null);
            // A 5xx here usually means the database itself is down.
            toast.error(getApiErrorMessage(error, t, 'adminHealth.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
        const timer = window.setInterval(() => void load(), 60000);
        return () => window.clearInterval(timer);
    }, [load]);

    const time = (iso?: unknown) =>
        typeof iso === 'string' && iso ? new Date(iso).toLocaleString(locale || undefined) : t('adminHealth.never');
    const statusLabel = (s: Status) => t(`adminHealth.status.${s}`);

    const card = (
        key: keyof HealthData['checks'],
        icon: typeof Database,
        body: (d: Record<string, unknown>) => React.ReactNode,
    ) => {
        const check = data?.checks[key];
        const Icon = icon;
        return (
            <section key={key} className='fp-surface rounded-2xl border p-5'>
                <div className='mb-3 flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-2'>
                        <Icon className='text-primary h-4 w-4' />
                        <h2 className='font-semibold'>{t(`adminHealth.checks.${key}`)}</h2>
                    </div>
                    {check && <StatusPill status={check.status} label={statusLabel(check.status)} />}
                </div>
                {check?.message && <p className='mb-2 text-sm break-words text-red-500'>{check.message}</p>}
                {check?.details && body(check.details)}
                {check && (
                    <p className='text-muted-foreground mt-2 text-[11px]'>
                        {t('adminHealth.took', { ms: String(check.took_ms) })}
                    </p>
                )}
            </section>
        );
    };

    const num = (v: unknown) => (typeof v === 'number' ? v : null);

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('adminHealth.title')}
                description={t('adminHealth.description')}
                icon={HeartPulse}
                actions={
                    <Button variant='outline' onClick={load} disabled={loading}>
                        <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                        {t('common.refresh')}
                    </Button>
                }
            />

            {data && (
                <div
                    className={cn(
                        'flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4',
                        STATUS_STYLE[data.status].className,
                    )}
                >
                    <p className='font-semibold'>{t(`adminHealth.overall.${data.status}`)}</p>
                    <p className='text-xs opacity-80'>{t('adminHealth.checkedAt', { time: time(data.checked_at) })}</p>
                </div>
            )}

            {!data && !loading && (
                <p className='text-muted-foreground py-12 text-center text-sm'>{t('adminHealth.loadFailed')}</p>
            )}

            {data && (
                <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                    {card('database', Database, (d) => (
                        <>
                            <Row
                                label={t('adminHealth.labels.size')}
                                value={num(d.size_bytes) !== null ? formatFileSize(num(d.size_bytes)!) : null}
                            />
                            <Row label={t('adminHealth.labels.connections')} value={num(d.connections)} />
                        </>
                    ))}
                    {card('redis', Zap, (d) => (
                        <>
                            <Row label={t('adminHealth.labels.version')} value={d.version as string} />
                            <Row
                                label={t('adminHealth.labels.memory')}
                                value={num(d.used_memory) !== null ? formatFileSize(num(d.used_memory)!) : null}
                            />
                            <Row label={t('adminHealth.labels.clients')} value={num(d.clients)} />
                        </>
                    ))}
                    {card('queue', Inbox, (d) => (
                        <>
                            <Row label={t('adminHealth.labels.mailPending')} value={num(d.mail_pending)} />
                            <Row label={t('adminHealth.labels.mailFailed')} value={num(d.mail_failed)} />
                            <Row
                                label={t('adminHealth.labels.oldestPending')}
                                value={d.mail_oldest_pending_at ? time(d.mail_oldest_pending_at) : '-'}
                            />
                            <Row
                                label={t('adminHealth.labels.autoStartPending')}
                                value={num(d.server_auto_start_pending)}
                            />
                        </>
                    ))}
                    {card('nodes', Server, (d) => {
                        const nodes =
                            (d.nodes as Array<{ id: number; name: string; healthy: boolean; error?: string | null }>) ??
                            [];
                        return (
                            <>
                                <Row label={t('adminHealth.labels.nodesTotal')} value={num(d.total)} />
                                <Row label={t('adminHealth.labels.nodesUnhealthy')} value={num(d.unhealthy)} />
                                <ul className='mt-2 max-h-48 space-y-1 overflow-y-auto'>
                                    {nodes.map((n) => (
                                        <li key={n.id} className='flex items-center justify-between gap-2 text-sm'>
                                            <span className='truncate'>{n.name}</span>
                                            <StatusPill
                                                status={n.healthy ? 'ok' : 'down'}
                                                label={n.healthy ? statusLabel('ok') : statusLabel('down')}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </>
                        );
                    })}
                    {card('disk', HardDrive, (d) => {
                        const volumes =
                            (d.volumes as Array<{
                                label: string;
                                path: string;
                                total: number;
                                free: number;
                                used_percent: number;
                            }>) ?? [];
                        return (
                            <div className='space-y-3'>
                                {volumes.map((v) => (
                                    <div key={v.label}>
                                        <div className='mb-1 flex justify-between text-sm'>
                                            <span className='text-muted-foreground font-mono text-xs'>{v.path}</span>
                                            <span>{v.used_percent}%</span>
                                        </div>
                                        <div className='bg-muted h-2 overflow-hidden rounded-full'>
                                            <div
                                                className={cn(
                                                    'h-full',
                                                    v.used_percent >= 95
                                                        ? 'bg-red-500'
                                                        : v.used_percent >= 85
                                                          ? 'bg-amber-500'
                                                          : 'bg-primary',
                                                )}
                                                style={{ width: `${Math.min(100, v.used_percent)}%` }}
                                            />
                                        </div>
                                        <p className='text-muted-foreground mt-1 text-xs'>
                                            {t('adminHealth.labels.freeOf', {
                                                free: formatFileSize(v.free),
                                                total: formatFileSize(v.total),
                                            })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                    <section className='fp-surface rounded-2xl border p-5'>
                        <div className='mb-3 flex items-center gap-2'>
                            <Info className='text-primary h-4 w-4' />
                            <h2 className='font-semibold'>{t('adminHealth.versions')}</h2>
                        </div>
                        {Object.entries(data.versions).map(([k, v]) => (
                            <Row key={k} label={t(`adminHealth.versionLabels.${k}`)} value={v} />
                        ))}
                    </section>
                    <div className='md:col-span-2 xl:col-span-3'>
                        {card('crons', Clock, (d) => {
                            const tasks =
                                (d.tasks as Array<{
                                    name: string;
                                    last_run_at: string | null;
                                    success: boolean;
                                    stale: boolean;
                                    message?: string | null;
                                }>) ?? [];
                            return (
                                <>
                                    <Row label={t('adminHealth.labels.heartbeat')} value={time(d.last_heartbeat_at)} />
                                    <div className='mt-3 overflow-x-auto'>
                                        <table className='w-full text-sm'>
                                            <thead className='text-muted-foreground text-left text-xs'>
                                                <tr>
                                                    <th className='py-1 pr-3 font-medium'>
                                                        {t('adminHealth.labels.task')}
                                                    </th>
                                                    <th className='py-1 pr-3 font-medium'>
                                                        {t('adminHealth.labels.lastRun')}
                                                    </th>
                                                    <th className='py-1 font-medium'>
                                                        {t('adminHealth.labels.result')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tasks.map((task) => (
                                                    <tr
                                                        key={task.name}
                                                        className='border-border/40 border-t'
                                                        title={task.message ?? undefined}
                                                    >
                                                        <td className='py-1.5 pr-3 font-mono text-xs'>{task.name}</td>
                                                        <td className='py-1.5 pr-3 whitespace-nowrap'>
                                                            {time(task.last_run_at)}
                                                        </td>
                                                        <td className='py-1.5'>
                                                            <StatusPill
                                                                status={
                                                                    !task.success ? 'down' : task.stale ? 'warn' : 'ok'
                                                                }
                                                                label={
                                                                    !task.success
                                                                        ? t('adminHealth.task.failed')
                                                                        : task.stale
                                                                          ? t('adminHealth.task.stale')
                                                                          : statusLabel('ok')
                                                                }
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
