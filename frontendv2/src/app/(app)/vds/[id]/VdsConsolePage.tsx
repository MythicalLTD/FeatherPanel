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

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
import VdsPerformance from '@/components/vds/VdsPerformance';
import VdsInfoCards, { VdsNetworkCard } from '@/components/vds/VdsInfoCards';
import {
    Play,
    Square,
    RotateCw,
    Loader2,
    Monitor,
    AlertTriangle,
    Globe,
    RefreshCw,
    Info,
    Eye,
    EyeOff,
    Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VmStatus {
    status?: string;
    cpu?: number;
    cpus?: number;
    maxcpu?: number;
    mem?: number;
    maxmem?: number;
    disk?: number;
    maxdisk?: number;
    uptime?: number;
    netin?: number;
    netout?: number;
    vmid?: number;
    name?: string;
}

type TranslateFn = (key: string, params?: Record<string, string>) => string;

function formatUptime(seconds: number): string {
    if (!seconds) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
}

function getVmStatusStyles(t: TranslateFn): Record<string, { badge: string; dot: string; label: string }> {
    return {
        running: {
            badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            dot: 'bg-emerald-400',
            label: t('vds.console.status.running'),
        },
        stopped: {
            badge: 'bg-red-500/15 text-red-400 border-red-500/30',
            dot: 'bg-red-400',
            label: t('vds.console.status.stopped'),
        },
        starting: {
            badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            dot: 'bg-blue-400 animate-pulse',
            label: t('vds.console.status.starting'),
        },
        stopping: {
            badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
            dot: 'bg-orange-400 animate-pulse',
            label: t('vds.console.status.stopping'),
        },
        suspended: {
            badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
            dot: 'bg-amber-400',
            label: t('vds.console.status.suspended'),
        },
        creating: {
            badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            dot: 'bg-blue-400 animate-pulse',
            label: t('vds.console.status.creating'),
        },
        reinstalling: {
            badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            dot: 'bg-blue-400 animate-pulse',
            label: t('vds.console.status.reinstalling'),
        },
        unknown: {
            badge: 'bg-muted/50 text-muted-foreground border-border/30',
            dot: 'bg-muted-foreground',
            label: t('vds.console.status.unknown'),
        },
    };
}

function StatusBadge({ status, t }: { status: string; t: TranslateFn }) {
    const vmStatusStyles = getVmStatusStyles(t);
    const s = vmStatusStyles[status] ?? vmStatusStyles.unknown;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
                s.badge,
            )}
        >
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} />
            {s.label}
        </span>
    );
}

export default function VdsConsolePage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { instance, loading: instanceLoading, refreshInstance, hasPermission } = useVmInstance();
    const { fetchWidgets, getWidgets } = usePluginWidgets('vds-console');

    const getVdsWidgets = useCallback(
        (location: string) => {
            const stableWidgets = getWidgets('vds-console', location);
            const legacyWidgets = getWidgets(`vds-${id}`, location);

            if (legacyWidgets.length === 0) {
                return stableWidgets;
            }

            const stableKeys = new Set(stableWidgets.map((w) => `${w.plugin}:${w.id}`));
            const uniqueLegacy = legacyWidgets.filter((w) => !stableKeys.has(`${w.plugin}:${w.id}`));

            return [...stableWidgets, ...uniqueLegacy];
        },
        [getWidgets, id],
    );

    const [vmStatus, setVmStatus] = useState<VmStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [powering, setPowering] = useState<string | null>(null);
    const [vncLoading, setVncLoading] = useState(false);
    const [showAccessPassword, setShowAccessPassword] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const statusInFlightRef = useRef(false);

    const [cpuData, setCpuData] = useState<{ timestamp: number; value: number }[]>([]);
    const [memoryData, setMemoryData] = useState<{ timestamp: number; value: number }[]>([]);
    const [networkRxData, setNetworkRxData] = useState<{ timestamp: number; value: number }[]>([]);
    const [networkTxData, setNetworkTxData] = useState<{ timestamp: number; value: number }[]>([]);
    const prevStatsRef = useRef<{ netin: number; netout: number; timestamp: number } | null>(null);
    const maxDataPoints = 60;

    const fetchStatus = useCallback(async () => {
        if (!id || statusInFlightRef.current) return;
        statusInFlightRef.current = true;
        setStatusLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/status`, { timeout: 8000 });
            if (data.success) {
                const status = data.data.status as VmStatus;
                setVmStatus(status);

                const now = Date.now();
                // Proxmox returns CPU as a 0–1 fraction; charts expect percent 0–100.
                const cpuPercent = (status.cpu ?? 0) * 100;

                setCpuData((prev) => [...prev.slice(-maxDataPoints + 1), { timestamp: now, value: cpuPercent }]);
                setMemoryData((prev) => [
                    ...prev.slice(-maxDataPoints + 1),
                    { timestamp: now, value: status.mem ?? 0 },
                ]);

                if (prevStatsRef.current && status.netin != null && status.netout != null) {
                    const timeDiff = (now - prevStatsRef.current.timestamp) / 1000;
                    if (timeDiff > 0) {
                        const rxDiff = Math.max(0, status.netin - prevStatsRef.current.netin);
                        const txDiff = Math.max(0, status.netout - prevStatsRef.current.netout);

                        setNetworkRxData((prev) => [
                            ...prev.slice(-maxDataPoints + 1),
                            { timestamp: now, value: rxDiff / timeDiff },
                        ]);
                        setNetworkTxData((prev) => [
                            ...prev.slice(-maxDataPoints + 1),
                            { timestamp: now, value: txDiff / timeDiff },
                        ]);
                    }
                } else {
                    setNetworkRxData((prev) => [...prev.slice(-maxDataPoints + 1), { timestamp: now, value: 0 }]);
                    setNetworkTxData((prev) => [...prev.slice(-maxDataPoints + 1), { timestamp: now, value: 0 }]);
                }

                prevStatsRef.current = {
                    netin: status.netin ?? 0,
                    netout: status.netout ?? 0,
                    timestamp: now,
                };
            }
        } catch {
            // silent
        } finally {
            statusInFlightRef.current = false;
            setStatusLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchStatus();
        pollRef.current = setInterval(fetchStatus, 10000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchStatus]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const handlePower = async (action: 'start' | 'stop' | 'reboot') => {
        if (!id) return;
        setPowering(action);
        try {
            const res = await axios.post(`/api/user/vm-instances/${id}/power`, { action });
            const taskId = res.data?.data?.task_id as string | undefined;

            if (!taskId) {
                toast.success(t('vds.console.toast.power_completed', { action }));
                setTimeout(() => {
                    refreshInstance();
                    fetchStatus();
                    setPowering(null);
                }, 2000);
                return;
            }

            toast.info(res.data?.message ?? t('vds.console.toast.task_queued'));

            const MAX_POLLS = 120;
            let polls = 0;
            const poll = async () => {
                if (polls >= MAX_POLLS) {
                    toast.error(t('vds.console.toast.power_timeout'));
                    setPowering(null);
                    return;
                }
                polls++;
                try {
                    const statusRes = await axios.get(`/api/user/vm-instances/task-status/${taskId}`);
                    const s = statusRes.data?.data;
                    if (s?.status === 'completed') {
                        toast.success(t('vds.console.toast.power_completed', { action }));
                        refreshInstance();
                        fetchStatus();
                        setPowering(null);
                        return;
                    }
                    if (s?.status === 'failed') {
                        toast.error(
                            getApiErrorMessageFromPayload(
                                { message: s?.error, error_code: s?.error_code },
                                t,
                                'vds.console.toast.power_failed',
                            ),
                        );
                        setPowering(null);
                        return;
                    }
                } catch {
                    // ignore
                }
                setTimeout(() => {
                    void poll();
                }, 3000);
            };
            void poll();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'vds.console.toast.power_failed'));
            setPowering(null);
        }
    };

    const openVnc = async () => {
        if (!id) return;
        setVncLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/vnc-ticket`);
            if (data.success) {
                const payload = data.data;
                if (payload.pve_redirect_url) {
                    window.open(payload.pve_redirect_url, '_blank', 'noopener,noreferrer');
                } else if (payload.wss_url) {
                    toast.info(t('vds.console.toast.vnc_wss', { url: payload.wss_url }));
                }
            } else {
                toast.error(getApiErrorMessageFromPayload(data, t, 'vds.console.toast.vnc_failed'));
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'vds.console.toast.vnc_failed'));
        } finally {
            setVncLoading(false);
        }
    };

    if (instanceLoading) {
        return (
            <div className='flex min-h-[60vh] items-center justify-center'>
                <div className='flex flex-col items-center gap-4'>
                    <Loader2 className='text-primary h-10 w-10 animate-spin' />
                    <p className='text-muted-foreground animate-pulse font-medium'>{t('vds.console.loading')}</p>
                </div>
            </div>
        );
    }

    if (!instance) {
        return (
            <div className='flex min-h-[60vh] items-center justify-center'>
                <div className='space-y-4 text-center'>
                    <div className='bg-destructive/10 border-destructive/20 mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border'>
                        <AlertTriangle className='text-destructive h-10 w-10' />
                    </div>
                    <h2 className='text-2xl font-bold'>{t('vds.console.not_found_title')}</h2>
                    <p className='text-muted-foreground'>{t('vds.console.not_found_description')}</p>
                    <Button variant='outline' onClick={() => router.push('/dashboard')} className='mt-4'>
                        {t('common.goBack')}
                    </Button>
                </div>
            </div>
        );
    }

    const canPower = hasPermission('power');
    const canConsole = hasPermission('console');

    const ip = instance.ip_pool_address ?? instance.ip_address ?? null;
    const liveStatus = vmStatus?.status ?? instance.status;
    const cpuPercent = vmStatus?.cpu != null ? vmStatus.cpu * 100 : 0;
    const memUsed = vmStatus?.mem ?? null;
    const memMax =
        vmStatus?.maxmem ||
        (instance.plan_memory
            ? instance.plan_memory * 1024 * 1024
            : instance.memory
              ? instance.memory * 1024 * 1024
              : 0);
    // Proxmox returns disk=0 for QEMU VMs when the guest agent isn't reporting
    // filesystem usage — treat 0 as "no data" (null) rather than "0 bytes used".
    const diskUsed = vmStatus?.disk ? vmStatus.disk : null;
    const diskMax =
        vmStatus?.maxdisk ||
        (instance.plan_disk
            ? instance.plan_disk * 1024 * 1024 * 1024
            : instance.disk_gb
              ? instance.disk_gb * 1024 * 1024 * 1024
              : 0);
    const uptime = vmStatus?.uptime != null ? formatUptime(vmStatus.uptime) : '—';
    const canViewAccessPassword = Boolean(instance.is_owner && instance.access_password);
    const cpuCores = instance.plan_cpus ?? instance.cpus ?? 0;
    const networkRxRate = networkRxData.length ? networkRxData[networkRxData.length - 1].value : 0;
    const networkTxRate = networkTxData.length ? networkTxData[networkTxData.length - 1].value : 0;
    const networkRxTotal = vmStatus?.netin ?? 0;
    const networkTxTotal = vmStatus?.netout ?? 0;
    const statsReady = vmStatus != null;

    return (
        <div className='space-y-6 pb-12'>
            <WidgetRenderer widgets={getVdsWidgets('top-of-page')} />

            <PageHeader
                title={instance.hostname ?? t('vds.console.title')}
                description={
                    <div className='mt-1 flex flex-wrap items-center gap-2'>
                        <StatusBadge status={liveStatus} t={t} />
                        <span className='text-muted-foreground/70 border-border/30 rounded-md border px-2 py-0.5 text-xs font-medium'>
                            VMID {instance.vmid}
                        </span>
                        <span className='text-muted-foreground/70 border-border/30 rounded-md border px-2 py-0.5 text-xs font-medium'>
                            {instance.vm_type?.toUpperCase() ?? 'QEMU'}
                        </span>
                        {ip && (
                            <span className='text-muted-foreground/70 flex items-center gap-1 font-mono text-xs'>
                                <Globe className='h-3.5 w-3.5' />
                                {ip}
                            </span>
                        )}
                    </div>
                }
                actions={
                    <div className='flex flex-wrap items-center gap-2'>
                        <Button
                            variant='glass'
                            size='sm'
                            onClick={() => {
                                fetchStatus();
                                refreshInstance();
                            }}
                            disabled={statusLoading}
                        >
                            <RefreshCw className={cn('mr-1.5 h-4 w-4', statusLoading && 'animate-spin')} />
                            {t('navigation.items.refresh')}
                        </Button>

                        {canConsole && (
                            <Button
                                variant='glass'
                                size='sm'
                                onClick={openVnc}
                                disabled={vncLoading || liveStatus !== 'running'}
                            >
                                {vncLoading ? (
                                    <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                                ) : (
                                    <Monitor className='mr-1.5 h-4 w-4' />
                                )}
                                {t('vds.console.vnc_console')}
                            </Button>
                        )}

                        {canPower && (
                            <>
                                <Button
                                    variant='glass'
                                    size='sm'
                                    className='border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/10'
                                    disabled={powering !== null || liveStatus === 'running'}
                                    onClick={() => handlePower('start')}
                                >
                                    {powering === 'start' ? (
                                        <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                                    ) : (
                                        <Play className='mr-1.5 h-4 w-4' />
                                    )}
                                    {t('vds.console.power.start')}
                                </Button>
                                <Button
                                    variant='glass'
                                    size='sm'
                                    className='border-amber-400/20 text-amber-400 hover:bg-amber-400/10'
                                    disabled={powering !== null || liveStatus !== 'running'}
                                    onClick={() => handlePower('reboot')}
                                >
                                    {powering === 'reboot' ? (
                                        <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                                    ) : (
                                        <RotateCw className='mr-1.5 h-4 w-4' />
                                    )}
                                    {t('vds.console.power.reboot')}
                                </Button>
                                <Button
                                    variant='glass'
                                    size='sm'
                                    className='text-muted-foreground border-border/20 hover:bg-muted/10 hover:text-red-400'
                                    disabled={powering !== null || liveStatus === 'stopped'}
                                    onClick={() => handlePower('stop')}
                                >
                                    {powering === 'stop' ? (
                                        <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                                    ) : (
                                        <Square className='mr-1.5 h-4 w-4' />
                                    )}
                                    {t('vds.console.power.stop')}
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            <WidgetRenderer widgets={getVdsWidgets('after-header')} />

            <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
                <div className='space-y-4 lg:col-span-5'>
                    <Card className='border-border/50 bg-card/50 backdrop-blur-xl'>
                        <CardHeader className='pb-2'>
                            <CardTitle className='flex items-center gap-2 text-sm font-medium'>
                                <Info className='text-primary h-4 w-4' />
                                {t('vds.console.details.instance_details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className='pt-0'>
                            <div className='grid grid-cols-1 gap-x-4 gap-y-0 sm:grid-cols-2'>
                                {[
                                    { label: t('vds.console.details.hostname'), value: instance.hostname ?? '—' },
                                    { label: t('vds.console.details.vmid'), value: String(instance.vmid) },
                                    {
                                        label: t('vds.console.details.type'),
                                        value: instance.vm_type?.toUpperCase() ?? 'QEMU',
                                    },
                                    { label: t('vds.console.details.status'), value: liveStatus },
                                    {
                                        label: t('vds.console.details.node'),
                                        value: instance.node_name ?? instance.pve_node ?? '—',
                                    },
                                    { label: t('vds.console.details.plan'), value: instance.plan_name ?? '—' },
                                    {
                                        label: t('vds.console.details.role'),
                                        value: instance.is_owner
                                            ? t('vds.console.details.role_owner')
                                            : t('vds.console.details.role_subuser'),
                                    },
                                ].map(({ label, value }) => (
                                    <div
                                        key={label}
                                        className='border-border/10 flex items-center justify-between gap-2 border-b py-1.5'
                                    >
                                        <span className='text-muted-foreground shrink-0 text-xs font-medium'>
                                            {label}
                                        </span>
                                        <span className='truncate font-mono text-sm font-medium tabular-nums'>
                                            {value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {canViewAccessPassword && (
                                <div className='border-primary/20 bg-primary/5 mt-3 space-y-3 rounded-xl border p-4'>
                                    <div className='flex items-start justify-between gap-3'>
                                        <div className='space-y-1'>
                                            <div className='text-primary/80 flex items-center gap-2 text-sm font-medium'>
                                                <Lock className='h-4 w-4' />
                                                {t('vds.console.password.title')}
                                            </div>
                                            <p className='text-muted-foreground text-xs'>
                                                {t('vds.console.password.description')}
                                            </p>
                                        </div>
                                        <Button
                                            variant='glass'
                                            size='sm'
                                            onClick={() => setShowAccessPassword((value) => !value)}
                                        >
                                            {showAccessPassword ? (
                                                <EyeOff className='mr-1.5 h-4 w-4' />
                                            ) : (
                                                <Eye className='mr-1.5 h-4 w-4' />
                                            )}
                                            {showAccessPassword ? t('common.hide') : t('common.show')}
                                        </Button>
                                    </div>
                                    <div className='border-border/20 bg-background/60 rounded-lg border px-4 py-3'>
                                        <span
                                            className={cn(
                                                'font-mono text-sm font-medium tracking-wide transition-all duration-200',
                                                !showAccessPassword && 'blur-sm select-none',
                                            )}
                                        >
                                            {instance.access_password}
                                        </span>
                                    </div>
                                    <p className='text-xs text-amber-300/90'>{t('vds.console.password.change_asap')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <VdsNetworkCard
                        ipAddress={ip}
                        uptime={uptime}
                        statsReady={statsReady}
                        networkRx={networkRxRate}
                        networkTx={networkTxRate}
                        networkRxTotal={networkRxTotal}
                        networkTxTotal={networkTxTotal}
                    />
                </div>

                <div className='lg:col-span-7'>
                    <VdsInfoCards
                        statsReady={statsReady}
                        cpuUsage={cpuPercent}
                        cpuCores={cpuCores}
                        memoryUsage={memUsed}
                        memoryLimit={memMax}
                        diskUsage={diskUsed}
                        diskLimit={diskMax}
                        liveStatus={liveStatus}
                        canConsole={canConsole}
                        canPower={canPower}
                        powering={powering}
                        vncLoading={vncLoading}
                        onStart={() => handlePower('start')}
                        onOpenVnc={openVnc}
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getVdsWidgets('after-stats')} />

            <VdsPerformance
                cpuData={cpuData}
                memoryData={memoryData}
                networkRxData={networkRxData}
                networkTxData={networkTxData}
                cpuCores={cpuCores}
                memoryLimit={
                    instance.plan_memory
                        ? instance.plan_memory * 1024 * 1024
                        : instance.memory
                          ? instance.memory * 1024 * 1024
                          : 0
                }
                networkRxTotal={networkRxTotal}
                networkTxTotal={networkTxTotal}
            />
        </div>
    );
}
