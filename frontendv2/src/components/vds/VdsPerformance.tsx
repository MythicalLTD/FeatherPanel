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
import { ResponsiveContainer, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { Cpu, Database, Globe, Loader2 } from 'lucide-react';
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
            color: '#10b981', // Emerald
            glow: 'rgba(16, 185, 129, 0.5)',
            icon: Cpu,
            currentValue: `${(getCurrentValue(cpuData) * 100).toFixed(1)}%`,
            limit: cpuLimit > 0 ? `${cpuLimit} Cores` : 'Unlimited',
            max: cpuLimit > 0 ? cpuLimit : undefined,
        },
        {
            id: 'memory',
            title: t('vds.console.performance.memory') || 'Memory Usage',
            data: memoryData,
            color: '#3b82f6', // Blue
            glow: 'rgba(59, 130, 246, 0.5)',
            icon: Database,
            currentValue: formatMemory(getCurrentValue(memoryData)),
            limit: memoryLimit > 0 ? formatMemory(memoryLimit) : 'Unlimited',
            max: memoryLimit > 0 ? memoryLimit : undefined,
        },
        {
            id: 'netin',
            title: t('vds.console.performance.network_rx') || 'Network Inbound',
            data: networkRxData,
            color: '#6366f1', // Indigo
            glow: 'rgba(99, 102, 241, 0.5)',
            icon: Globe,
            currentValue: formatBytesPerSecond(getCurrentValue(networkRxData)),
            limit: 'N/A',
            max: undefined,
        },
        {
            id: 'netout',
            title: t('vds.console.performance.network_tx') || 'Network Outbound',
            data: networkTxData,
            color: '#a855f7', // Purple
            glow: 'rgba(168, 85, 247, 0.5)',
            icon: Globe,
            currentValue: formatBytesPerSecond(getCurrentValue(networkTxData)),
            limit: 'N/A',
            max: undefined,
        },
    ];

    return (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {charts.map((chart, idx) => {
                const Icon = chart.icon;
                return (
                    <div
                        key={chart.id}
                        className='group relative overflow-hidden rounded-4xl border border-white/5 bg-[#0a0a0b]/40 backdrop-blur-2xl p-1 transition-all hover:bg-[#0a0a0b]/60 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both'
                        style={{ animationDelay: `${idx * 150}ms` }}
                    >
                        {/* Glow effect */}
                        <div 
                            className='absolute -top-24 -right-24 w-64 h-64 blur-[100px] opacity-0 group-hover:opacity-10 transition-opacity duration-1000'
                            style={{ backgroundColor: chart.color }}
                        />

                        <div className='p-8 relative z-10'>
                            <div className='flex items-center justify-between mb-8 text-white'>
                                <div className='flex items-center gap-5'>
                                    <div className='h-14 w-14 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all group-hover:scale-110 duration-500 shadow-2xl'>
                                        <Icon className='h-7 w-7 opacity-40 group-hover:opacity-100 transition-opacity' />
                                    </div>
                                    <div className='space-y-1'>
                                        <h3 className='text-[10px] font-black uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors'>
                                            {chart.title}
                                        </h3>
                                        <div className='flex items-baseline gap-2'>
                                            <span className='text-3xl font-black italic tracking-tighter leading-none'>
                                                {chart.currentValue}
                                            </span>
                                            {chart.limit !== 'N/A' && (
                                                <span className='text-[10px] font-black uppercase tracking-widest text-white/20 italic'>
                                                    / {chart.limit}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className='flex flex-col items-end gap-2'>
                                    <div
                                        className='h-3 w-3 rounded-full animate-pulse shadow-2xl'
                                        style={{ 
                                            backgroundColor: chart.color,
                                            boxShadow: `0 0 15px ${chart.glow}`
                                        }}
                                    />
                                    <span className='text-[10px] font-black uppercase tracking-widest text-white/20 animate-pulse'>Live</span>
                                </div>
                            </div>

                            <div className='h-[180px] w-full mt-4 -mx-4'>
                                {chart.data.length > 0 ? (
                                    <ResponsiveContainer width='100%' height='100%'>
                                        <AreaChart data={chart.data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id={`gradient-${chart.id}`} x1='0' y1='0' x2='0' y2='1'>
                                                    <stop offset='0%' stopColor={chart.color} stopOpacity={0.2} />
                                                    <stop offset='100%' stopColor={chart.color} stopOpacity={0} />
                                                </linearGradient>
                                                <filter id={`glow-${chart.id}`} x='-20%' y='-20%' width='140%' height='140%'>
                                                    <feGaussianBlur stdDeviation='4' result='blur' />
                                                    <feComposite in='SourceGraphic' in2='blur' operator='over' />
                                                </filter>
                                            </defs>
                                            <YAxis domain={[0, chart.max && chart.id !== 'cpu' ? chart.max : 'auto']} hide />
                                            <Tooltip
                                                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                                content={({ active, payload }) => {
                                                    if (!active || !payload || !payload.length) return null;
                                                    const value = payload[0].value as number;
                                                    let formattedValue = '';

                                                    if (chart.id === 'cpu') {
                                                        formattedValue = `${(value * 100).toFixed(1)}%`;
                                                    } else if (chart.id.startsWith('net')) {
                                                        formattedValue = formatBytesPerSecond(value);
                                                    } else {
                                                        formattedValue = formatMemory(value);
                                                    }

                                                    return (
                                                        <div className='bg-[#0a0a0b]/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'>
                                                            <div className='flex flex-col gap-1'>
                                                                <span className='text-[10px] font-black uppercase tracking-widest text-white/30'>{chart.title}</span>
                                                                <span className='text-xl font-black text-white italic'>{formattedValue}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Area
                                                type='monotone'
                                                dataKey='value'
                                                stroke={chart.color}
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill={`url(#gradient-${chart.id})`}
                                                animationDuration={400}
                                                filter={`url(#glow-${chart.id})`}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className='flex flex-col items-center justify-center h-full gap-4 text-white/10'>
                                        <Loader2 className='h-8 w-8 animate-spin opacity-20' />
                                        <span className='text-[10px] font-black uppercase tracking-[0.3em]'>
                                            {t('common.waitingData') || 'Awaiting Metrics...'}
                                        </span>
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
