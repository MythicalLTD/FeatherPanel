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

import React, { useId } from 'react';
import { Cpu, MemoryStick, HardDrive, Network, ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn, formatCpu, formatFileSize, formatMib } from '@/lib/utils';
import { getUsagePercentage } from '@/lib/server-utils';

type Point = { timestamp: number; value: number };

/** Tiny area sparkline drawn with plain SVG so the cards stay cheap to re-render every stats tick. */
function Sparkline({ data, max, className }: { data: Point[]; max?: number; className?: string }) {
    const gradientId = useId();
    const width = 100;
    const height = 28;
    if (data.length < 2) {
        return (
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio='none' className={className} aria-hidden>
                <line x1='0' y1={height - 1} x2={width} y2={height - 1} stroke='currentColor' strokeOpacity='0.35' />
            </svg>
        );
    }
    const peak = Math.max(max && max > 0 ? max : 0, ...data.map((p) => p.value), 1e-9);
    const step = width / (data.length - 1);
    const points = data.map((p, i) => {
        const x = i * step;
        const y = height - 1 - (Math.min(p.value, peak) / peak) * (height - 3);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const line = `M${points.join(' L')}`;
    const area = `${line} L${width},${height} L0,${height} Z`;
    return (
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio='none' className={className} aria-hidden>
            <defs>
                <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='currentColor' stopOpacity='0.28' />
                    <stop offset='100%' stopColor='currentColor' stopOpacity='0' />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradientId})`} />
            <path
                d={line}
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                vectorEffect='non-scaling-stroke'
                strokeLinejoin='round'
            />
        </svg>
    );
}

/** Small usage ring shown in the corner of each card. */
function UsageRing({ percent, warn }: { percent: number | null; warn?: boolean }) {
    const radius = 15;
    const circumference = 2 * Math.PI * radius;
    const clamped = percent === null ? 0 : Math.max(0, Math.min(100, percent));
    return (
        <div className='relative h-9 w-9 shrink-0'>
            <svg viewBox='0 0 36 36' className='h-9 w-9 -rotate-90' aria-hidden>
                <circle
                    cx='18'
                    cy='18'
                    r={radius}
                    fill='none'
                    stroke='currentColor'
                    strokeOpacity='0.12'
                    strokeWidth='3'
                />
                {percent !== null && (
                    <circle
                        cx='18'
                        cy='18'
                        r={radius}
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='3'
                        strokeLinecap='round'
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - clamped / 100)}
                        className={cn(
                            'transition-[stroke-dashoffset] duration-500',
                            warn ? 'text-destructive' : 'text-primary',
                        )}
                    />
                )}
            </svg>
            <span className='text-muted-foreground absolute inset-0 flex items-center justify-center text-[9px] font-medium tabular-nums'>
                {percent === null ? '–' : `${Math.round(clamped)}%`}
            </span>
        </div>
    );
}

interface StatCardProps {
    icon: LucideIcon;
    label: string;
    value: React.ReactNode;
    sub: React.ReactNode;
    percent: number | null;
    warn?: boolean;
    data: Point[];
    max?: number;
    ready: boolean;
}

function StatCard({ icon: Icon, label, value, sub, percent, warn, data, max, ready }: StatCardProps) {
    return (
        <div className='fp-surface relative flex min-w-0 flex-col overflow-hidden rounded-xl border'>
            <div className='flex items-start justify-between gap-2 p-3 pb-0 sm:p-4 sm:pb-0'>
                <div className='flex min-w-0 items-center gap-2'>
                    <span className='bg-muted/60 text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-lg'>
                        <Icon className='h-3.5 w-3.5' />
                    </span>
                    <span className='truncate text-sm font-medium'>{label}</span>
                </div>
                <UsageRing percent={ready ? percent : null} warn={warn} />
            </div>
            <div className='min-w-0 px-3 pt-1 sm:px-4'>
                {ready ? (
                    <p
                        className={cn(
                            'truncate text-lg font-semibold tabular-nums sm:text-xl',
                            warn && 'text-destructive',
                        )}
                    >
                        {value}
                    </p>
                ) : (
                    <span
                        className='bg-muted/40 my-1.5 inline-block h-5 w-16 animate-pulse rounded-md'
                        aria-busy='true'
                    />
                )}
                <div className='text-muted-foreground truncate text-[11px]'>{sub}</div>
            </div>
            <Sparkline data={ready ? data : []} max={max} className='text-primary mt-auto h-8 w-full pt-1' />
        </div>
    );
}

export interface ServerConsoleStatsProps {
    statsReady: boolean;
    diskReady?: boolean;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    cpuLimit: number;
    memoryLimit: number;
    diskLimit: number;
    networkRx: number;
    networkTx: number;
    networkRxTotal: number;
    networkTxTotal: number;
    cpuData: Point[];
    memoryData: Point[];
    diskData: Point[];
    networkData: Point[];
    /** Block I/O throughput (bytes/s); the card is only shown once the daemon reports disk_io. */
    diskIo?: { read: number; write: number; readTotal: number; writeTotal: number; data: Point[] } | null;
    className?: string;
}

/** Compact CPU / memory / disk / network cards for the console sidebar (2x2 grid on small screens). */
export default React.memo(function ServerConsoleStats({
    statsReady,
    diskReady,
    cpuUsage,
    memoryUsage,
    diskUsage,
    cpuLimit,
    memoryLimit,
    diskLimit,
    networkRx,
    networkTx,
    networkRxTotal,
    networkTxTotal,
    cpuData,
    memoryData,
    diskData,
    networkData,
    diskIo,
    className,
}: ServerConsoleStatsProps) {
    const { t } = useTranslation();
    const unlimited = t('servers.console.info_cards.unlimited');
    const ofLimit = (limit: string) => t('servers.console.stats.of_limit', { limit });
    const diskShown = diskReady ?? statsReady;

    return (
        <div className={cn('grid grid-cols-2 gap-3 xl:grid-cols-1 xl:gap-4', className)}>
            <StatCard
                icon={Cpu}
                label={t('servers.cpu')}
                value={`${cpuUsage.toFixed(1)}%`}
                sub={ofLimit(cpuLimit > 0 ? formatCpu(cpuLimit) : unlimited)}
                percent={cpuLimit > 0 ? getUsagePercentage(cpuUsage, cpuLimit) : null}
                warn={cpuLimit > 0 && cpuUsage > cpuLimit}
                data={cpuData}
                max={cpuLimit > 0 ? cpuLimit : undefined}
                ready={statsReady}
            />
            <StatCard
                icon={MemoryStick}
                label={t('servers.memory')}
                value={formatMib(memoryUsage)}
                sub={ofLimit(memoryLimit > 0 ? formatMib(memoryLimit) : unlimited)}
                percent={memoryLimit > 0 ? getUsagePercentage(memoryUsage, memoryLimit) : null}
                warn={memoryLimit > 0 && memoryUsage > memoryLimit}
                data={memoryData}
                max={memoryLimit > 0 ? memoryLimit : undefined}
                ready={statsReady}
            />
            <StatCard
                icon={HardDrive}
                label={t('servers.disk')}
                value={formatMib(diskUsage)}
                sub={ofLimit(diskLimit > 0 ? formatMib(diskLimit) : unlimited)}
                percent={diskLimit > 0 ? getUsagePercentage(diskUsage, diskLimit) : null}
                warn={diskLimit > 0 && diskUsage > diskLimit}
                data={diskData}
                max={diskLimit > 0 ? diskLimit : undefined}
                ready={diskShown}
            />
            <StatCard
                icon={Network}
                label={t('servers.console.info_cards.network_title')}
                value={`${formatFileSize(networkRx + networkTx)}/s`}
                sub={
                    <span className='flex flex-wrap items-center gap-x-2'>
                        <span
                            className='inline-flex items-center gap-0.5'
                            title={t('servers.console.info_cards.network_rx')}
                        >
                            <ArrowDown className='h-3 w-3' />
                            {formatFileSize(networkRx)}/s
                        </span>
                        <span
                            className='inline-flex items-center gap-0.5'
                            title={t('servers.console.info_cards.network_tx')}
                        >
                            <ArrowUp className='h-3 w-3' />
                            {formatFileSize(networkTx)}/s
                        </span>
                        <span className='hidden sm:inline'>
                            {t('servers.console.stats.total_traffic', {
                                down: formatFileSize(networkRxTotal),
                                up: formatFileSize(networkTxTotal),
                            })}
                        </span>
                    </span>
                }
                percent={null}
                data={networkData}
                ready={statsReady}
            />
            {diskIo ? (
                <StatCard
                    icon={HardDrive}
                    label={t('servers.console.info_cards.disk_io_title')}
                    value={`${formatFileSize(diskIo.read + diskIo.write)}/s`}
                    sub={
                        <span className='flex flex-wrap items-center gap-x-2'>
                            <span
                                className='inline-flex items-center gap-0.5'
                                title={t('servers.console.info_cards.disk_io_read')}
                            >
                                <ArrowDown className='h-3 w-3' />
                                {formatFileSize(diskIo.read)}/s
                            </span>
                            <span
                                className='inline-flex items-center gap-0.5'
                                title={t('servers.console.info_cards.disk_io_write')}
                            >
                                <ArrowUp className='h-3 w-3' />
                                {formatFileSize(diskIo.write)}/s
                            </span>
                        </span>
                    }
                    percent={null}
                    data={diskIo.data}
                    ready={statsReady}
                />
            ) : null}
        </div>
    );
});
