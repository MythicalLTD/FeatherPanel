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
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/lib/format';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Cpu,
    HardDrive,
    HeartPulse,
    RefreshCw,
    Server,
    Stethoscope,
} from 'lucide-react';

interface StatusTabProps {
    nodeId: string;
}

interface HealthPayload {
    status: string;
    http_status?: number | null;
    error?: string | null;
    daemon?: {
        status?: string;
        version?: string;
        uptime_seconds?: number;
        panel_reachable?: boolean;
        last_panel_error?: string | null;
        webspaces_count?: number;
        disk_limiter?: string;
        fusequota_available?: boolean;
        cpu_percent?: number;
        memory_used_bytes?: number;
        memory_total_bytes?: number;
    } | null;
}

interface SystemPayload {
    version?: string;
    architecture?: string;
    cpu_count?: number;
    kernel_version?: string;
    os?: string;
    system?: {
        architecture?: string;
        cpu_threads?: number;
        memory_bytes?: number;
        kernel_version?: string;
        os?: string;
        os_type?: string;
    };
}

interface UtilizationPayload {
    memory_total?: number;
    memory_used?: number;
    swap_total?: number;
    swap_used?: number;
    disk_total?: number;
    disk_used?: number;
    cpu_percent?: number;
    load_average1?: number;
    load_average5?: number;
    load_average15?: number;
}

interface DiagnosticCheck {
    id: string;
    status: string;
    message: string;
    detail?: string | null;
}

function percentOf(used: number, total: number): number {
    return total > 0 ? (used / total) * 100 : 0;
}

function formatUptime(seconds?: number): string {
    if (!seconds || seconds < 0) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export function StatusTab({ nodeId }: StatusTabProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [health, setHealth] = useState<HealthPayload | null>(null);
    const [system, setSystem] = useState<SystemPayload | null>(null);
    const [utilization, setUtilization] = useState<UtilizationPayload | null>(null);
    const [checks, setChecks] = useState<DiagnosticCheck[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [healthRes, systemRes, utilRes, diagRes] = await Promise.allSettled([
                axios.get(`/api/admin/web-nodes/${nodeId}/health`),
                axios.get(`/api/admin/web-nodes/${nodeId}/system`),
                axios.get(`/api/admin/web-nodes/${nodeId}/utilization`),
                axios.get(`/api/admin/web-nodes/${nodeId}/diagnostics`),
            ]);

            if (healthRes.status === 'fulfilled' && healthRes.value.data?.success) {
                setHealth(healthRes.value.data.data.health as HealthPayload);
            } else {
                setHealth(null);
            }

            if (systemRes.status === 'fulfilled' && systemRes.value.data?.success) {
                setSystem(systemRes.value.data.data.system as SystemPayload);
            } else {
                setSystem(null);
            }

            if (utilRes.status === 'fulfilled' && utilRes.value.data?.success) {
                setUtilization(utilRes.value.data.data.utilization as UtilizationPayload);
            } else {
                setUtilization(null);
            }

            if (diagRes.status === 'fulfilled' && diagRes.value.data?.success) {
                const diag = diagRes.value.data.data.diagnostics;
                setChecks((diag?.checks || []) as DiagnosticCheck[]);
            } else {
                setChecks([]);
            }

            const anyOk =
                (healthRes.status === 'fulfilled' && healthRes.value.data?.success) ||
                (systemRes.status === 'fulfilled' && systemRes.value.data?.success) ||
                (utilRes.status === 'fulfilled' && utilRes.value.data?.success);

            if (!anyOk) {
                let msg = t('admin.webNodes.status.fetch_failed');
                const failed = [healthRes, systemRes, utilRes].find((r) => r.status === 'rejected');
                if (failed && failed.status === 'rejected' && isAxiosError(failed.reason)) {
                    msg = failed.reason.response?.data?.message || failed.reason.message || msg;
                }
                setError(msg);
            }
        } catch (e) {
            console.error(e);
            setError(t('admin.webNodes.status.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [nodeId, t]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <RefreshCw className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    if (error && !health && !system && !utilization) {
        return (
            <div className='bg-destructive/10 border-destructive/20 space-y-4 rounded-2xl border p-6 text-center'>
                <AlertCircle className='text-destructive mx-auto h-8 w-8' />
                <p className='text-destructive font-medium'>{error}</p>
                <Button variant='outline' size='sm' onClick={() => void load()}>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {t('common.retry')}
                </Button>
            </div>
        );
    }

    const healthy = health?.status === 'healthy';
    const daemon = health?.daemon;
    const cpu = utilization?.cpu_percent ?? daemon?.cpu_percent ?? 0;
    const memUsed = utilization?.memory_used ?? daemon?.memory_used_bytes ?? 0;
    const memTotal = utilization?.memory_total ?? daemon?.memory_total_bytes ?? 0;
    const diskUsed = utilization?.disk_used ?? 0;
    const diskTotal = utilization?.disk_total ?? 0;

    return (
        <div className='space-y-4'>
            <div className='flex justify-end'>
                <Button variant='outline' size='sm' onClick={() => void load()}>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {t('common.refresh')}
                </Button>
            </div>

            <PageCard title={t('admin.webNodes.status.health')} icon={HeartPulse}>
                <div className='flex flex-wrap items-center gap-3'>
                    <Badge className={healthy ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}>
                        {healthy ? (
                            <CheckCircle2 className='mr-1 h-3.5 w-3.5' />
                        ) : (
                            <AlertCircle className='mr-1 h-3.5 w-3.5' />
                        )}
                        {healthy ? t('admin.webNodes.status.online') : t('admin.webNodes.status.offline')}
                    </Badge>
                    {daemon?.version && <Badge variant='outline'>v{daemon.version}</Badge>}
                    {typeof daemon?.uptime_seconds === 'number' && (
                        <span className='text-muted-foreground text-sm'>
                            {t('admin.webNodes.status.uptime')}: {formatUptime(daemon.uptime_seconds)}
                        </span>
                    )}
                    {typeof daemon?.webspaces_count === 'number' && (
                        <span className='text-muted-foreground text-sm'>
                            {t('admin.webNodes.status.webspaces')}: {daemon.webspaces_count}
                        </span>
                    )}
                </div>
                {health?.error && <p className='text-destructive mt-3 text-sm'>{health.error}</p>}
                {daemon?.last_panel_error && (
                    <p className='mt-2 text-sm text-amber-600'>
                        {t('admin.webNodes.status.panel_error')}: {daemon.last_panel_error}
                    </p>
                )}
                <div className='text-muted-foreground mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4'>
                    <div>
                        {t('admin.webNodes.status.panel')}:{' '}
                        {daemon?.panel_reachable === false
                            ? t('admin.webNodes.status.unreachable')
                            : t('admin.webNodes.status.reachable')}
                    </div>
                    <div>
                        {t('admin.webNodes.status.disk_limiter')}: {daemon?.disk_limiter || '—'}
                    </div>
                    <div>
                        FuseQuota:{' '}
                        {daemon?.fusequota_available
                            ? t('admin.webNodes.status.available')
                            : t('admin.webNodes.status.missing')}
                    </div>
                </div>
            </PageCard>

            <PageCard title={t('admin.webNodes.status.utilization')} icon={Activity}>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                    <div className='space-y-2'>
                        <div className='flex items-center justify-between text-sm'>
                            <span className='flex items-center gap-1.5'>
                                <Cpu className='h-4 w-4' /> CPU
                            </span>
                            <span>{Number(cpu).toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(100, Number(cpu))} />
                        {utilization && (
                            <p className='text-muted-foreground text-xs'>
                                Load {utilization.load_average1?.toFixed(2)} / {utilization.load_average5?.toFixed(2)} /{' '}
                                {utilization.load_average15?.toFixed(2)}
                            </p>
                        )}
                    </div>
                    <div className='space-y-2'>
                        <div className='flex items-center justify-between text-sm'>
                            <span>{t('admin.webNodes.status.memory')}</span>
                            <span>
                                {formatBytes(memUsed)} / {formatBytes(memTotal)}
                            </span>
                        </div>
                        <Progress value={percentOf(memUsed, memTotal)} />
                    </div>
                    <div className='space-y-2'>
                        <div className='flex items-center justify-between text-sm'>
                            <span className='flex items-center gap-1.5'>
                                <HardDrive className='h-4 w-4' /> {t('admin.webNodes.status.disk')}
                            </span>
                            <span>
                                {formatBytes(diskUsed)} / {formatBytes(diskTotal)}
                            </span>
                        </div>
                        <Progress value={percentOf(diskUsed, diskTotal)} />
                    </div>
                </div>
            </PageCard>

            <PageCard title={t('admin.webNodes.status.system')} icon={Server}>
                <div className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-2'>
                    <div>
                        <span className='text-muted-foreground'>{t('admin.webNodes.status.version')}: </span>
                        {system?.version || daemon?.version || '—'}
                    </div>
                    <div>
                        <span className='text-muted-foreground'>{t('admin.webNodes.status.os')}: </span>
                        {system?.system?.os || system?.os || '—'}
                    </div>
                    <div>
                        <span className='text-muted-foreground'>{t('admin.webNodes.status.arch')}: </span>
                        {system?.system?.architecture || system?.architecture || '—'}
                    </div>
                    <div>
                        <span className='text-muted-foreground'>{t('admin.webNodes.status.kernel')}: </span>
                        {system?.system?.kernel_version || system?.kernel_version || '—'}
                    </div>
                    <div>
                        <span className='text-muted-foreground'>{t('admin.webNodes.status.cpu_threads')}: </span>
                        {system?.system?.cpu_threads || system?.cpu_count || '—'}
                    </div>
                    <div>
                        <span className='text-muted-foreground'>{t('admin.webNodes.status.host_memory')}: </span>
                        {system?.system?.memory_bytes ? formatBytes(system.system.memory_bytes) : '—'}
                    </div>
                </div>
            </PageCard>

            <PageCard title={t('admin.webNodes.status.diagnostics')} icon={Stethoscope}>
                {checks.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>{t('admin.webNodes.status.no_checks')}</p>
                ) : (
                    <div className='divide-border/50 divide-y'>
                        {checks.map((check) => (
                            <div key={check.id} className='flex items-start justify-between gap-3 py-2.5'>
                                <div className='min-w-0'>
                                    <p className='font-medium'>{check.message}</p>
                                    {check.detail && (
                                        <p className='text-muted-foreground truncate font-mono text-xs'>
                                            {check.detail}
                                        </p>
                                    )}
                                </div>
                                <Badge
                                    className={
                                        check.status === 'ok'
                                            ? 'bg-emerald-500/15 text-emerald-600'
                                            : check.status === 'warn'
                                              ? 'bg-amber-500/15 text-amber-600'
                                              : 'bg-red-500/15 text-red-600'
                                    }
                                >
                                    {check.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </PageCard>
        </div>
    );
}
