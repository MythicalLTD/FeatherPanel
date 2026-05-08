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

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Cpu, HardDrive, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { formatBytes } from '@/lib/format';
import { UtilizationResponse } from '../types';

interface UtilizationTabProps {
    loading: boolean;
    data: UtilizationResponse | null;
    error: string | null;
    onRefresh: () => void;
}

export function UtilizationTab({ loading, data, error, onRefresh }: UtilizationTabProps) {
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='border-primary h-8 w-8 animate-spin rounded-full border-b-2'></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='bg-destructive/10 border-destructive/20 space-y-4 rounded-2xl border p-6 text-center'>
                <div className='bg-destructive/20 mx-auto w-fit rounded-full p-3'>
                    <AlertCircle className='text-destructive h-6 w-6' />
                </div>
                <div>
                    <h3 className='text-destructive text-lg font-bold'>
                        {t('admin.node.view.utilization.error_title')}
                    </h3>
                    <p className='text-muted-foreground space-y-2 text-sm'>{error}</p>
                </div>
                <Button variant='outline' onClick={onRefresh} size='sm'>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {t('common.retry')}
                </Button>
            </div>
        );
    }

    if (!data) return null;

    const { utilization } = data;

    const resourceItems = [
        {
            title: t('admin.node.view.utilization.cpu'),
            value: utilization.cpu_percent,
            label: `${utilization.cpu_percent.toFixed(2)}%`,
            icon: Cpu,
            color: 'bg-blue-500',
            stats: [
                { label: t('admin.node.view.utilization.load_1m'), value: utilization.load_average1 },
                { label: t('admin.node.view.utilization.load_5m'), value: utilization.load_average5 },
                { label: t('admin.node.view.utilization.load_15m'), value: utilization.load_average15 },
            ],
        },
        {
            title: t('admin.node.view.utilization.memory'),
            value: (utilization.memory_used / utilization.memory_total) * 100,
            label: `${formatBytes(utilization.memory_used)} / ${formatBytes(utilization.memory_total)}`,
            icon: Zap,
            color: 'bg-purple-500',
            stats: [
                {
                    label: t('admin.node.view.utilization.memory_percent'),
                    value: `${((utilization.memory_used / utilization.memory_total) * 100).toFixed(1)}%`,
                },
            ],
        },
        {
            title: t('admin.node.view.utilization.disk'),
            value: (utilization.disk_used / utilization.disk_total) * 100,
            label: `${formatBytes(utilization.disk_used)} / ${formatBytes(utilization.disk_total)}`,
            icon: HardDrive,
            color: 'bg-green-500',
            stats: [
                {
                    label: t('admin.node.view.utilization.disk_percent'),
                    value: `${((utilization.disk_used / utilization.disk_total) * 100).toFixed(1)}%`,
                },
            ],
        },
    ];

    return (
        <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                {resourceItems.map((item, index) => (
                    <PageCard key={index} title={item.title} icon={item.icon}>
                        <div className='space-y-6'>
                            <div className='mb-2 flex items-end justify-between'>
                                <span className='text-muted-foreground text-sm font-medium'>
                                    {t('admin.node.view.utilization.current_usage')}
                                </span>
                                <span className='text-lg font-bold tabular-nums'>{item.label}</span>
                            </div>

                            <Progress value={item.value} className='h-3' indicatorClassName={item.color} />

                            <div className='border-border/50 grid grid-cols-3 gap-4 border-t pt-4'>
                                {item.stats.map((stat, sIndex) => (
                                    <div key={sIndex}>
                                        <p className='text-muted-foreground mb-1 text-[10px] font-bold tracking-wider uppercase'>
                                            {stat.label}
                                        </p>
                                        <p className='text-sm font-semibold'>{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PageCard>
                ))}

                {utilization.swap_total > 0 && (
                    <PageCard title={t('admin.node.view.utilization.swap')} icon={Zap}>
                        <div className='space-y-6'>
                            <div className='mb-2 flex items-end justify-between'>
                                <span className='text-muted-foreground text-sm font-medium'>
                                    {t('admin.node.view.utilization.current_usage')}
                                </span>
                                <span className='text-lg font-bold tabular-nums'>
                                    {formatBytes(utilization.swap_used)} / {formatBytes(utilization.swap_total)}
                                </span>
                            </div>

                            <Progress
                                value={(utilization.swap_used / utilization.swap_total) * 100}
                                className='h-3'
                                indicatorClassName='bg-orange-500'
                            />

                            <div className='border-border/50 border-t pt-4'>
                                <p className='text-muted-foreground mb-1 text-[10px] font-bold tracking-wider uppercase'>
                                    {t('admin.node.view.utilization.swap_percent')}
                                </p>
                                <p className='text-sm font-semibold'>
                                    {((utilization.swap_used / utilization.swap_total) * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </PageCard>
                )}
            </div>

            {utilization.disk_details && utilization.disk_details.length > 0 && (
                <PageCard title={t('admin.node.view.utilization.disk_details')} icon={HardDrive}>
                    <div className='overflow-x-auto'>
                        <table className='w-full text-sm'>
                            <thead>
                                <tr className='border-border/50 border-b text-left'>
                                    <th className='text-muted-foreground p-4 text-[10px] font-medium tracking-wider uppercase'>
                                        {t('admin.node.view.utilization.mountpoint')}
                                    </th>
                                    <th className='text-muted-foreground p-4 text-[10px] font-medium tracking-wider uppercase'>
                                        {t('admin.node.view.utilization.device')}
                                    </th>
                                    <th className='text-muted-foreground p-4 text-[10px] font-medium tracking-wider uppercase'>
                                        {t('admin.node.view.utilization.usage')}
                                    </th>
                                    <th className='text-muted-foreground p-4 text-[10px] font-medium tracking-wider uppercase'>
                                        {t('admin.node.view.utilization.tags')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {utilization.disk_details.map((disk, index) => (
                                    <tr
                                        key={index}
                                        className='border-border/10 hover:bg-muted/30 border-b transition-colors last:border-0'
                                    >
                                        <td className='p-4 font-mono text-xs'>{disk.mountpoint}</td>
                                        <td className='text-muted-foreground p-4 text-xs'>{disk.device}</td>
                                        <td className='p-4'>
                                            <div className='flex items-center gap-3'>
                                                <div className='bg-muted h-1.5 max-w-[80px] flex-1 overflow-hidden rounded-full'>
                                                    <div
                                                        className='bg-primary h-full rounded-full'
                                                        style={{
                                                            width: `${(disk.used_space / disk.total_space) * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className='text-xs font-medium'>
                                                    {formatBytes(disk.used_space)} / {formatBytes(disk.total_space)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className='p-4'>
                                            <div className='flex flex-wrap gap-1'>
                                                {disk.tags.map((tag, tIndex) => (
                                                    <Badge
                                                        key={tIndex}
                                                        variant='outline'
                                                        className='text-[9px] tracking-tighter uppercase'
                                                    >
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </PageCard>
            )}
        </div>
    );
}
