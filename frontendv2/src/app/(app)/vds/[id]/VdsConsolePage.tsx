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
import { Button } from '@/components/featherui/Button';
import { EmptyState } from '@/components/featherui/EmptyState';
import { PageCard } from '@/components/featherui/PageCard';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import ServerHeader from '@/components/server/ServerHeader';
import ServerConsoleStats from '@/components/server/ServerConsoleStats';
import { toast } from 'sonner';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
import VdsPerformance from '@/components/vds/VdsPerformance';
import { VdsScreen } from '@/components/vds/VdsScreen';
import { VdsResourceGraphs } from '@/components/vds/VdsResourceGraphs';
import { useVdsFeatures } from '@/hooks/useVdsFeatures';
import { VdsPageLoading } from '@/components/vds/VdsPageLoading';
import { Monitor, AlertTriangle, RefreshCw, Info, Eye, EyeOff, Lock, Copy, Check } from 'lucide-react';
import { cn, copyToClipboard } from '@/lib/utils';
import { ServiceExpiryChip } from '@/components/common/ServiceExpiryChip';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatExpiryAbsolute } from '@/lib/service-expiry';

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
    diskread?: number;
    diskwrite?: number;
    vmid?: number;
    name?: string;
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

export default function VdsConsolePage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const { instance, loading: instanceLoading, refreshInstance, hasPermission } = useVmInstance();
    const features = useVdsFeatures(instance?.id);
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
    const [statusError, setStatusError] = useState(false);
    const [powering, setPowering] = useState<string | null>(null);
    const [vncLoading, setVncLoading] = useState(false);
    const [vncUrl, setVncUrl] = useState<string | null>(null);
    const [vncPassword, setVncPassword] = useState<string | null>(null);
    const [showAccessPassword, setShowAccessPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const statusInFlightRef = useRef(false);

    const [cpuData, setCpuData] = useState<{ timestamp: number; value: number }[]>([]);
    const [memoryData, setMemoryData] = useState<{ timestamp: number; value: number }[]>([]);
    const [networkRxData, setNetworkRxData] = useState<{ timestamp: number; value: number }[]>([]);
    const [networkTxData, setNetworkTxData] = useState<{ timestamp: number; value: number }[]>([]);
    const [diskData, setDiskData] = useState<{ timestamp: number; value: number }[]>([]);
    const [diskIoData, setDiskIoData] = useState<{ timestamp: number; value: number }[]>([]);
    const [diskIoRate, setDiskIoRate] = useState<{ read: number; write: number } | null>(null);
    const prevStatsRef = useRef<{
        netin: number;
        netout: number;
        diskread: number;
        diskwrite: number;
        timestamp: number;
    } | null>(null);
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

                // Proxmox reports disk=0 for QEMU guests without the agent; only chart real values (MiB).
                if (status.disk) {
                    const diskMib = status.disk / 1024 / 1024;
                    setDiskData((prev) => [...prev.slice(-maxDataPoints + 1), { timestamp: now, value: diskMib }]);
                }

                if (prevStatsRef.current && status.diskread != null && status.diskwrite != null) {
                    const dt = (now - prevStatsRef.current.timestamp) / 1000;
                    if (dt > 0) {
                        const read = Math.max(0, status.diskread - prevStatsRef.current.diskread) / dt;
                        const write = Math.max(0, status.diskwrite - prevStatsRef.current.diskwrite) / dt;
                        setDiskIoRate({ read, write });
                        setDiskIoData((prev) => [
                            ...prev.slice(-maxDataPoints + 1),
                            { timestamp: now, value: read + write },
                        ]);
                    }
                }

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
                    diskread: status.diskread ?? 0,
                    diskwrite: status.diskwrite ?? 0,
                    timestamp: now,
                };
            }
            setStatusError(!data.success);
        } catch {
            // Keep the last known values; just flag that live stats are unreachable.
            setStatusError(true);
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

    /**
     * Requests a VNC ticket and opens the console.
     *
     * Panel-proxied mode (`wss_url`) embeds noVNC in-page; the legacy
     * `pve_redirect_url` mode still opens Proxmox in a new tab.
     */
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
                    setVncPassword(typeof payload.ticket === 'string' ? payload.ticket : null);
                    setVncUrl(payload.wss_url);
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
        return <VdsPageLoading label={t('vds.console.loading')} />;
    }

    if (!instance) {
        return (
            <div className='flex min-h-[60vh] items-center justify-center'>
                <EmptyState
                    icon={AlertTriangle}
                    title={t('vds.console.not_found_title')}
                    description={t('vds.console.not_found_description')}
                    action={
                        <Button variant='outline' onClick={() => router.push('/dashboard')}>
                            {t('common.goBack')}
                        </Button>
                    }
                />
            </div>
        );
    }

    const canPower = hasPermission('power');
    const canConsole = hasPermission('console');

    const ip = instance.ip_pool_address ?? instance.ip_address ?? null;
    const liveStatus = vmStatus?.status ?? instance.status;
    // While a power task runs, show the transitional state the way game servers do.
    const displayStatus =
        powering === 'start' ? 'starting' : powering === 'stop' || powering === 'reboot' ? 'stopping' : liveStatus;
    const MiB = 1024 * 1024;
    const cpuCores = instance.plan_cpus ?? instance.cpus ?? vmStatus?.maxcpu ?? 0;
    const memLimitMib = vmStatus?.maxmem ? vmStatus.maxmem / MiB : (instance.plan_memory ?? instance.memory ?? 0);
    // Proxmox returns disk=0 for QEMU VMs when the guest agent isn't reporting
    // filesystem usage - treat 0 as "no data" rather than "0 bytes used".
    const diskReady = Boolean(vmStatus?.disk);
    const diskLimitMib = vmStatus?.maxdisk
        ? vmStatus.maxdisk / MiB
        : (instance.plan_disk ?? instance.disk_gb ?? 0) * 1024;
    const uptime = vmStatus?.uptime ? formatUptime(vmStatus.uptime) : undefined;
    const canViewAccessPassword = Boolean(instance.is_owner && instance.access_password);
    const networkRxRate = networkRxData.length ? networkRxData[networkRxData.length - 1].value : 0;
    const networkTxRate = networkTxData.length ? networkTxData[networkTxData.length - 1].value : 0;
    const networkRxTotal = vmStatus?.netin ?? 0;
    const networkTxTotal = vmStatus?.netout ?? 0;
    const statsReady = vmStatus != null;
    // ServerConsoleStats uses game-server units: CPU percent where 100 = one core, memory/disk in MiB.
    const cpuScale = cpuCores > 0 ? cpuCores * 100 : 100;
    const statusLabel = t(`vds.console.status.${displayStatus}`, { defaultValue: displayStatus });

    const details: { label: string; value: string; mono?: boolean }[] = [
        { label: t('vds.console.details.hostname'), value: instance.hostname ?? '—' },
        { label: t('vds.console.details.vmid'), value: String(instance.vmid), mono: true },
        { label: t('vds.console.details.type'), value: instance.vm_type?.toUpperCase() ?? 'QEMU' },
        { label: t('vds.console.details.status'), value: statusLabel },
        { label: t('vds.console.details.node'), value: instance.node_name ?? instance.pve_node ?? '—' },
        { label: t('vds.console.details.plan'), value: instance.plan_name ?? '—' },
        { label: t('vds.console.details.ip'), value: ip ?? '—', mono: true },
        {
            label: t('vds.console.details.role'),
            value: instance.is_owner ? t('vds.console.details.role_owner') : t('vds.console.details.role_subuser'),
        },
    ];

    const copyPassword = async () => {
        if (!instance.access_password) return;
        await copyToClipboard(instance.access_password, t);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className='space-y-4 pb-12'>
            <WidgetRenderer widgets={getVdsWidgets('top-of-page')} />

            <ServerHeader
                serverName={instance.hostname ?? t('vds.console.title')}
                serverStatus={displayStatus}
                statusLabel={statusLabel}
                description={instance.plan_name ?? undefined}
                icon={Monitor}
                address={ip ?? undefined}
                uptime={uptime}
                expiresAt={instance.expires_at}
                nodeName={instance.node_name ?? instance.pve_node ?? undefined}
                spellName={`${instance.vm_type?.toUpperCase() ?? 'QEMU'} · VMID ${instance.vmid}`}
                canStart={canPower}
                canRestart={canPower}
                canStop={canPower}
                connectionLive={powering === null}
                onStart={() => handlePower('start')}
                onRestart={() => handlePower('reboot')}
                onStop={() => handlePower('stop')}
                extraActions={
                    <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                            fetchStatus();
                            refreshInstance();
                        }}
                        disabled={statusLoading}
                        aria-label={t('navigation.items.refresh')}
                        title={t('navigation.items.refresh')}
                    >
                        <RefreshCw className={cn('h-4 w-4', statusLoading && 'animate-spin')} />
                    </Button>
                }
            />

            <WidgetRenderer widgets={getVdsWidgets('after-header')} />

            {statusError && (
                <div
                    role='status'
                    className='flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm'
                >
                    <AlertTriangle
                        className='mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400'
                        aria-hidden
                    />
                    <div className='min-w-0'>
                        <p className='font-medium text-yellow-700 dark:text-yellow-300'>
                            {t('vds.console.stats_unavailable_title')}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                            {t('vds.console.stats_unavailable_description')}
                        </p>
                    </div>
                </div>
            )}

            <div className='grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(0,1fr)_20rem]'>
                <div className='flex min-w-0 flex-col'>
                    <VdsScreen
                        status={displayStatus}
                        canConsole={canConsole}
                        vncUrl={vncUrl}
                        vncPassword={vncPassword}
                        vncLoading={vncLoading}
                        onConnect={openVnc}
                        vmId={instance.id}
                        hostname={instance.hostname ?? undefined}
                        features={features}
                        canPower={canPower}
                        canSettings={hasPermission('settings')}
                        onClose={() => {
                            setVncUrl(null);
                            setVncPassword(null);
                        }}
                        className='h-[calc(75vw+6.5rem)] max-h-[70dvh] min-h-[18rem] sm:h-[min(70dvh,40rem)] sm:max-h-none sm:min-h-[22rem] xl:h-auto xl:min-h-[max(32rem,calc(100dvh-22rem))] xl:flex-1'
                    />
                </div>
                <div className='flex min-w-0 flex-col'>
                    <ServerConsoleStats
                        className='xl:flex-1 xl:auto-rows-fr'
                        statsReady={statsReady}
                        diskReady={diskReady}
                        cpuUsage={(vmStatus?.cpu ?? 0) * cpuScale}
                        cpuLimit={cpuCores > 0 ? cpuCores * 100 : 0}
                        memoryUsage={(vmStatus?.mem ?? 0) / MiB}
                        memoryLimit={memLimitMib}
                        diskUsage={(vmStatus?.disk ?? 0) / MiB}
                        diskLimit={diskLimitMib}
                        networkRx={networkRxRate}
                        networkTx={networkTxRate}
                        networkRxTotal={networkRxTotal}
                        networkTxTotal={networkTxTotal}
                        cpuData={cpuData.map((p) => ({ timestamp: p.timestamp, value: (p.value / 100) * cpuScale }))}
                        memoryData={memoryData.map((p) => ({ timestamp: p.timestamp, value: p.value / MiB }))}
                        diskData={diskData}
                        networkData={networkRxData.map((p, i) => ({
                            timestamp: p.timestamp,
                            value: p.value + (networkTxData[i]?.value ?? 0),
                        }))}
                        diskIo={
                            diskIoRate
                                ? {
                                      read: diskIoRate.read,
                                      write: diskIoRate.write,
                                      readTotal: vmStatus?.diskread ?? 0,
                                      writeTotal: vmStatus?.diskwrite ?? 0,
                                      data: diskIoData,
                                  }
                                : null
                        }
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getVdsWidgets('after-stats')} />

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <PageCard
                    title={t('vds.console.details.instance_details')}
                    icon={Info}
                    className={cn(!canViewAccessPassword && 'lg:col-span-2')}
                >
                    <dl className='grid grid-cols-1 gap-x-6 sm:grid-cols-2'>
                        {details.map(({ label, value, mono }) => (
                            <div
                                key={label}
                                className='border-border/40 flex items-center justify-between gap-3 border-b py-2 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0'
                            >
                                <dt className='text-muted-foreground shrink-0 text-xs font-medium'>{label}</dt>
                                <dd
                                    className={cn(
                                        'min-w-0 truncate text-sm font-medium',
                                        mono && 'font-mono tabular-nums',
                                    )}
                                >
                                    {value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    {instance.expires_at ? (
                        <div className='border-border/40 bg-muted/30 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2'>
                            <span className='text-muted-foreground text-xs font-medium'>
                                {t('service_expiry.label')}
                            </span>
                            <span className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
                                <ServiceExpiryChip expiresAt={instance.expires_at} />
                                <span className='text-muted-foreground truncate font-mono text-xs tabular-nums'>
                                    {formatExpiryAbsolute(instance.expires_at, dateOpts)}
                                </span>
                            </span>
                        </div>
                    ) : null}
                </PageCard>

                {canViewAccessPassword && (
                    <PageCard
                        title={t('vds.console.password.title')}
                        description={t('vds.console.password.description')}
                        icon={Lock}
                        variant='warning'
                    >
                        <div className='flex items-center gap-2'>
                            <div className='border-border/50 bg-muted/20 flex h-10 min-w-0 flex-1 items-center rounded-lg border px-3'>
                                <span
                                    className={cn(
                                        'truncate font-mono text-sm font-medium tracking-wide transition-all duration-200',
                                        !showAccessPassword && 'blur-sm select-none',
                                    )}
                                >
                                    {instance.access_password}
                                </span>
                            </div>
                            <Button
                                variant='outline'
                                size='icon'
                                className='h-10 w-10 shrink-0'
                                onClick={() => setShowAccessPassword((value) => !value)}
                                aria-label={showAccessPassword ? t('common.hide') : t('common.show')}
                                title={showAccessPassword ? t('common.hide') : t('common.show')}
                            >
                                {showAccessPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                            </Button>
                            <Button
                                variant='outline'
                                size='icon'
                                className='h-10 w-10 shrink-0'
                                onClick={copyPassword}
                                aria-label={t('common.copy')}
                                title={t('common.copy')}
                            >
                                {copied ? <Check className='h-4 w-4 text-emerald-500' /> : <Copy className='h-4 w-4' />}
                            </Button>
                        </div>
                        <p className='text-muted-foreground text-xs'>{t('vds.console.password.change_asap')}</p>
                    </PageCard>
                )}
            </div>

            {canConsole && features?.graphs.enabled && features.graphs.timeframes.length > 0 ? (
                <VdsResourceGraphs vmId={instance.id} timeframes={features.graphs.timeframes} />
            ) : (
                <VdsPerformance
                    cpuData={cpuData}
                    memoryData={memoryData}
                    networkRxData={networkRxData}
                    networkTxData={networkTxData}
                    cpuCores={cpuCores}
                    memoryLimit={memLimitMib * MiB}
                    networkRxTotal={networkRxTotal}
                    networkTxTotal={networkTxTotal}
                />
            )}
        </div>
    );
}
