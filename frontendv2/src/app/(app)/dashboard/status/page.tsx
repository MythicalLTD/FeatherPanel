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
import { usePathname } from 'next/navigation';
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
    const pathname = usePathname();
    const isPublicStatusPage = pathname.startsWith('/status');
    const statusApiPath = pathname.startsWith('/status') ? '/api/status' : '/api/user/status';
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
                const { data } = await axios.get(statusApiPath);

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
        [statusApiPath, t],
    );

    const manualRefresh = async () => {
        await fetchNodes();
        toast.success(t('dashboard.status.statusRefreshed'));
    };

    useEffect(() => {
        fetchNodes();

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
                <div className='text-muted-foreground flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent' />
                    <span>{t('dashboard.status.loading')}</span>
                </div>
            </div>
        );
    }

    if (statusData && !statusData.enabled) {
        return (
            <div className='mx-auto max-w-4xl p-4 md:p-8'>
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
            <div className='mx-auto max-w-4xl space-y-4 p-4 md:p-8'>
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
        <div
            className={cn(
                'space-y-6',
                isPublicStatusPage && 'mx-auto w-full max-w-7xl px-4 pt-8 pb-12 md:px-8 md:pt-10',
            )}
        >
            <WidgetRenderer widgets={getWidgets('dashboard-status', 'top-of-page')} />

            <div
                className={cn(
                    'flex flex-col justify-between gap-4 sm:flex-row sm:items-center',
                    isPublicStatusPage &&
                        'border-border/60 from-card via-card/90 to-primary/5 rounded-2xl border bg-gradient-to-br p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.65)] md:p-7',
                )}
            >
                <div>
                    <div className='mb-3 flex items-center gap-2'>
                        {isPublicStatusPage && (
                            <Badge className='bg-primary/15 text-primary border-primary/20 border text-[10px] font-bold tracking-wide uppercase'>
                                {t('public_portal.badges.public')}
                            </Badge>
                        )}
                        <Badge className='border border-green-500/20 bg-green-500/15 text-[10px] font-bold tracking-wide text-green-500 uppercase'>
                            {t('public_portal.badges.live')}
                        </Badge>
                    </div>
                    <h1 className='mb-2 text-3xl font-bold tracking-tight'>{t('dashboard.status.title')}</h1>
                    <p className='text-muted-foreground'>{t('dashboard.status.description')}</p>
                </div>
                <Button
                    onClick={manualRefresh}
                    disabled={refreshing}
                    className='bg-primary hover:bg-primary/90 text-primary-foreground'
                >
                    <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
                    {refreshing ? t('dashboard.status.refreshing') : t('dashboard.status.refresh')}
                </Button>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-status', 'after-header')} />

            {statusData?.data?.global && (
                <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
                    <div className='bg-card/50 border-border/50 flex items-center justify-between rounded-xl border p-5 backdrop-blur-xl'>
                        <div className='space-y-1'>
                            <p className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
                                {t('dashboard.status.totalNodes')}
                            </p>
                            <p className='text-3xl font-bold'>{statusData.data.global.total_nodes}</p>
                        </div>
                        <div className='bg-primary/5 border-primary/10 rounded-xl border p-3'>
                            <LayoutGrid className='text-primary h-6 w-6 opacity-60' />
                        </div>
                    </div>
                    <div className='bg-card/50 border-border/50 flex items-center justify-between rounded-xl border p-5 backdrop-blur-xl'>
                        <div className='space-y-1'>
                            <p className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
                                {t('dashboard.status.healthyNodes')}
                            </p>
                            <p className='text-2xl font-bold text-green-500'>{statusData.data.global.healthy_nodes}</p>
                        </div>
                        <div className='rounded-xl border border-green-500/10 bg-green-500/5 p-3'>
                            <Check className='h-6 w-6 text-green-500 opacity-60' />
                        </div>
                    </div>
                    <div className='bg-card/50 border-border/50 flex items-center justify-between rounded-xl border p-5 backdrop-blur-xl'>
                        <div className='space-y-1'>
                            <p className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
                                {t('dashboard.status.totalServers')}
                            </p>
                            <p className='text-primary text-2xl font-bold'>{statusData.data.total_servers}</p>
                        </div>
                        <div className='bg-primary/5 border-primary/10 rounded-xl border p-3'>
                            <ServerIcon className='text-primary h-6 w-6 opacity-60' />
                        </div>
                    </div>
                    <div className='bg-card/50 border-border/50 flex items-center justify-between rounded-xl border p-5 backdrop-blur-xl'>
                        <div className='space-y-1'>
                            <p className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
                                {t('dashboard.status.avgCpuUsage')}
                            </p>
                            <p className='text-2xl font-bold'>
                                {Math.round(statusData.data.global.avg_cpu_percent || 0)}%
                            </p>
                        </div>
                        <div className='rounded-xl border border-blue-500/10 bg-blue-500/5 p-3'>
                            <Cpu className='h-6 w-6 text-blue-500 opacity-60' />
                        </div>
                    </div>
                </div>
            )}
            <WidgetRenderer widgets={getWidgets('dashboard-status', 'after-global-stats')} />

            <div className='space-y-4'>
                <div className='flex items-center justify-between pt-4'>
                    <h2 className='text-xl font-bold tracking-tight'>{t('dashboard.status.individualNodes')}</h2>
                </div>

                <div className='bg-card/50 border-border/50 rounded-xl border p-1 backdrop-blur-xl'>
                    <div className='flex flex-col gap-4 p-4 md:flex-row'>
                        <div className='flex-1'>
                            <div className='relative'>
                                <Input
                                    placeholder={t('dashboard.status.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className='bg-background/50 border-border/50 focus:border-primary/50 h-10 w-full pr-10'
                                />
                                <Search className='text-muted-foreground absolute top-3 right-3 h-4 w-4 opacity-40' />
                            </div>
                        </div>
                    </div>
                </div>

                <WidgetRenderer widgets={getWidgets('dashboard-status', 'before-node-list')} />

                <div className='bg-card/50 border-border/50 overflow-hidden rounded-xl border backdrop-blur-xl'>
                    <div className='divide-border/50 divide-y'>
                        {filteredNodes.length > 0 ? (
                            filteredNodes.map((node) => (
                                <div
                                    key={node.id}
                                    className='group hover:border-l-primary flex flex-col justify-between gap-6 border-l-2 border-l-transparent p-6 transition-all duration-200 hover:bg-white/1.5 lg:flex-row lg:items-center'
                                >
                                    <div className='flex min-w-0 flex-1 items-center gap-5'>
                                        <div
                                            className={cn(
                                                'border-border/30 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border',
                                                node.status === 'healthy'
                                                    ? 'bg-green-500/5 text-green-500'
                                                    : 'bg-red-500/5 text-red-500',
                                            )}
                                        >
                                            <ServerIcon className='h-6 w-6' />
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                            <div className='mb-1 flex items-center gap-4'>
                                                <h3 className='text-foreground group-hover:text-primary truncate text-xl font-bold transition-colors'>
                                                    {node.name}
                                                </h3>
                                                <Badge
                                                    className={cn(
                                                        'rounded-md border-0 px-2 py-0 text-[10px] font-black tracking-tighter uppercase',
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
                                            <div className='text-muted-foreground flex items-center gap-3 text-xs font-medium'>
                                                <span className='font-mono tracking-tight opacity-70'>
                                                    {node.fqdn || t('public_portal.not_available')}
                                                </span>
                                                <span className='bg-muted-foreground/30 h-1 w-1 rounded-full' />
                                                <span>
                                                    {t('public_portal.servers_count', {
                                                        count: String(node.server_count ?? 0),
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {node.status === 'healthy' && node.utilization ? (
                                        <div className='flex min-w-0 flex-wrap items-center gap-x-12 gap-y-6 lg:gap-16'>
                                            <div className='flex min-w-[100px] flex-col lg:items-end'>
                                                <span className='text-muted-foreground mb-1.5 text-[10px] font-black tracking-widest uppercase opacity-60'>
                                                    {t('dashboard.status.cpuUsage')}
                                                </span>
                                                <div className='flex items-center gap-3'>
                                                    <div className='bg-muted/50 hidden h-1.5 w-32 overflow-hidden rounded-full border border-white/5 xl:block'>
                                                        <div
                                                            className='bg-primary h-full'
                                                            style={{ width: `${node.utilization.cpu_percent}%` }}
                                                        />
                                                    </div>
                                                    <span className='text-sm font-bold tracking-tighter'>
                                                        {Math.round(node.utilization.cpu_percent || 0)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className='flex min-w-[100px] flex-col lg:items-end'>
                                                <span className='text-muted-foreground mb-1.5 text-[10px] font-black tracking-widest uppercase opacity-60'>
                                                    {t('dashboard.status.memory')}
                                                </span>
                                                <div className='flex items-center gap-3'>
                                                    <div className='bg-muted/50 hidden h-1.5 w-32 overflow-hidden rounded-full border border-white/5 xl:block'>
                                                        <div
                                                            className='h-full bg-blue-500'
                                                            style={{
                                                                width: `${node.utilization.memory_total ? (node.utilization.memory_used! / node.utilization.memory_total!) * 100 : 0}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className='text-sm font-bold tracking-tighter'>
                                                        {Math.round(
                                                            ((node.utilization.memory_used || 0) /
                                                                (node.utilization.memory_total || 1)) *
                                                                100,
                                                        )}
                                                        %
                                                    </span>
                                                </div>
                                            </div>
                                            <div className='flex min-w-[100px] flex-col lg:items-end'>
                                                <span className='text-muted-foreground mb-1.5 text-[10px] font-black tracking-widest uppercase opacity-60'>
                                                    {t('dashboard.status.disk')}
                                                </span>
                                                <div className='flex items-center gap-3'>
                                                    <div className='bg-muted/50 hidden h-1.5 w-32 overflow-hidden rounded-full border border-white/5 xl:block'>
                                                        <div
                                                            className='h-full bg-green-500'
                                                            style={{
                                                                width: `${node.utilization.disk_total ? (node.utilization.disk_used! / node.utilization.disk_total!) * 100 : 0}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className='text-sm font-bold tracking-tighter'>
                                                        {Math.round(
                                                            ((node.utilization.disk_used || 0) /
                                                                (node.utilization.disk_total || 1)) *
                                                                100,
                                                        )}
                                                        %
                                                    </span>
                                                </div>
                                            </div>
                                            <div className='border-border/50 hidden border-l pl-6 lg:block'>
                                                <ChevronRight className='text-muted-foreground/20 group-hover:text-primary h-5 w-5 transition-colors' />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className='flex items-center gap-2 text-xs font-black tracking-widest text-red-500 uppercase'>
                                            <AlertTriangle className='h-4 w-4' />
                                            {t('dashboard.status.offline')}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className='py-24 text-center'>
                                <div className='bg-primary/5 text-primary border-primary/10 mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border'>
                                    <ServerIcon className='h-10 w-10 opacity-60' />
                                </div>
                                <h3 className='mb-2 text-xl font-bold'>{t('dashboard.status.noNodesFound')}</h3>
                                <p className='text-muted-foreground mx-auto max-w-xs opacity-70'>
                                    {t('dashboard.status.failedToLoadStatus')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <WidgetRenderer widgets={getWidgets('dashboard-status', 'after-node-list')} />
            </div>

            {statusData?.data?.global && (
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                    <div className='bg-card/50 border-border/50 rounded-xl border p-6 backdrop-blur-xl'>
                        <div className='mb-4 flex items-center justify-between'>
                            <span className='text-muted-foreground flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
                                <MemoryStick className='h-4 w-4 text-blue-500 opacity-60' />{' '}
                                {t('dashboard.status.globalMemoryUsage')}
                            </span>
                            <span className='text-muted-foreground text-xs font-bold opacity-80'>
                                {formatMemory(statusData.data.global.used_memory || 0)} /{' '}
                                {formatMemory(statusData.data.global.total_memory || 0)}
                            </span>
                        </div>
                        <div className='bg-muted/50 h-2 w-full overflow-hidden rounded-full border border-white/5'>
                            <div
                                className='h-full bg-blue-500 transition-all duration-1000 ease-out'
                                style={{
                                    width: `${statusData.data.global.total_memory ? (statusData.data.global.used_memory! / statusData.data.global.total_memory!) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>
                    <div className='bg-card/50 border-border/50 rounded-xl border p-6 backdrop-blur-xl'>
                        <div className='mb-4 flex items-center justify-between'>
                            <span className='text-muted-foreground flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
                                <HardDrive className='h-4 w-4 text-green-500 opacity-60' />{' '}
                                {t('dashboard.status.globalDiskUsage')}
                            </span>
                            <span className='text-muted-foreground text-xs font-bold opacity-80'>
                                {formatDisk(statusData.data.global.used_disk || 0)} /{' '}
                                {formatDisk(statusData.data.global.total_disk || 0)}
                            </span>
                        </div>
                        <div className='bg-muted/50 h-2 w-full overflow-hidden rounded-full border border-white/5'>
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
