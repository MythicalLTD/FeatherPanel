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
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { Cpu, Database, Globe } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface PerformanceDataPoint {
    timestamp: number;
    value: number;
}

interface VdsPerformanceProps {
    cpuData: PerformanceDataPoint[];
    memoryData: PerformanceDataPoint[];
    networkRxData: PerformanceDataPoint[];
    networkTxData: PerformanceDataPoint[];
    cpuLimit: number;
    memoryLimit: number;
}

export default function VdsPerformance({
    cpuData,
    memoryData,
    networkRxData,
    networkTxData,
    cpuLimit,
    memoryLimit,
}: VdsPerformanceProps) {
    const { t } = useTranslation();

    const formatMemory = (value: number): string => {
        if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
        return `${(value / 1024).toFixed(0)} KB`;
    };

    const formatBytesPerSecond = (bytes: number): string => {
        if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB/s`;
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
        return `${bytes.toFixed(0)} B/s`;
    };

    const getCurrentValue = (data: PerformanceDataPoint[]): number => {
        if (!data.length) return 0;
        return data[data.length - 1].value;
    };

    const charts = [
        {
            id: 'cpu',
            title: t('vds.console.performance.cpu') || 'CPU Usage',
            data: cpuData,
            color: '#ef4444',
            icon: Cpu,
            currentValue: `${(getCurrentValue(cpuData) * 100).toFixed(1)}%`,
            limit: cpuLimit > 0 ? `${cpuLimit}%` : 'Unlimited',
            max: cpuLimit > 0 ? cpuLimit : undefined,
        },
        {
            id: 'memory',
            title: t('vds.console.performance.memory') || 'Memory Usage',
            data: memoryData,
            color: '#3b82f6',
            icon: Database,
            currentValue: formatMemory(getCurrentValue(memoryData)),
            limit: memoryLimit > 0 ? formatMemory(memoryLimit) : 'Unlimited',
            max: memoryLimit > 0 ? memoryLimit : undefined,
        },
        {
            id: 'net',
            title: t('vds.console.performance.network') || 'Network',
            data: networkRxData.map((point, idx) => ({
                timestamp: point.timestamp,
                value: point.value + (networkTxData[idx]?.value ?? 0),
            })),
            color: '#f59e0b',
            icon: Globe,
            currentValue: formatBytesPerSecond(getCurrentValue(networkRxData)),
            limit: 'N/A',
            max: undefined,
        },
    ];

    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {charts.map((chart) => {
                const Icon = chart.icon;
                return (
                    <div
                        key={chart.id}
                        className='rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl p-6 transition-all'
                    >
                        <div className='flex items-center justify-between mb-3'>
                            <h3 className='text-sm font-medium text-gray-900 dark:text-white'>{chart.title}</h3>
                            <div className='flex items-center gap-2'>
                                <div
                                    className='w-2 h-2 rounded-full animate-pulse'
                                    style={{ backgroundColor: chart.color }}
                                />
                                <Icon className='h-4 w-4 text-muted-foreground' />
                            </div>
                        </div>

                        <div className='space-y-3'>
                            <div className='flex justify-between items-center text-xs'>
                                <span className='text-muted-foreground'>
                                    {t('servers.console.info_cards.limit', { limit: chart.limit })}
                                </span>
                                <span className='font-medium' style={{ color: chart.color }}>
                                    {chart.currentValue}
                                </span>
                            </div>

                            <div className='h-[200px] w-full mt-4 min-h-[200px]'>
                                {chart.data.length > 0 ? (
                                    <ResponsiveContainer width='100%' height='100%'>
                                        <LineChart data={chart.data}>
                                            <YAxis domain={[0, chart.max || 'auto']} hide />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (!active || !payload || !payload.length) return null;
                                                    const value = payload[0].value as number;
                                                    let formattedValue = '';

                                                    if (chart.id === 'cpu') {
                                                        formattedValue = `${(value * 100).toFixed(1)}%`;
                                                    } else if (chart.id === 'net') {
                                                        formattedValue = formatBytesPerSecond(value);
                                                    } else {
                                                        formattedValue = formatMemory(value);
                                                    }

                                                    return (
                                                        <div className='bg-background/95 backdrop-blur border border-border rounded-lg p-2'>
                                                            <p className='text-xs font-medium'>{formattedValue}</p>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Line
                                                type='monotone'
                                                dataKey='value'
                                                stroke={chart.color}
                                                strokeWidth={2}
                                                dot={false}
                                                animationDuration={0}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className='flex items-center justify-center h-full text-muted-foreground text-sm'>
                                        {t('servers.console.performance.no_data')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
