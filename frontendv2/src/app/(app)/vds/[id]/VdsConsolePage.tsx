/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
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
import VdsPerformance from '@/components/vds/VdsPerformance';
import {
    Server,
    Play,
    Square,
    RotateCw,
    Loader2,
    HardDrive,
    Database,
    Monitor,
    Activity as ActivityIcon,
    AlertTriangle,
    Globe,
    Terminal,
    RefreshCw,
    Info,
    Zap,
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

function formatMemory(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
}

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

function formatNetwork(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
}

const vmStatusStyles: Record<string, { badge: string; dot: string; label: string }> = {
    running: {
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
        label: 'Running',
    },
    stopped: { badge: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400', label: 'Stopped' },
    starting: {
        badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        dot: 'bg-blue-400 animate-pulse',
        label: 'Starting',
    },
    stopping: {
        badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        dot: 'bg-orange-400 animate-pulse',
        label: 'Stopping',
    },
    suspended: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400', label: 'Suspended' },
    creating: {
        badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        dot: 'bg-blue-400 animate-pulse',
        label: 'Creating',
    },
    reinstalling: {
        badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        dot: 'bg-blue-400 animate-pulse',
        label: 'Reinstalling',
    },
    unknown: {
        badge: 'bg-muted/50 text-muted-foreground border-border/30',
        dot: 'bg-muted-foreground',
        label: 'Unknown',
    },
};

function StatusBadge({ status }: { status: string }) {
    const s = vmStatusStyles[status] ?? vmStatusStyles.unknown;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full border',
                s.badge,
            )}
        >
            <span className={cn('h-2 w-2 rounded-full shrink-0', s.dot)} />
            {s.label}
        </span>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <Card className='border-border/30 bg-card/60 backdrop-blur-sm shadow-sm'>
            <CardContent className='flex items-center gap-4 py-4'>
                <div className='h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary'>
                    <Icon className='h-5 w-5' />
                </div>
                <div className='flex flex-col gap-1'>
                    <span className='text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                        {label}
                    </span>
                    <div className='flex items-baseline gap-2'>
                        <span className='text-xl font-semibold'>{value}</span>
                        {sub && <span className='text-xs text-muted-foreground'>{sub}</span>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function VdsConsolePage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { instance, loading: instanceLoading, refreshInstance, hasPermission } = useVmInstance();
    const { fetchWidgets, getWidgets } = usePluginWidgets(`vds-${id}`);

    const [vmStatus, setVmStatus] = useState<VmStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [powering, setPowering] = useState<string | null>(null);
    const [vncLoading, setVncLoading] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [cpuData, setCpuData] = useState<{ timestamp: number; value: number }[]>([]);
    const [memoryData, setMemoryData] = useState<{ timestamp: number; value: number }[]>([]);
    const [networkRxData, setNetworkRxData] = useState<{ timestamp: number; value: number }[]>([]);
    const [networkTxData, setNetworkTxData] = useState<{ timestamp: number; value: number }[]>([]);
    const prevStatsRef = useRef<{ netin: number; netout: number; timestamp: number } | null>(null);
    const maxDataPoints = 60;

    const fetchStatus = useCallback(async () => {
        if (!id) return;
        setStatusLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/status`);
            if (data.success) {
                const status = data.data.status as VmStatus;
                setVmStatus(status);

                const now = Date.now();

                setCpuData((prev) => [...prev.slice(-maxDataPoints + 1), { timestamp: now, value: status.cpu ?? 0 }]);
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
                toast.success(`Power action "${action}" completed`);
                setTimeout(() => {
                    refreshInstance();
                    fetchStatus();
                }, 2000);
                return;
            }

            toast.info(res.data?.message ?? 'Task added to queue');

            // Poll until task is completed or failed
            const MAX_POLLS = 120; // 6 minutes at 3s interval
            let polls = 0;
            const poll = async () => {
                if (polls >= MAX_POLLS) {
                    toast.error('Power action timed out');
                    setPowering(null);
                    return;
                }
                polls++;
                try {
                    const statusRes = await axios.get(`/api/user/vm-instances/task-status/${taskId}`);
                    const s = statusRes.data?.data;
                    if (s?.status === 'completed') {
                        toast.success(`Power action "${action}" completed`);
                        refreshInstance();
                        fetchStatus();
                        setPowering(null);
                        return;
                    }
                    if (s?.status === 'failed') {
                        toast.error(s?.error ?? 'Power action failed');
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
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
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
                    toast.info(`VNC WSS: ${payload.wss_url}`);
                }
            } else {
                toast.error(data.message || 'Failed to get VNC ticket');
            }
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setVncLoading(false);
        }
    };

    if (instanceLoading) {
        return (
            <div className='flex items-center justify-center min-h-[60vh]'>
                <div className='flex flex-col items-center gap-4'>
                    <Loader2 className='h-10 w-10 animate-spin text-primary' />
                    <p className='text-muted-foreground font-medium animate-pulse'>Loading VDS instance…</p>
                </div>
            </div>
        );
    }

    if (!instance) {
        return (
            <div className='flex items-center justify-center min-h-[60vh]'>
                <div className='text-center space-y-4'>
                    <div className='h-20 w-20 mx-auto rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center'>
                        <AlertTriangle className='h-10 w-10 text-destructive' />
                    </div>
                    <h2 className='text-2xl font-black'>VDS Not Found</h2>
                    <p className='text-muted-foreground'>This VDS instance does not exist or you do not have access.</p>
                    <Button variant='outline' onClick={() => router.push('/dashboard')} className='mt-4'>
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const canPower = hasPermission('power');
    const canConsole = hasPermission('console');

    const ip = instance.ip_pool_address ?? instance.ip_address ?? null;
    const liveStatus = vmStatus?.status ?? instance.status;
    const cpuPercent = vmStatus?.cpu != null ? (vmStatus.cpu * 100).toFixed(1) : null;
    const memUsed = vmStatus?.mem ?? null;
    const memMax = vmStatus?.maxmem ?? (instance.plan_memory ? instance.plan_memory * 1024 * 1024 : null);
    const diskUsed = vmStatus?.disk ?? null;
    const diskMax = vmStatus?.maxdisk ?? (instance.plan_disk ? instance.plan_disk * 1024 * 1024 * 1024 : null);
    const uptime = vmStatus?.uptime ?? null;

    return (
        <div className='space-y-8 pb-12'>
            <WidgetRenderer widgets={getWidgets(`vds-${id}`, 'top-of-page')} />

            <PageHeader
                title={instance.hostname ?? t('vds.console.title')}
                description={
                    <div className='flex flex-wrap items-center gap-3 mt-1'>
                        <StatusBadge status={liveStatus} />
                        <span className='text-xs font-black uppercase tracking-widest text-muted-foreground/50 border border-border/20 rounded-full px-2 py-0.5'>
                            VMID {instance.vmid}
                        </span>
                        <span className='text-xs font-black uppercase tracking-widest text-muted-foreground/50 border border-border/20 rounded-full px-2 py-0.5'>
                            {instance.vm_type?.toUpperCase() ?? 'QEMU'}
                        </span>
                        {ip && (
                            <span className='text-xs font-mono text-muted-foreground/70 flex items-center gap-1'>
                                <Globe className='h-3.5 w-3.5' />
                                {ip}
                            </span>
                        )}
                    </div>
                }
                actions={
                    <div className='flex items-center gap-2 flex-wrap'>
                        <Button
                            variant='glass'
                            size='sm'
                            onClick={() => {
                                fetchStatus();
                                refreshInstance();
                            }}
                            disabled={statusLoading}
                        >
                            <RefreshCw className={cn('h-4 w-4 mr-1.5', statusLoading && 'animate-spin')} />
                            {t('navigation.items.refresh') || 'Refresh'}
                        </Button>

                        {canConsole && (
                            <Button
                                variant='glass'
                                size='sm'
                                onClick={openVnc}
                                disabled={vncLoading || liveStatus !== 'running'}
                            >
                                {vncLoading ? (
                                    <Loader2 className='h-4 w-4 mr-1.5 animate-spin' />
                                ) : (
                                    <Monitor className='h-4 w-4 mr-1.5' />
                                )}
                                {t('vds.console.vnc_console') || 'Open Console'}
                            </Button>
                        )}

                        {canPower && (
                            <>
                                <Button
                                    variant='glass'
                                    size='sm'
                                    className='text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/10'
                                    disabled={powering !== null || liveStatus === 'running'}
                                    onClick={() => handlePower('start')}
                                >
                                    {powering === 'start' ? (
                                        <Loader2 className='h-4 w-4 mr-1.5 animate-spin' />
                                    ) : (
                                        <Play className='h-4 w-4 mr-1.5' />
                                    )}
                                    {t('vds.console.power.start')}
                                </Button>
                                <Button
                                    variant='glass'
                                    size='sm'
                                    className='text-amber-400 border-amber-400/20 hover:bg-amber-400/10'
                                    disabled={powering !== null || liveStatus !== 'running'}
                                    onClick={() => handlePower('reboot')}
                                >
                                    {powering === 'reboot' ? (
                                        <Loader2 className='h-4 w-4 mr-1.5 animate-spin' />
                                    ) : (
                                        <RotateCw className='h-4 w-4 mr-1.5' />
                                    )}
                                    {t('vds.console.power.reboot')}
                                </Button>
                                <Button
                                    variant='glass'
                                    size='sm'
                                    className='text-red-400 border-red-400/20 hover:bg-red-400/10'
                                    disabled={powering !== null || liveStatus === 'stopped'}
                                    onClick={() => handlePower('stop')}
                                >
                                    {powering === 'stop' ? (
                                        <Loader2 className='h-4 w-4 mr-1.5 animate-spin' />
                                    ) : (
                                        <Square className='h-4 w-4 mr-1.5' />
                                    )}
                                    {t('vds.console.power.kill')}
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets(`vds-${id}`, 'after-header')} />

            <VdsPerformance
                cpuData={cpuData}
                memoryData={memoryData}
                networkRxData={networkRxData}
                networkTxData={networkTxData}
                cpuLimit={instance.plan_cpus ?? 0}
                memoryLimit={instance.plan_memory ? instance.plan_memory * 1024 * 1024 : 0}
            />

            <div className='grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6'>
                <StatCard
                    icon={Zap}
                    label={t('vds.console.performance.cpu')}
                    value={cpuPercent != null ? `${cpuPercent}%` : '—'}
                    sub={`${instance.plan_cpus ?? '?'} × ${instance.plan_cores ?? 1} vCPU`}
                />
                <StatCard
                    icon={Database}
                    label={t('vds.console.performance.memory')}
                    value={memUsed != null ? formatMemory(memUsed) : '—'}
                    sub={memMax != null ? `/ ${formatMemory(memMax)}` : `${instance.plan_memory ?? '?'} MB plan`}
                />
                <StatCard
                    icon={HardDrive}
                    label={t('vds.console.performance.disk') || 'Disk'}
                    value={diskUsed != null ? formatMemory(diskUsed) : '—'}
                    sub={diskMax != null ? `/ ${formatMemory(diskMax)}` : `${instance.plan_disk ?? '?'} GB plan`}
                />
                <StatCard
                    icon={Globe}
                    label={t('vds.console.performance.network_rx')}
                    value={vmStatus?.netin != null ? formatNetwork(vmStatus.netin) : '—'}
                />
                <StatCard
                    icon={Globe}
                    label={t('vds.console.performance.network_tx')}
                    value={vmStatus?.netout != null ? formatNetwork(vmStatus.netout) : '—'}
                />
                <StatCard
                    icon={ActivityIcon}
                    label={t('vds.console.performance.uptime')}
                    value={uptime != null ? formatUptime(uptime) : '—'}
                />
            </div>

            <WidgetRenderer widgets={getWidgets(`vds-${id}`, 'after-stats')} />

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                <Card className='border-border/20 bg-card/30 backdrop-blur-sm'>
                    <CardHeader className='pb-4'>
                        <CardTitle className='text-sm font-black uppercase tracking-widest flex items-center gap-2'>
                            <Info className='h-4 w-4 text-primary' />
                            Instance Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                        {[
                            { label: 'Hostname', value: instance.hostname ?? '—' },
                            { label: 'VMID', value: String(instance.vmid) },
                            { label: 'Type', value: instance.vm_type?.toUpperCase() ?? 'QEMU' },
                            { label: 'Status', value: liveStatus },
                            { label: 'IP Address', value: ip ?? '—' },
                            { label: 'Node', value: instance.node_name ?? instance.pve_node ?? '—' },
                            { label: 'Plan', value: instance.plan_name ?? '—' },
                            { label: 'Role', value: instance.is_owner ? 'Owner' : 'Subuser' },
                        ].map(({ label, value }) => (
                            <div
                                key={label}
                                className='flex items-center justify-between py-2 border-b border-border/10 last:border-0'
                            >
                                <span className='text-xs font-black uppercase tracking-wider text-muted-foreground/60'>
                                    {label}
                                </span>
                                <span className='text-sm font-bold font-mono'>{value}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className='border-border/20 bg-card/30 backdrop-blur-sm'>
                    <CardHeader className='pb-4'>
                        <CardTitle className='text-sm font-black uppercase tracking-widest flex items-center gap-2'>
                            <Terminal className='h-4 w-4 text-primary' />
                            Console Access
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col items-center justify-center py-12 gap-6 text-center'>
                        {!canConsole ? (
                            <>
                                <div className='h-20 w-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center'>
                                    <AlertTriangle className='h-10 w-10 text-amber-400' />
                                </div>
                                <div>
                                    <p className='text-lg font-black'>No Console Access</p>
                                    <p className='text-muted-foreground text-sm mt-1'>
                                        Subusers do not currently have console access to VDS instances.
                                    </p>
                                </div>
                            </>
                        ) : liveStatus !== 'running' ? (
                            <>
                                <div className='h-20 w-20 rounded-3xl bg-muted/20 border border-border/20 flex items-center justify-center'>
                                    <Server className='h-10 w-10 text-muted-foreground' />
                                </div>
                                <div>
                                    <p className='text-lg font-black'>VDS is Offline</p>
                                    <p className='text-muted-foreground text-sm mt-1'>
                                        Start the VDS instance to access the VNC console.
                                    </p>
                                </div>
                                {canPower && (
                                    <Button
                                        onClick={() => handlePower('start')}
                                        disabled={powering !== null}
                                        className='mt-2'
                                    >
                                        {powering === 'start' ? (
                                            <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                        ) : (
                                            <Play className='h-4 w-4 mr-2' />
                                        )}
                                        Start Instance
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <div className='h-20 w-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center'>
                                    <Monitor className='h-10 w-10 text-emerald-400' />
                                </div>
                                <div>
                                    <p className='text-lg font-black'>VNC Console Ready</p>
                                    <p className='text-muted-foreground text-sm mt-1'>
                                        Click below to open the graphical console in a new tab.
                                    </p>
                                </div>
                                <Button onClick={openVnc} disabled={vncLoading} className='mt-2 px-8'>
                                    {vncLoading ? (
                                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                    ) : (
                                        <Monitor className='h-4 w-4 mr-2' />
                                    )}
                                    Open VNC Console
                                </Button>
                                <p className='text-xs text-muted-foreground opacity-50'>
                                    Opens in a new browser tab via Proxmox noVNC
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
