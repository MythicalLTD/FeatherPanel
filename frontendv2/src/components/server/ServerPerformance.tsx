/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use client';

import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { Cpu, Database, HardDrive, Globe } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface PerformanceDataPoint {
    timestamp: number;
    value: number;
}

interface ServerPerformanceProps {
    cpuData: PerformanceDataPoint[];
    memoryData: PerformanceDataPoint[];
    diskData: PerformanceDataPoint[];
    networkData: PerformanceDataPoint[];
    cpuLimit: number;
    memoryLimit: number;
    diskLimit: number;
}

export default function ServerPerformance({
    cpuData,
    memoryData,
    diskData,
    networkData,
    cpuLimit,
    memoryLimit,
    diskLimit,
}: ServerPerformanceProps) {
    const { t } = useTranslation();

    const formatMemory = (value: number): string => {
        if (value >= 1024) {
            return `${(value / 1024).toFixed(1)} GiB`;
        }
        return `${value.toFixed(1)} MiB`;
    };

    const formatBytes = (bytes: number): string => {
        if (bytes >= 1024 * 1024 * 1024) {
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        } else if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        } else if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        }
        return `${bytes.toFixed(2)} B`;
    };

    const getCurrentValue = (data: PerformanceDataPoint[]): number => {
        if (!data.length) return 0;
        return data[data.length - 1].value;
    };

    const getDiskUsagePercentage = (): number => {
        if (diskLimit === 0) return 0;
        const currentUsage = getCurrentValue(diskData);
        return (currentUsage / diskLimit) * 100;
    };

    const getDiskColor = (): string => {
        const usage = getDiskUsagePercentage();
        if (usage > 95) return '#ef4444'; // red
        if (usage > 80) return '#f59e0b'; // yellow
        return '#10b981'; // green
    };

    const charts = [
        {
            title: t('servers.console.performance.cpu_load'),
            data: cpuData,
            color: '#ef4444',
            icon: Cpu,
            currentValue: `${getCurrentValue(cpuData).toFixed(1)}%`,
            limit: cpuLimit > 0 ? `${cpuLimit}%` : t('servers.console.info_cards.unlimited'),
            max: cpuLimit > 0 ? cpuLimit : undefined,
        },
        {
            title: t('servers.memory'),
            data: memoryData,
            color: '#3b82f6',
            icon: Database,
            currentValue: formatMemory(getCurrentValue(memoryData)),
            limit: memoryLimit > 0 ? formatMemory(memoryLimit) : t('servers.console.info_cards.unlimited'),
            max: memoryLimit > 0 ? memoryLimit : undefined,
        },
        {
            title: t('servers.disk'),
            data: diskData,
            color: getDiskColor(),
            icon: HardDrive,
            currentValue: formatMemory(getCurrentValue(diskData)),
            limit: diskLimit > 0 ? formatMemory(diskLimit) : t('servers.console.info_cards.unlimited'),
            max: diskLimit > 0 ? diskLimit : undefined,
        },
        {
            title: t('servers.console.performance.network'),
            data: networkData,
            color: '#f59e0b',
            icon: Globe,
            currentValue: formatBytes(getCurrentValue(networkData)),
            limit: 'N/A',
            max: undefined,
        },
    ];

    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            {charts.map((chart) => {
                const Icon = chart.icon;
                return (
                    <div
                        key={chart.title}
                        className='rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all'
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

                                                    if (chart.title === t('servers.console.performance.cpu_load')) {
                                                        formattedValue = `${value.toFixed(1)}%`;
                                                    } else if (
                                                        chart.title === t('servers.console.performance.network')
                                                    ) {
                                                        formattedValue = formatBytes(value);
                                                    } else {
                                                        formattedValue = formatMemory(value);
                                                    }

                                                    return (
                                                        <div className='bg-background border border-border rounded-lg p-2 shadow-lg'>
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
