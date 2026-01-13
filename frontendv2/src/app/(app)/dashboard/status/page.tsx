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

'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    RefreshCw,
    Server as ServerIcon,
    Check,
    AlertTriangle,
    Cpu,
    MemoryStick,
    HardDrive,
    Search,
    ChevronRight,
    LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';

import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatMemory, formatDisk } from '@/lib/server-utils';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

interface StatusData {
    enabled: boolean;
    data?: {
        global?: {
            total_nodes?: number;
            healthy_nodes?: number;
            unhealthy_nodes?: number;
            total_memory?: number;
            used_memory?: number;
            total_disk?: number;
            used_disk?: number;
            avg_cpu_percent?: number;
        };
        total_servers?: number;
        nodes?: Array<{
            id: number;
            name: string;
            fqdn?: string;
            status: 'healthy' | 'unhealthy';
            server_count?: number;
            utilization?: {
                memory_total?: number;
                memory_used?: number;
                disk_total?: number;
                disk_used?: number;
                cpu_percent?: number;
            };
        }>;
    };
}

export default function StatusPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusData, setStatusData] = useState<StatusData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-status');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const fetchNodes = useCallback(
        async (isAuto = false) => {
            if (!isAuto) setLoading(true);
            else setRefreshing(true);

            setError(null);

            try {
                const { data } = await axios.get('/api/user/status');

                if (data && data.success) {
                    setStatusData(data.data);
                } else {
                    setError(data?.message || t('dashboard.status.failedToFetchStatus'));
                }
            } catch (err: unknown) {
                let errorMessage = t('dashboard.status.failedToFetchStatus');
                if (axios.isAxiosError(err)) {
                    errorMessage = err.response?.data?.message || errorMessage;
                }
                setError(errorMessage);
                if (errorMessage !== 'Status page is disabled') {
                    toast.error(errorMessage);
                }
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [t],
    );

    const manualRefresh = async () => {
        await fetchNodes();
        toast.success(t('dashboard.status.statusRefreshed'));
    };

    useEffect(() => {
        fetchNodes();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchNodes(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchNodes]);

    const filteredNodes =
        statusData?.data?.nodes?.filter(
            (node) =>
                node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                node.fqdn?.toLowerCase().includes(searchQuery.toLowerCase()),
        ) || [];

    if (loading && !statusData) {
        return (
            <div className='flex h-[50vh] items-center justify-center'>
                <div className='flex items-center gap-3 text-muted-foreground'>
                    <div className='animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent' />
                    <span>{t('dashboard.status.loading')}</span>
                </div>
            </div>
        );
    }

    if (statusData && !statusData.enabled) {
        return (
            <div className='max-w-4xl mx-auto p-4 md:p-8'>
                <Alert>
                    <AlertTriangle className='h-4 w-4' />
                    <AlertTitle>{t('dashboard.status.statusPageDisabled')}</AlertTitle>
                    <AlertDescription>{t('dashboard.status.statusPageDisabledDescription')}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (error && !statusData) {
        return (
            <div className='max-w-4xl mx-auto p-4 md:p-8 space-y-4'>
                <Alert variant='destructive'>
                    <AlertTriangle className='h-4 w-4' />
                    <AlertTitle>{t('dashboard.status.failedToLoadStatus')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={() => fetchNodes()}>{t('dashboard.status.tryAgain')}</Button>
            </div>
        );
    }

    return (
        <div className='space-y-6 '>
            <WidgetRenderer widgets={getWidgets('dashboard-status', 'top-of-page')} />
            {/* Standard Header Layout */}
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div>
                    <h1 className='text-3xl font-bold tracking-tight mb-2'>{t('dashboard.status.title')}</h1>
                    <p className='text-muted-foreground'>{t('dashboard.status.description')}</p>
                </div>
                <Button
                    onClick={manualRefresh}
                    disabled={refreshing}
                    className='bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                >
                    <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
                    {refreshing ? t('dashboard.status.refreshing') : t('dashboard.status.refresh')}
                </Button>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-status', 'after-header')} />

            {/* Global Stats bar - Standardized with List Container Background */}
            {statusData?.data?.global && (
                <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                    <div className='bg-card border border-border/50 rounded-xl p-5 flex items-center justify-between shadow-sm'>
                        <div className='space-y-1'>
                            <p className='text-[10px] text-muted-foreground uppercase font-black tracking-widest'>
                                {t('dashboard.status.totalNodes')}
                            </p>
                            <p className='text-3xl font-bold'>{statusData.data.global.total_nodes}</p>
                        </div>
                        <div className='p-3 bg-primary/5 rounded-xl border border-primary/10'>
                            <LayoutGrid className='h-6 w-6 text-primary opacity-60' />
                        </div>
                    </div>
                    <div className='bg-card border border-border/50 rounded-xl p-5 flex items-center justify-between shadow-sm'>
                        <div className='space-y-1'>
                            <p className='text-[10px] text-muted-foreground uppercase font-black tracking-widest'>
                                {t('dashboard.status.healthyNodes')}
                            </p>
                            <p className='text-2xl font-bold text-green-500'>{statusData.data.global.healthy_nodes}</p>
                        </div>
                        <div className='p-3 bg-green-500/5 rounded-xl border border-green-500/10'>
                            <Check className='h-6 w-6 text-green-500 opacity-60' />
                        </div>
                    </div>
                    <div className='bg-card border border-border/50 rounded-xl p-5 flex items-center justify-between shadow-sm'>
                        <div className='space-y-1'>
                            <p className='text-[10px] text-muted-foreground uppercase font-black tracking-widest'>
                                {t('dashboard.status.totalServers')}
                            </p>
                            <p className='text-2xl font-bold text-primary'>{statusData.data.total_servers}</p>
                        </div>
                        <div className='p-3 bg-primary/5 rounded-xl border border-primary/10'>
                            <ServerIcon className='h-6 w-6 text-primary opacity-60' />
                        </div>
                    </div>
                    <div className='bg-card border border-border/50 rounded-xl p-5 flex items-center justify-between shadow-sm'>
                        <div className='space-y-1'>
                            <p className='text-[10px] text-muted-foreground uppercase font-black tracking-widest'>
                                {t('dashboard.status.avgCpuUsage')}
                            </p>
                            <p className='text-2xl font-bold'>
                                {Math.round(statusData.data.global.avg_cpu_percent || 0)}%
                            </p>
                        </div>
                        <div className='p-3 bg-blue-500/5 rounded-xl border border-blue-500/10'>
                            <Cpu className='h-6 w-6 text-blue-500 opacity-60' />
                        </div>
                    </div>
                </div>
            )}
            <WidgetRenderer widgets={getWidgets('dashboard-status', 'after-global-stats')} />

            {/* Content Section */}
            <div className='space-y-4'>
                <div className='flex items-center justify-between pt-4'>
                    <h2 className='text-xl font-bold tracking-tight'>{t('dashboard.status.individualNodes')}</h2>
                </div>

                {/* Filter/Search Bar - EXACTLY Matching Tickets/KB Pattern (bg-card/50) */}
                <div className='bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-1'>
                    <div className='flex flex-col md:flex-row gap-4 p-4'>
                        <div className='flex-1'>
                            <div className='relative'>
                                <Input
                                    placeholder={t('tickets.searchTickets')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className='w-full bg-background/50 border-border/50 focus:border-primary/50 pr-10 h-10'
                                />
                                <Search className='absolute right-3 top-3 h-4 w-4 text-muted-foreground opacity-40' />
                            </div>
                        </div>
                    </div>
                </div>

                <WidgetRenderer widgets={getWidgets('dashboard-status', 'before-node-list')} />

                {/* Unified Nodes List - Standardized bg-card (Solid) */}
                <div className='bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden'>
                    <div className='divide-y divide-border/50'>
                        {filteredNodes.length > 0 ? (
                            filteredNodes.map((node) => (
                                <div
                                    key={node.id}
                                    className='p-6 hover:bg-white/1.5 transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group border-l-2 border-l-transparent hover:border-l-primary'
                                >
                                    <div className='flex items-center gap-5 flex-1 min-w-0'>
                                        <div
                                            className={cn(
                                                'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border border-border/30 shadow-inner',
                                                node.status === 'healthy'
                                                    ? 'bg-green-500/5 text-green-500'
                                                    : 'bg-red-500/5 text-red-500',
                                            )}
                                        >
                                            <ServerIcon className='h-6 w-6' />
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex items-center gap-4 mb-1'>
                                                <h3 className='font-bold text-xl text-foreground truncate group-hover:text-primary transition-colors'>
                                                    {node.name}
                                                </h3>
                                                <Badge
                                                    className={cn(
                                                        'rounded-md px-2 py-0 font-black text-[10px] uppercase tracking-tighter border-0',
                                                        node.status === 'healthy'
                                                            ? 'bg-green-500/10 text-green-500'
                                                            : 'bg-red-500/10 text-red-500',
                                                    )}
                                                >
                                                    {node.status === 'healthy'
                                                        ? t('dashboard.status.online')
                                                        : t('dashboard.status.offline')}
                                                </Badge>
                                            </div>
                                            <div className='flex items-center gap-3 text-xs text-muted-foreground font-medium'>
                                                <span className='opacity-70 font-mono tracking-tight'>
                                                    {node.fqdn || 'N/A'}
                                                </span>
                                                <span className='w-1 h-1 rounded-full bg-muted-foreground/30' />
                                                <span>{node.server_count} Servers</span>
                                            </div>
                                        </div>
                                    </div>

                                    {node.status === 'healthy' && node.utilization ? (
                                        <div className='flex flex-wrap items-center gap-x-12 gap-y-6 lg:gap-16 min-w-0'>
                                            <div className='flex flex-col lg:items-end min-w-[100px]'>
                                                <span className='text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60'>
                                                    {t('dashboard.status.cpuUsage')}
                                                </span>
                                                <div className='flex items-center gap-3'>
                                                    <div className='h-1.5 w-32 bg-muted/50 rounded-full overflow-hidden hidden xl:block border border-white/5'>
                                                        <div
                                                            className='h-full bg-primary'
                                                            style={{ width: `${node.utilization.cpu_percent}%` }}
                                                        />
                                                    </div>
                                                    <span className='font-bold text-sm tracking-tighter'>
                                                        {Math.round(node.utilization.cpu_percent || 0)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className='flex flex-col lg:items-end min-w-[100px]'>
                                                <span className='text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60'>
                                                    {t('dashboard.status.memory')}
                                                </span>
                                                <div className='flex items-center gap-3'>
                                                    <div className='h-1.5 w-32 bg-muted/50 rounded-full overflow-hidden hidden xl:block border border-white/5'>
                                                        <div
                                                            className='h-full bg-blue-500'
                                                            style={{
                                                                width: `${node.utilization.memory_total ? (node.utilization.memory_used! / node.utilization.memory_total!) * 100 : 0}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className='font-bold text-sm tracking-tighter'>
                                                        {Math.round(
                                                            ((node.utilization.memory_used || 0) /
                                                                (node.utilization.memory_total || 1)) *
                                                                100,
                                                        )}
                                                        %
                                                    </span>
                                                </div>
                                            </div>
                                            <div className='flex flex-col lg:items-end min-w-[100px]'>
                                                <span className='text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60'>
                                                    {t('dashboard.status.disk')}
                                                </span>
                                                <div className='flex items-center gap-3'>
                                                    <div className='h-1.5 w-32 bg-muted/50 rounded-full overflow-hidden hidden xl:block border border-white/5'>
                                                        <div
                                                            className='h-full bg-green-500'
                                                            style={{
                                                                width: `${node.utilization.disk_total ? (node.utilization.disk_used! / node.utilization.disk_total!) * 100 : 0}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className='font-bold text-sm tracking-tighter'>
                                                        {Math.round(
                                                            ((node.utilization.disk_used || 0) /
                                                                (node.utilization.disk_total || 1)) *
                                                                100,
                                                        )}
                                                        %
                                                    </span>
                                                </div>
                                            </div>
                                            <div className='hidden lg:block pl-6 border-l border-border/50'>
                                                <ChevronRight className='h-5 w-5 text-muted-foreground/20 group-hover:text-primary transition-colors' />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className='text-red-500 flex items-center gap-2 font-black text-xs uppercase tracking-widest'>
                                            <AlertTriangle className='h-4 w-4' />
                                            {t('dashboard.status.offline')}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className='py-24 text-center'>
                                <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/5 mb-6 text-primary border border-primary/10'>
                                    <ServerIcon className='h-10 w-10 opacity-60' />
                                </div>
                                <h3 className='text-xl font-bold mb-2'>{t('tickets.noTicketsFound')}</h3>
                                <p className='text-muted-foreground max-w-xs mx-auto opacity-70'>
                                    {t('dashboard.status.failedToLoadStatus')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <WidgetRenderer widgets={getWidgets('dashboard-status', 'after-node-list')} />
            </div>

            {/* Global Resource Integrated Bar Section (Matching bg-card solid) */}
            {statusData?.data?.global && (
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                    <div className='bg-card rounded-xl border border-border/50 p-6 shadow-sm'>
                        <div className='flex items-center justify-between mb-4'>
                            <span className='text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground'>
                                <MemoryStick className='h-4 w-4 text-blue-500 opacity-60' />{' '}
                                {t('dashboard.status.globalMemoryUsage')}
                            </span>
                            <span className='text-xs font-bold text-muted-foreground opacity-80'>
                                {formatMemory(statusData.data.global.used_memory || 0)} /{' '}
                                {formatMemory(statusData.data.global.total_memory || 0)}
                            </span>
                        </div>
                        <div className='h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-white/5'>
                            <div
                                className='h-full bg-blue-500 transition-all duration-1000 ease-out'
                                style={{
                                    width: `${statusData.data.global.total_memory ? (statusData.data.global.used_memory! / statusData.data.global.total_memory!) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>
                    <div className='bg-card rounded-xl border border-border/50 p-6 shadow-sm'>
                        <div className='flex items-center justify-between mb-4'>
                            <span className='text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground'>
                                <HardDrive className='h-4 w-4 text-green-500 opacity-60' />{' '}
                                {t('dashboard.status.globalDiskUsage')}
                            </span>
                            <span className='text-xs font-bold text-muted-foreground opacity-80'>
                                {formatDisk(statusData.data.global.used_disk || 0)} /{' '}
                                {formatDisk(statusData.data.global.total_disk || 0)}
                            </span>
                        </div>
                        <div className='h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-white/5'>
                            <div
                                className='h-full bg-green-500 transition-all duration-1000 ease-out'
                                style={{
                                    width: `${statusData.data.global.total_disk ? (statusData.data.global.used_disk! / statusData.data.global.total_disk!) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
            <WidgetRenderer widgets={getWidgets('dashboard-status', 'bottom-of-page')} />
        </div>
    );
}
