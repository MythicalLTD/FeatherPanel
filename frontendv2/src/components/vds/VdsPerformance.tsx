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

import React, { useMemo, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, type TooltipContentProps } from 'recharts';
import { Cpu, Database, Globe, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn, formatFileSize } from '@/lib/utils';

interface PerformanceDataPoint {
    timestamp: number;
    value: number;
}

interface VdsPerformanceProps {
    /** CPU usage series in percent (0–100). */
    cpuData: PerformanceDataPoint[];
    /** Memory usage series in bytes. */
    memoryData: PerformanceDataPoint[];
    networkRxData: PerformanceDataPoint[];
    networkTxData: PerformanceDataPoint[];
    /** Allocated vCPUs (for subtitle only; chart scale is always 0–100%). */
    cpuCores: number;
    memoryLimit: number;
    networkRxTotal?: number;
    networkTxTotal?: number;
}

function getCurrentValue(data: PerformanceDataPoint[]): number {
    if (!data.length) return 0;
    return data[data.length - 1].value;
}

function peakValue(data: PerformanceDataPoint[]): number {
    let peak = 0;
    for (const point of data) {
        if (point.value > peak) peak = point.value;
    }
    return peak;
}

/** Round up to a stable "nice" ceiling so the Y domain does not jitter every tick. */
function niceCeil(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 1;
    const exp = Math.floor(Math.log10(value));
    const base = Math.pow(10, exp);
    const normalized = value / base;
    const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return nice * base;
}

function useStableDomainMax(data: PerformanceDataPoint[], fixedMax?: number, floor = 1): number {
    const maxRef = useRef(floor);

    return useMemo(() => {
        if (fixedMax && fixedMax > 0) {
            maxRef.current = fixedMax;
            return fixedMax;
        }

        const target = Math.max(niceCeil(peakValue(data) * 1.2), floor);

        if (target > maxRef.current) {
            maxRef.current = target;
        } else if (target < maxRef.current * 0.45) {
            maxRef.current = niceCeil(maxRef.current * 0.7 + target * 0.3);
        }

        return Math.max(maxRef.current, floor);
    }, [data, fixedMax, floor]);
}

function formatMemoryBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes.toFixed(0)} B`;
}

function formatBytesPerSecond(bytes: number): string {
    return `${formatFileSize(bytes)}/s`;
}

interface PerformanceChartCardProps {
    id: string;
    title: string;
    data: PerformanceDataPoint[];
    color: string;
    icon: LucideIcon;
    currentValue: string;
    limitLabel: string;
    domainMax: number;
    formatTooltip: (value: number) => string;
    emptyLabel: string;
}

const PerformanceChartCard = React.memo(function PerformanceChartCard({
    title,
    data,
    color,
    icon: Icon,
    currentValue,
    limitLabel,
    domainMax,
    formatTooltip,
    emptyLabel,
}: PerformanceChartCardProps) {
    const tooltipContent = useMemo(() => {
        return function ChartTooltip({ active, payload }: TooltipContentProps) {
            if (!active || !payload?.length) return null;
            const value = Number(payload[0]?.value ?? 0);
            return (
                <div className='bg-background/95 border-border rounded-lg border p-2 backdrop-blur'>
                    <p className='text-xs font-medium'>{formatTooltip(value)}</p>
                </div>
            );
        };
    }, [formatTooltip]);

    return (
        <div className='border-border/50 bg-card/50 min-w-0 rounded-xl border p-4 backdrop-blur-xl sm:p-5'>
            <div className='mb-3 flex items-center justify-between gap-2'>
                <h3 className='text-foreground truncate text-sm font-medium'>{title}</h3>
                <div className='flex items-center gap-2'>
                    <div className='h-2 w-2 rounded-full' style={{ backgroundColor: color }} />
                    <Icon className='text-muted-foreground h-4 w-4 shrink-0' />
                </div>
            </div>

            <div className='space-y-3'>
                <div className='flex items-start justify-between gap-2 text-xs'>
                    <span className='text-muted-foreground min-w-0 truncate'>{limitLabel}</span>
                    <span className='shrink-0 font-medium tabular-nums' style={{ color }}>
                        {currentValue}
                    </span>
                </div>

                <div className='h-[140px] w-full min-w-0'>
                    {data.length > 0 ? (
                        <ResponsiveContainer width='100%' height={140} debounce={80}>
                            <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                                <YAxis domain={[0, domainMax]} hide />
                                <Tooltip content={tooltipContent} isAnimationActive={false} />
                                <Line
                                    type='monotone'
                                    dataKey='value'
                                    stroke={color}
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                    activeDot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
                            {emptyLabel}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default function VdsPerformance({
    cpuData,
    memoryData,
    networkRxData,
    networkTxData,
    cpuCores,
    memoryLimit,
    networkRxTotal = 0,
    networkTxTotal = 0,
}: VdsPerformanceProps) {
    const { t } = useTranslation();

    const networkData = useMemo(
        () =>
            networkRxData.map((point, idx) => ({
                timestamp: point.timestamp,
                value: point.value + (networkTxData[idx]?.value ?? 0),
            })),
        [networkRxData, networkTxData],
    );

    const cpuCurrent = getCurrentValue(cpuData);
    const memoryCurrent = getCurrentValue(memoryData);
    const networkCurrent = getCurrentValue(networkData);

    const cpuDomainMax = useStableDomainMax(cpuData, 100, 100);
    const memoryDomainMax = useStableDomainMax(memoryData, memoryLimit > 0 ? memoryLimit : undefined, 64 * 1024 * 1024);
    const networkDomainMax = useStableDomainMax(networkData, undefined, 1024);

    const formatCpuTooltip = useMemo(() => (value: number) => `${value.toFixed(1)}%`, []);
    const formatMemoryTooltip = useMemo(() => (value: number) => formatMemoryBytes(value), []);
    const formatNetworkTooltip = useMemo(() => (value: number) => formatBytesPerSecond(value), []);

    const emptyLabel = t('servers.console.performance.no_data');
    const coresLabel =
        cpuCores > 0
            ? t('vds.console.performance.cpu_cores', { cores: String(cpuCores) })
            : t('servers.console.info_cards.unlimited');

    const charts: PerformanceChartCardProps[] = [
        {
            id: 'cpu',
            title: t('vds.console.performance.cpu'),
            data: cpuData,
            color: '#ef4444',
            icon: Cpu,
            currentValue: `${cpuCurrent.toFixed(1)}%`,
            limitLabel: coresLabel,
            domainMax: cpuDomainMax,
            formatTooltip: formatCpuTooltip,
            emptyLabel,
        },
        {
            id: 'memory',
            title: t('vds.console.performance.memory'),
            data: memoryData,
            color: '#3b82f6',
            icon: Database,
            currentValue: formatMemoryBytes(memoryCurrent),
            limitLabel: t('servers.console.info_cards.limit', {
                limit: memoryLimit > 0 ? formatMemoryBytes(memoryLimit) : t('servers.console.info_cards.unlimited'),
            }),
            domainMax: memoryDomainMax,
            formatTooltip: formatMemoryTooltip,
            emptyLabel,
        },
        {
            id: 'network',
            title: t('vds.console.performance.network'),
            data: networkData,
            color: '#f59e0b',
            icon: Globe,
            currentValue: formatBytesPerSecond(networkCurrent),
            limitLabel: t('servers.console.info_cards.all_time_label', {
                total: formatFileSize(networkRxTotal + networkTxTotal),
            }),
            domainMax: networkDomainMax,
            formatTooltip: formatNetworkTooltip,
            emptyLabel,
        },
    ];

    return (
        <div className={cn('grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3')}>
            {charts.map((chart) => (
                <PerformanceChartCard key={chart.id} {...chart} />
            ))}
        </div>
    );
}
