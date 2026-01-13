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
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-center space-y-4'>
                <div className='p-3 bg-destructive/20 rounded-full w-fit mx-auto'>
                    <AlertCircle className='h-6 w-6 text-destructive' />
                </div>
                <div>
                    <h3 className='text-lg font-bold text-destructive'>
                        {t('admin.node.view.utilization.error_title')}
                    </h3>
                    <p className='text-muted-foreground text-sm space-y-2'>{error}</p>
                </div>
                <Button variant='outline' onClick={onRefresh} size='sm'>
                    <RefreshCw className='h-4 w-4 mr-2' />
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
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                {resourceItems.map((item, index) => (
                    <PageCard key={index} title={item.title} icon={item.icon}>
                        <div className='space-y-6'>
                            <div className='flex justify-between items-end mb-2'>
                                <span className='text-sm text-muted-foreground font-medium'>
                                    {t('admin.node.view.utilization.current_usage')}
                                </span>
                                <span className='text-lg font-bold tabular-nums'>{item.label}</span>
                            </div>

                            <Progress value={item.value} className='h-3' indicatorClassName={item.color} />

                            <div className='grid grid-cols-3 gap-4 pt-4 border-t border-border/50'>
                                {item.stats.map((stat, sIndex) => (
                                    <div key={sIndex}>
                                        <p className='text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1'>
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
                            <div className='flex justify-between items-end mb-2'>
                                <span className='text-sm text-muted-foreground font-medium'>
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

                            <div className='pt-4 border-t border-border/50'>
                                <p className='text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1'>
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

            {/* Disk Details Table */}
            {utilization.disk_details && utilization.disk_details.length > 0 && (
                <PageCard title={t('admin.node.view.utilization.disk_details')} icon={HardDrive}>
                    <div className='overflow-x-auto'>
                        <table className='w-full text-sm'>
                            <thead>
                                <tr className='border-b border-border/50 text-left'>
                                    <th className='p-4 font-medium text-muted-foreground uppercase tracking-wider text-[10px]'>
                                        {t('admin.node.view.utilization.mountpoint')}
                                    </th>
                                    <th className='p-4 font-medium text-muted-foreground uppercase tracking-wider text-[10px]'>
                                        {t('admin.node.view.utilization.device')}
                                    </th>
                                    <th className='p-4 font-medium text-muted-foreground uppercase tracking-wider text-[10px]'>
                                        {t('admin.node.view.utilization.usage')}
                                    </th>
                                    <th className='p-4 font-medium text-muted-foreground uppercase tracking-wider text-[10px]'>
                                        {t('admin.node.view.utilization.tags')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {utilization.disk_details.map((disk, index) => (
                                    <tr
                                        key={index}
                                        className='border-b border-border/10 last:border-0 hover:bg-muted/30 transition-colors'
                                    >
                                        <td className='p-4 font-mono text-xs'>{disk.mountpoint}</td>
                                        <td className='p-4 text-muted-foreground text-xs'>{disk.device}</td>
                                        <td className='p-4'>
                                            <div className='flex items-center gap-3'>
                                                <div className='flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[80px]'>
                                                    <div
                                                        className='h-full bg-primary rounded-full'
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
                                                        className='text-[9px] uppercase tracking-tighter'
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
