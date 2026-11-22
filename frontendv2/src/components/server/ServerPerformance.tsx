/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    10|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import React, { useMemo, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, type TooltipContentProps } from 'recharts';
import { Cpu, Database, HardDrive, Globe, Activity, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { NETWORK_RX_COLOR, NETWORK_TX_COLOR } from '@/lib/network-chart-colors';

interface PerformanceDataPoint {
    timestamp: number;
    value: number;
    /** Optional per-direction values; when present the network chart draws one line per direction. */
    rx?: number;
    tx?: number;
}

interface ServerPerformanceProps {
    cpuData: PerformanceDataPoint[];
    memoryData: PerformanceDataPoint[];
    diskData: PerformanceDataPoint[];
    networkData: PerformanceDataPoint[];
    diskIoData: PerformanceDataPoint[];
    networkRxTotal?: number;
    networkTxTotal?: number;
    diskIoReadTotal?: number;
    diskIoWriteTotal?: number;
    cpuLimit: number;
    memoryLimit: number;
    diskLimit: number;
    showDiskIo?: boolean;
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
            // Lower gradually so scale-downs are not jumpy.
            maxRef.current = niceCeil(maxRef.current * 0.7 + target * 0.3);
        }

        return Math.max(maxRef.current, floor);
    }, [data, fixedMax, floor]);
}

function formatMemory(value: number): string {
    if (value >= 1024) {
        return `${(value / 1024).toFixed(1)} GiB`;
    }
    return `${value.toFixed(1)} MiB`;
}

function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes.toFixed(2)} B`;
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
    /** Extra lines drawn instead of the single `value` line (e.g. download and upload). */
    lines?: Array<{ dataKey: string; color: string; prefix: string }>;
    /** Current value per line, shown in its own row so the limit label keeps its space. */
    lineValues?: Array<{ prefix: string; color: string; text: string }>;
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
    lines,
    lineValues,
}: PerformanceChartCardProps) {
    const chartHeight = lineValues?.length ? 112 : 140;
    const tooltipContent = useMemo(() => {
        return function ChartTooltip({ active, payload }: TooltipContentProps) {
            if (!active || !payload?.length) return null;
            if (lines?.length) {
                return (
                    <div className='bg-background/95 border-border space-y-0.5 rounded-lg border p-2 backdrop-blur'>
                        {lines.map((line) => {
                            const entry = payload.find((item) => item.dataKey === line.dataKey);
                            return (
                                <p key={line.dataKey} className='text-xs font-medium' style={{ color: line.color }}>
                                    {line.prefix} {formatTooltip(Number(entry?.value ?? 0))}
                                </p>
                            );
                        })}
                    </div>
                );
            }
            const value = Number(payload[0]?.value ?? 0);
            return (
                <div className='bg-background/95 border-border rounded-lg border p-2 backdrop-blur'>
                    <p className='text-xs font-medium'>{formatTooltip(value)}</p>
                </div>
            );
        };
    }, [formatTooltip, lines]);

    return (
        <div className='fp-surface min-w-0 rounded-xl border p-4 backdrop-blur-xl sm:p-5'>
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

                {lineValues?.length ? (
                    <div className='flex items-center justify-between gap-2 text-xs font-medium tabular-nums'>
                        {lineValues.map((item) => (
                            <span key={item.prefix} style={{ color: item.color }}>
                                {item.prefix} {item.text}
                            </span>
                        ))}
                    </div>
                ) : null}

                <div className='w-full min-w-0' style={{ height: chartHeight }}>
                    {data.length > 0 ? (
                        <ResponsiveContainer width='100%' height={chartHeight} debounce={80}>
                            <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                                <YAxis domain={[0, domainMax]} hide />
                                <Tooltip content={tooltipContent} isAnimationActive={false} />
                                {(lines ?? [{ dataKey: 'value', color, prefix: '' }]).map((line) => (
                                    <Line
                                        key={line.dataKey}
                                        type='monotone'
                                        dataKey={line.dataKey}
                                        stroke={line.color}
                                        strokeWidth={2}
                                        dot={false}
                                        isAnimationActive={false}
                                        activeDot={false}
                                    />
                                ))}
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

export default function ServerPerformance({
    cpuData,
    memoryData,
    diskData,
    networkData,
    diskIoData,
    networkRxTotal = 0,
    networkTxTotal = 0,
    diskIoReadTotal = 0,
    diskIoWriteTotal = 0,
    cpuLimit,
    memoryLimit,
    diskLimit,
    showDiskIo = true,
}: ServerPerformanceProps) {
    const { t } = useTranslation();

    const cpuCurrent = getCurrentValue(cpuData);
    const memoryCurrent = getCurrentValue(memoryData);
    const diskCurrent = getCurrentValue(diskData);
    const networkLast = networkData.length ? networkData[networkData.length - 1] : undefined;
    const networkSplit = networkLast !== undefined && (networkLast.rx !== undefined || networkLast.tx !== undefined);
    const networkCurrent = getCurrentValue(networkData);
    // With one line per direction the scale follows the larger direction, not the sum.
    const networkScaleData = useMemo(
        () =>
            networkData.map((point) =>
                point.rx !== undefined || point.tx !== undefined
                    ? { timestamp: point.timestamp, value: Math.max(point.rx ?? 0, point.tx ?? 0) }
                    : point,
            ),
        [networkData],
    );
    const diskIoCurrent = getCurrentValue(diskIoData);

    // Unlimited CPU: keep a 0-100% scale so tiny noise does not amplify into a jagged chart.
    const cpuDomainMax = useStableDomainMax(cpuData, cpuLimit > 0 ? cpuLimit : 100, 100);
    const memoryDomainMax = useStableDomainMax(memoryData, memoryLimit > 0 ? memoryLimit : undefined, 64);
    const diskDomainMax = useStableDomainMax(diskData, diskLimit > 0 ? diskLimit : undefined, 64);
    const networkDomainMax = useStableDomainMax(networkScaleData, undefined, 1024);
    const diskIoDomainMax = useStableDomainMax(diskIoData, undefined, 1024);

    const diskUsagePct = diskLimit > 0 ? (diskCurrent / diskLimit) * 100 : 0;
    const diskColor = diskUsagePct > 95 ? '#ef4444' : diskUsagePct > 80 ? '#f59e0b' : '#10b981';

    const formatCpuTooltip = useMemo(() => (value: number) => `${value.toFixed(1)}%`, []);
    const formatMemoryTooltip = useMemo(() => (value: number) => formatMemory(value), []);
    const formatNetworkTooltip = useMemo(() => (value: number) => `${formatBytes(value)}/s`, []);
    const formatDiskIoTooltip = useMemo(() => (value: number) => `${formatBytes(value)}/s`, []);

    const emptyLabel = t('servers.console.performance.no_data');

    const charts: PerformanceChartCardProps[] = [
        {
            id: 'cpu',
            title: t('servers.console.performance.cpu_load'),
            data: cpuData,
            color: '#ef4444',
            icon: Cpu,
            currentValue: `${cpuCurrent.toFixed(1)}%`,
            limitLabel: t('servers.console.info_cards.limit', {
                limit: cpuLimit > 0 ? `${cpuLimit}%` : t('servers.console.info_cards.unlimited'),
            }),
            domainMax: cpuDomainMax,
            formatTooltip: formatCpuTooltip,
            emptyLabel,
        },
        {
            id: 'memory',
            title: t('servers.memory'),
            data: memoryData,
            color: '#3b82f6',
            icon: Database,
            currentValue: formatMemory(memoryCurrent),
            limitLabel: t('servers.console.info_cards.limit', {
                limit: memoryLimit > 0 ? formatMemory(memoryLimit) : t('servers.console.info_cards.unlimited'),
            }),
            domainMax: memoryDomainMax,
            formatTooltip: formatMemoryTooltip,
            emptyLabel,
        },
        {
            id: 'disk',
            title: t('servers.disk'),
            data: diskData,
            color: diskColor,
            icon: HardDrive,
            currentValue: formatMemory(diskCurrent),
            limitLabel: t('servers.console.info_cards.limit', {
                limit: diskLimit > 0 ? formatMemory(diskLimit) : t('servers.console.info_cards.unlimited'),
            }),
            domainMax: diskDomainMax,
            formatTooltip: formatMemoryTooltip,
            emptyLabel,
        },
        {
            id: 'network',
            title: t('servers.console.performance.network'),
            data: networkData,
            color: '#f59e0b',
            icon: Globe,
            currentValue: networkSplit ? '' : `${formatBytes(networkCurrent)}/s`,
            limitLabel: t('servers.console.info_cards.all_time_label', {
                total: formatBytes(networkRxTotal + networkTxTotal),
            }),
            domainMax: networkDomainMax,
            formatTooltip: formatNetworkTooltip,
            emptyLabel,
            lines: networkSplit
                ? [
                      { dataKey: 'rx', color: NETWORK_RX_COLOR, prefix: '↓' },
                      { dataKey: 'tx', color: NETWORK_TX_COLOR, prefix: '↑' },
                  ]
                : undefined,
            lineValues: networkSplit
                ? [
                      { prefix: '↓', color: NETWORK_RX_COLOR, text: `${formatBytes(networkLast?.rx ?? 0)}/s` },
                      { prefix: '↑', color: NETWORK_TX_COLOR, text: `${formatBytes(networkLast?.tx ?? 0)}/s` },
                  ]
                : undefined,
        },
        {
            id: 'disk_io',
            title: t('servers.console.performance.disk_io'),
            data: diskIoData,
            color: '#06b6d4',
            icon: Activity,
            currentValue: `${formatBytes(diskIoCurrent)}/s`,
            limitLabel: t('servers.console.info_cards.all_time_label', {
                total: formatBytes(diskIoReadTotal + diskIoWriteTotal),
            }),
            domainMax: diskIoDomainMax,
            formatTooltip: formatDiskIoTooltip,
            emptyLabel,
        },
    ];

    const visibleCharts = showDiskIo ? charts : charts.filter((chart) => chart.id !== 'disk_io');

    return (
        <div
            className={cn(
                'grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
                visibleCharts.length >= 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4',
            )}
        >
            {visibleCharts.map((chart) => (
                <PerformanceChartCard key={chart.id} {...chart} />
            ))}
        </div>
    );
}
