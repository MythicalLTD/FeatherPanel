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
import { Wifi, Cpu, Clock, Activity, HardDrive, Database, ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatMib, formatCpu as formatCpuGlobal, cn, formatFileSize } from '@/lib/utils';
import { getUsagePercentage, getProgressColor } from '@/lib/server-utils';
import { Progress } from '@/components/ui/progress';

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
                <span className='truncate'>{label}</span>
            </span>
            <span className='shrink-0 font-medium tabular-nums'>{value}</span>
        </div>
    );
}

interface AllTimeFooterProps {
    downLabel: string;
    upLabel: string;
    downBytes: number;
    upBytes: number;
    allTimeLabel: string;
}

function AllTimeFooter({ downLabel, upLabel, downBytes, upBytes, allTimeLabel }: AllTimeFooterProps) {
    const total = downBytes + upBytes;

    return (
        <div className='border-border/50 space-y-2 border-t pt-3'>
            <div className='flex items-center justify-between gap-2'>
                <span className='text-muted-foreground text-[10px] font-medium tracking-wide uppercase'>
                    {allTimeLabel}
                </span>
                <span className='text-foreground text-xs font-semibold tabular-nums'>{formatFileSize(total)}</span>
            </div>
            <div className='text-muted-foreground grid grid-cols-2 gap-2 text-[11px]'>
                <span className='flex min-w-0 items-center gap-1' title={downLabel}>
                    <ArrowDown className='h-3 w-3 shrink-0' />
                    <span className='truncate tabular-nums'>{formatFileSize(downBytes)}</span>
                </span>
                <span className='flex min-w-0 items-center justify-end gap-1' title={upLabel}>
                    <ArrowUp className='h-3 w-3 shrink-0' />
                    <span className='truncate tabular-nums'>{formatFileSize(upBytes)}</span>
                </span>
            </div>
        </div>
    );
}

interface ServerInfoCardsProps {
    serverIp: string;
    serverPort: number;
    cpuLimit: number;
    memoryLimit: number;
    diskLimit: number;
    wingsUptime: string;
    ping: number | null;

    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    networkRx?: number;
    networkTx?: number;
    networkRxTotal?: number;
    networkTxTotal?: number;
    diskIoRead?: number;
    diskIoWrite?: number;
    diskIoReadTotal?: number;
    diskIoWriteTotal?: number;
    className?: string;
}

export default React.memo(function ServerInfoCards({
    serverIp,
    serverPort,
    cpuLimit,
    memoryLimit,
    diskLimit,
    wingsUptime,
    ping,
    cpuUsage = 0,
    memoryUsage = 0,
    diskUsage = 0,
    networkRx = 0,
    networkTx = 0,
    networkRxTotal = 0,
    networkTxTotal = 0,
    diskIoRead = 0,
    diskIoWrite = 0,
    diskIoReadTotal = 0,
    diskIoWriteTotal = 0,
    className,
}: ServerInfoCardsProps) {
    const { t } = useTranslation();

    const formatCpu = (cpu: number): string => {
        if (cpu === 0) return t('servers.console.info_cards.unlimited');
        return formatCpuGlobal(cpu);
    };

    const formatMemory = (memory: number): string => {
        if (memory === 0) return t('servers.console.info_cards.unlimited');
        return formatMib(memory);
    };

    const formatDisk = (disk: number): string => {
        if (disk === 0) return t('servers.console.info_cards.unlimited');
        return formatMib(disk);
    };

    const cpuPercent = getUsagePercentage(cpuUsage, cpuLimit);
    const memoryPercent = getUsagePercentage(memoryUsage, memoryLimit);
    const diskPercent = getUsagePercentage(diskUsage, diskLimit);
    const diskOverLimit = diskLimit > 0 && diskUsage > diskLimit;
    const memoryOverLimit = memoryLimit > 0 && memoryUsage > memoryLimit;
    const cpuOverLimit = cpuLimit > 0 && cpuUsage > cpuLimit;

    const handleCopy = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                toast.success(t('servers.console.info_cards.copied'));
            } else {
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
                } catch (err) {
                    console.error('Fallback copy failed', err);
                    toast.error(t('servers.console.info_cards.copy_error'));
                }
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
            toast.error(t('servers.console.info_cards.copy_error'));
        }
    };

    return (
        <div className={cn('grid gap-4', className)}>
            <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                <h3 className='text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium'>
                    <Wifi className='h-4 w-4' />
                    {t('servers.console.info_cards.network_title')}
                </h3>

                <div className='space-y-4'>
                    <div>
                        <p className='text-muted-foreground mb-1 text-xs'>{t('servers.console.info_cards.address')}</p>
                        <div className='flex items-center gap-2'>
                            <code className='bg-muted flex-1 truncate rounded px-2 py-1 font-mono text-sm'>
                                {serverIp && serverPort ? `${serverIp}:${serverPort}` : 'N/A'}
                            </code>
                            <button
                                onClick={() => handleCopy(serverIp && serverPort ? `${serverIp}:${serverPort}` : 'N/A')}
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
                        </div>
                    </div>

                    <div className='grid grid-cols-2 gap-4 pt-2'>
                        <div>
                            <p className='text-muted-foreground mb-1 flex items-center gap-1 text-xs'>
                                <Clock className='h-3 w-3' />
                                {t('servers.console.info_cards.uptime')}
                            </p>
                            <p className='text-sm font-medium tabular-nums'>{wingsUptime || 'N/A'}</p>
                        </div>
                        <div>
                            <p className='text-muted-foreground mb-1 flex items-center gap-1 text-xs'>
                                <Activity className='h-3 w-3' />
                                {t('servers.console.info_cards.ping')}
                            </p>
                            <p className='text-sm font-medium tabular-nums'>{ping !== null ? `${ping}ms` : 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                <h3 className='text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium'>
                    <Activity className='h-4 w-4' />
                    {t('servers.console.info_cards.resources_title')}
                </h3>

                <div className='space-y-4'>
                    <div>
                        <div className='mb-1.5 flex justify-between text-sm'>
                            <span className='text-muted-foreground flex items-center gap-2'>
                                <Cpu className='h-3 w-3' />
                                {t('servers.cpu')}
                            </span>
                            <span className={cn('font-medium tabular-nums', cpuOverLimit && 'text-destructive')}>
                                {cpuUsage.toFixed(1)}%
                            </span>
                        </div>
                        {cpuLimit > 0 && (
                            <Progress
                                value={cpuPercent}
                                className='h-1.5'
                                indicatorClassName={getProgressColor(cpuPercent)}
                            />
                        )}
                        <p className='text-muted-foreground mt-1 text-right text-[10px]'>
                            {t('servers.console.info_cards.limit', { limit: formatCpu(cpuLimit) })}
                        </p>
                    </div>

                    <div>
                        <div className='mb-1.5 flex justify-between text-sm'>
                            <span className='text-muted-foreground flex items-center gap-2'>
                                <Database className='h-3 w-3' />
                                {t('servers.memory')}
                            </span>
                            <span className={cn('font-medium tabular-nums', memoryOverLimit && 'text-destructive')}>
                                {formatMib(memoryUsage)}
                            </span>
                        </div>
                        {memoryLimit > 0 && (
                            <Progress
                                value={memoryPercent}
                                className='h-1.5'
                                indicatorClassName={getProgressColor(memoryPercent)}
                            />
                        )}
                        <p className='text-muted-foreground mt-1 text-right text-[10px]'>
                            {t('servers.console.info_cards.limit', { limit: formatMemory(memoryLimit) })}
                        </p>
                    </div>

                    <div>
                        <div className='mb-1.5 flex justify-between text-sm'>
                            <span className='text-muted-foreground flex items-center gap-2'>
                                <HardDrive className='h-3 w-3' />
                                {t('servers.disk')}
                            </span>
                            <span className={cn('font-medium tabular-nums', diskOverLimit && 'text-destructive')}>
                                {formatMib(diskUsage)}
                            </span>
                        </div>
                        {diskLimit > 0 && (
                            <Progress
                                value={diskPercent}
                                className='h-1.5'
                                indicatorClassName={getProgressColor(diskPercent)}
                            />
                        )}
                        <p className='text-muted-foreground mt-1 text-right text-[10px]'>
                            {t('servers.console.info_cards.limit', { limit: formatDisk(diskLimit) })}
                        </p>
                    </div>
                </div>
            </div>

            <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                <h3 className='text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium'>
                    <Activity className='h-4 w-4' />
                    {t('servers.console.info_cards.network_title')}
                </h3>

                <div className='space-y-3'>
                    <ThroughputRow
                        icon={ArrowDown}
                        label={t('servers.console.info_cards.network_rx')}
                        value={`${formatFileSize(networkRx)}/s`}
                    />
                    <ThroughputRow
                        icon={ArrowUp}
                        label={t('servers.console.info_cards.network_tx')}
                        value={`${formatFileSize(networkTx)}/s`}
                    />
                    <AllTimeFooter
                        allTimeLabel={t('servers.console.info_cards.all_time')}
                        downLabel={t('servers.console.info_cards.network_rx')}
                        upLabel={t('servers.console.info_cards.network_tx')}
                        downBytes={networkRxTotal}
                        upBytes={networkTxTotal}
                    />
                </div>
            </div>

            <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                <h3 className='text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium'>
                    <HardDrive className='h-4 w-4' />
                    {t('servers.console.info_cards.disk_io_title')}
                </h3>

                <div className='space-y-3'>
                    <ThroughputRow
                        icon={ArrowDown}
                        label={t('servers.console.info_cards.disk_io_read')}
                        value={`${formatFileSize(diskIoRead)}/s`}
                    />
                    <ThroughputRow
                        icon={ArrowUp}
                        label={t('servers.console.info_cards.disk_io_write')}
                        value={`${formatFileSize(diskIoWrite)}/s`}
                    />
                    <AllTimeFooter
                        allTimeLabel={t('servers.console.info_cards.all_time')}
                        downLabel={t('servers.console.info_cards.disk_io_read')}
                        upLabel={t('servers.console.info_cards.disk_io_write')}
                        downBytes={diskIoReadTotal}
                        upBytes={diskIoWriteTotal}
                    />
                </div>
            </div>
        </div>
    );
});
