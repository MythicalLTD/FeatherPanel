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

import React from 'react';
import {
    Wifi,
    Cpu,
    Clock,
    HardDrive,
    Database,
    ArrowDown,
    ArrowUp,
    Monitor,
    Play,
    Loader2,
    AlertTriangle,
    Server,
    type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn, formatFileSize } from '@/lib/utils';
import { getUsagePercentage, getProgressColor } from '@/lib/server-utils';
import { Progress } from '@/components/ui/progress';
import { OverflowText } from '@/components/featherui/OverflowText';
import { Button } from '@/components/featherui/Button';

interface ThroughputRowProps {
    icon: LucideIcon;
    label: string;
    value: string;
}

function ThroughputRow({ icon: Icon, label, value }: ThroughputRowProps) {
    return (
        <div className='flex items-center justify-between gap-2 text-sm'>
            <span className='text-muted-foreground flex min-w-0 items-center gap-2'>
                <Icon className='h-3 w-3 shrink-0' />
                <OverflowText>{label}</OverflowText>
            </span>
            <span className='shrink-0 font-medium tabular-nums'>{value}</span>
        </div>
    );
}

function formatMemoryBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
}

async function copyText(text: string, t: (key: string) => string) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            toast.success(t('servers.console.info_cards.copied'));
            return;
        }
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            toast.success(t('servers.console.info_cards.copied'));
        } catch {
            toast.error(t('servers.console.info_cards.copy_error'));
        }
        document.body.removeChild(textArea);
    } catch {
        toast.error(t('servers.console.info_cards.copy_error'));
    }
}

export function VdsNetworkCard({
    ipAddress,
    uptime,
    statsReady = true,
    networkRx = 0,
    networkTx = 0,
    networkRxTotal = 0,
    networkTxTotal = 0,
    className,
}: {
    ipAddress: string | null;
    uptime: string;
    statsReady?: boolean;
    networkRx?: number;
    networkTx?: number;
    networkRxTotal?: number;
    networkTxTotal?: number;
    className?: string;
}) {
    const { t } = useTranslation();
    const pendingValue = (
        <span className='bg-muted/40 inline-block h-3.5 w-12 animate-pulse rounded-md align-middle' aria-busy='true' />
    );

    return (
        <div className={cn('border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl', className)}>
            <h3 className='text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium'>
                <Wifi className='h-4 w-4' />
                {t('servers.console.info_cards.network_title')}
            </h3>

            <div className='space-y-4'>
                <div>
                    <p className='text-muted-foreground mb-1 text-xs'>{t('vds.console.details.ip')}</p>
                    <div className='flex items-center gap-2'>
                        <code className='bg-muted flex-1 truncate rounded px-2 py-1 font-mono text-sm'>
                            {ipAddress ?? '—'}
                        </code>
                        {ipAddress && (
                            <button
                                type='button'
                                onClick={() => void copyText(ipAddress, t)}
                                className='hover:bg-muted text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors'
                                title={t('servers.console.info_cards.copy')}
                            >
                                <svg
                                    xmlns='http://www.w3.org/2000/svg'
                                    width='14'
                                    height='14'
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    stroke='currentColor'
                                    strokeWidth='2'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                >
                                    <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
                                    <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <p className='text-muted-foreground mb-1 flex items-center gap-1 text-xs'>
                        <Clock className='h-3 w-3' />
                        {t('servers.console.info_cards.uptime')}
                    </p>
                    <p className='text-sm font-medium tabular-nums'>{statsReady ? uptime || '—' : pendingValue}</p>
                </div>

                <div className='border-border/50 space-y-3 border-t pt-3'>
                    <ThroughputRow
                        icon={ArrowDown}
                        label={t('vds.console.performance.network_rx')}
                        value={`${formatFileSize(networkRx)}/s`}
                    />
                    <ThroughputRow
                        icon={ArrowUp}
                        label={t('vds.console.performance.network_tx')}
                        value={`${formatFileSize(networkTx)}/s`}
                    />
                    <div className='space-y-2'>
                        <div className='flex items-center justify-between gap-2'>
                            <span className='text-muted-foreground text-[10px] font-medium tracking-wide uppercase'>
                                {t('servers.console.info_cards.all_time')}
                            </span>
                            <span className='text-foreground text-xs font-semibold tabular-nums'>
                                {formatFileSize(networkRxTotal + networkTxTotal)}
                            </span>
                        </div>
                        <div className='text-muted-foreground grid grid-cols-2 gap-2 text-[11px]'>
                            <span className='flex min-w-0 items-center gap-1'>
                                <ArrowDown className='h-3 w-3 shrink-0' />
                                <span className='truncate tabular-nums'>{formatFileSize(networkRxTotal)}</span>
                            </span>
                            <span className='flex min-w-0 items-center justify-end gap-1'>
                                <ArrowUp className='h-3 w-3 shrink-0' />
                                <span className='truncate tabular-nums'>{formatFileSize(networkTxTotal)}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface VdsInfoCardsProps {
    statsReady?: boolean;
    /** CPU usage percent 0–100 */
    cpuUsage?: number;
    cpuCores?: number;
    memoryUsage?: number | null;
    memoryLimit?: number;
    diskUsage?: number | null;
    diskLimit?: number;
    liveStatus: string;
    canConsole: boolean;
    canPower: boolean;
    powering: string | null;
    vncLoading: boolean;
    onStart: () => void;
    onOpenVnc: () => void;
    className?: string;
}

export default React.memo(function VdsInfoCards({
    statsReady = true,
    cpuUsage = 0,
    cpuCores = 0,
    memoryUsage = null,
    memoryLimit = 0,
    diskUsage = null,
    diskLimit = 0,
    liveStatus,
    canConsole,
    canPower,
    powering,
    vncLoading,
    onStart,
    onOpenVnc,
    className,
}: VdsInfoCardsProps) {
    const { t } = useTranslation();
    const pendingValue = (
        <span className='bg-muted/40 inline-block h-3.5 w-12 animate-pulse rounded-md align-middle' aria-busy='true' />
    );

    const memUsed = memoryUsage ?? 0;
    const diskUsed = diskUsage ?? 0;
    const cpuPercent = Math.min(Math.max(cpuUsage, 0), 100);
    const memoryPercent = getUsagePercentage(memUsed, memoryLimit);
    const diskPercent = diskUsage != null && diskLimit > 0 ? getUsagePercentage(diskUsed, diskLimit) : 0;
    const diskAvailable = diskUsage != null && diskLimit > 0;
    const isRunning = liveStatus === 'running';

    return (
        <div className={cn('space-y-4', className)}>
            <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                <h3 className='text-muted-foreground mb-3 text-sm font-medium'>
                    {t('servers.console.info_cards.resources_title')}
                </h3>

                <div className='space-y-4'>
                    <div>
                        <div className='mb-1.5 flex justify-between text-sm'>
                            <span className='text-muted-foreground flex items-center gap-2'>
                                <Cpu className='h-3 w-3' />
                                {t('vds.console.performance.cpu')}
                            </span>
                            <span className='font-medium tabular-nums'>
                                {statsReady ? `${cpuPercent.toFixed(1)}%` : pendingValue}
                            </span>
                        </div>
                        {statsReady && (
                            <Progress
                                value={cpuPercent}
                                className='h-1.5'
                                indicatorClassName={getProgressColor(cpuPercent)}
                            />
                        )}
                        <p className='text-muted-foreground mt-1 text-right text-[10px]'>
                            {cpuCores > 0
                                ? t('vds.console.performance.cpu_cores', { cores: String(cpuCores) })
                                : t('servers.console.info_cards.unlimited')}
                        </p>
                    </div>

                    <div>
                        <div className='mb-1.5 flex justify-between text-sm'>
                            <span className='text-muted-foreground flex items-center gap-2'>
                                <Database className='h-3 w-3' />
                                {t('vds.console.performance.memory')}
                            </span>
                            <span className='font-medium tabular-nums'>
                                {statsReady
                                    ? memoryUsage != null
                                        ? formatMemoryBytes(memoryUsage)
                                        : '—'
                                    : pendingValue}
                            </span>
                        </div>
                        {statsReady && memoryLimit > 0 && (
                            <Progress
                                value={memoryPercent}
                                className='h-1.5'
                                indicatorClassName={getProgressColor(memoryPercent)}
                            />
                        )}
                        <p className='text-muted-foreground mt-1 text-right text-[10px]'>
                            {t('servers.console.info_cards.limit', {
                                limit:
                                    memoryLimit > 0
                                        ? formatMemoryBytes(memoryLimit)
                                        : t('servers.console.info_cards.unlimited'),
                            })}
                        </p>
                    </div>

                    <div>
                        <div className='mb-1.5 flex justify-between text-sm'>
                            <span className='text-muted-foreground flex items-center gap-2'>
                                <HardDrive className='h-3 w-3' />
                                {t('vds.console.performance.disk')}
                            </span>
                            <span className='font-medium tabular-nums'>
                                {statsReady
                                    ? diskUsage != null
                                        ? formatMemoryBytes(diskUsage)
                                        : t('vds.console.performance.disk_unavailable')
                                    : pendingValue}
                            </span>
                        </div>
                        {statsReady && diskAvailable && (
                            <Progress
                                value={diskPercent}
                                className='h-1.5'
                                indicatorClassName={getProgressColor(diskPercent)}
                            />
                        )}
                        <p className='text-muted-foreground mt-1 text-right text-[10px]'>
                            {diskLimit > 0
                                ? t('servers.console.info_cards.limit', { limit: formatMemoryBytes(diskLimit) })
                                : t('servers.console.info_cards.unlimited')}
                        </p>
                    </div>
                </div>
            </div>

            <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                <h3 className='text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium'>
                    <Monitor className='h-4 w-4' />
                    {t('vds.console.console_access.title')}
                </h3>

                {!canConsole ? (
                    <div className='flex items-start gap-3'>
                        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10'>
                            <AlertTriangle className='h-5 w-5 text-amber-400' />
                        </div>
                        <div className='min-w-0'>
                            <p className='text-sm font-semibold'>{t('vds.console.console_access.no_access_title')}</p>
                            <p className='text-muted-foreground mt-0.5 text-xs'>
                                {t('vds.console.console_access.no_access_description')}
                            </p>
                        </div>
                    </div>
                ) : !isRunning ? (
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='flex items-start gap-3'>
                            <div className='bg-muted/20 border-border/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border'>
                                <Server className='text-muted-foreground h-5 w-5' />
                            </div>
                            <div className='min-w-0'>
                                <p className='text-sm font-semibold'>{t('vds.console.console_access.offline_title')}</p>
                                <p className='text-muted-foreground mt-0.5 text-xs'>
                                    {t('vds.console.console_access.offline_description')}
                                </p>
                            </div>
                        </div>
                        {canPower && (
                            <Button size='sm' onClick={onStart} disabled={powering !== null} className='shrink-0'>
                                {powering === 'start' ? (
                                    <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                                ) : (
                                    <Play className='mr-1.5 h-4 w-4' />
                                )}
                                {t('vds.console.console_access.start_instance')}
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='flex items-start gap-3'>
                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10'>
                                <Monitor className='h-5 w-5 text-emerald-400' />
                            </div>
                            <div className='min-w-0'>
                                <p className='text-sm font-semibold'>{t('vds.console.console_access.ready_title')}</p>
                                <p className='text-muted-foreground mt-0.5 text-xs'>
                                    {t('vds.console.console_access.ready_description')}
                                </p>
                            </div>
                        </div>
                        <Button size='sm' onClick={onOpenVnc} disabled={vncLoading} className='shrink-0'>
                            {vncLoading ? (
                                <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                            ) : (
                                <Monitor className='mr-1.5 h-4 w-4' />
                            )}
                            {t('vds.console.console_access.open_button')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
});
