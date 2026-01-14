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

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, Server, Check, AlertTriangle, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { formatBytes } from '@/lib/format';

interface GlobalStats {
    total_nodes: number;
    healthy_nodes: number;
    unhealthy_nodes: number;
    total_memory: number;
    used_memory: number;
    total_disk: number;
    used_disk: number;
    avg_cpu_percent: number;
}

interface NodeUtilization {
    memory_total: number;
    memory_used: number;
    disk_total: number;
    disk_used: number;
    swap_total: number;
    swap_used: number;
    cpu_percent: number;
    load_average1: number;
    load_average5: number;
    load_average15: number;
}

interface NodeStatus {
    id: number;
    uuid: string;
    name: string;
    fqdn: string;
    location_id: number;
    status: 'healthy' | 'unhealthy';
    utilization: NodeUtilization | null;
    error: string | null;
}

export default function NodeStatusPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
    const [nodes, setNodes] = useState<NodeStatus[]>([]);

    // Plugin Widgets
    const { getWidgets } = usePluginWidgets('admin-nodes-status');

    const fetchData = useCallback(
        async (background = false) => {
            if (!background) setLoading(true);
            setError(null);
            try {
                const res = await api.get('/admin/nodes/status/global');
                if (res.data.success) {
                    setGlobalStats(res.data.data.global);
                    setNodes(res.data.data.nodes);
                } else {
                    setError(res.data.message || t('admin.nodes.error'));
                }
            } catch (err) {
                console.error('Failed to fetch node status:', err);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const errorMessage = (err as any).response?.data?.message || t('admin.nodes.error');
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [t],
    );

    useEffect(() => {
        // Initial fetch
        fetchData(false);

        // Background refresh
        const interval = setInterval(() => {
            fetchData(true);
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchData]);

    const getMemoryUsagePercent = () => {
        if (!globalStats || globalStats.total_memory === 0) return 0;
        return (globalStats.used_memory / globalStats.total_memory) * 100;
    };

    const getDiskUsagePercent = () => {
        if (!globalStats || globalStats.total_disk === 0) return 0;
        return (globalStats.used_disk / globalStats.total_disk) * 100;
    };

    if (loading && !globalStats) {
        return (
            <div className='space-y-6'>
                <PageHeader title={t('admin.nodes.title')} description={t('admin.nodes.subtitle')} icon={Server} />
                <TableSkeleton count={4} />
            </div>
        );
    }

    if (error && !globalStats) {
        return (
            <div className='flex flex-col items-center justify-center min-h-[400px] text-center'>
                <Alert variant='destructive' className='max-w-md w-full mb-6'>
                    <AlertTriangle className='h-4 w-4' />
                    <AlertTitle>{t('admin.nodes.error')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={() => fetchData(false)}>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {t('admin.nodes.retry')}
                </Button>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'top-of-page')} />

            {/* Header */}
            <PageHeader
                title={t('admin.nodes.title')}
                description={t('admin.nodes.subtitle')}
                icon={Server}
                actions={
                    <Button variant='outline' size='sm' onClick={() => fetchData(false)} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('admin.nodes.refresh')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'after-header')} />

            {globalStats && (
                <>
                    <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'before-global-stats')} />

                    {/* Global Stats Cards */}
                    <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                        <ResourceCard
                            title={globalStats.total_nodes.toString()}
                            subtitle={t('admin.nodes.total')}
                            icon={Server}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        />
                        <ResourceCard
                            title={globalStats.healthy_nodes.toString()}
                            subtitle={t('admin.nodes.healthy')}
                            icon={Check}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                            iconClassName='text-green-500'
                            iconWrapperClassName='bg-green-500/10 border-green-500/20'
                        />
                        <ResourceCard
                            title={globalStats.unhealthy_nodes.toString()}
                            subtitle={t('admin.nodes.unhealthy')}
                            icon={AlertTriangle}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                            iconClassName='text-red-500'
                            iconWrapperClassName='bg-red-500/10 border-red-500/20'
                        />
                        <ResourceCard
                            title={`${globalStats.avg_cpu_percent.toFixed(1)}%`}
                            subtitle={t('admin.nodes.avg_cpu')}
                            icon={Cpu}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        />
                    </div>

                    <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'after-global-stats')} />

                    {/* Global Resource Usage */}
                    <div className='grid gap-6 lg:grid-cols-2'>
                        <PageCard
                            title={t('admin.nodes.memory_usage')}
                            icon={MemoryStick}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        >
                            <div className='space-y-4'>
                                <div className='flex justify-between items-center text-sm'>
                                    <span className='text-muted-foreground'>{t('admin.nodes.used_total')}</span>
                                    <span className='font-medium'>
                                        {formatBytes(globalStats.used_memory)} / {formatBytes(globalStats.total_memory)}
                                    </span>
                                </div>
                                <div className='h-3 w-full bg-secondary rounded-full overflow-hidden'>
                                    <div
                                        className={`h-full transition-all duration-500 rounded-full ${
                                            getMemoryUsagePercent() > 90
                                                ? 'bg-red-500'
                                                : getMemoryUsagePercent() > 75
                                                  ? 'bg-orange-500'
                                                  : 'bg-blue-500'
                                        }`}
                                        style={{ width: `${getMemoryUsagePercent()}%` }}
                                    />
                                </div>
                                <p className='text-xs text-center text-muted-foreground'>
                                    {t('admin.nodes.used_percent', { percent: getMemoryUsagePercent().toFixed(1) })}
                                </p>
                            </div>
                        </PageCard>
                        <PageCard
                            title={t('admin.nodes.disk_usage')}
                            icon={HardDrive}
                            className='shadow-none! bg-card/50 backdrop-blur-sm'
                        >
                            <div className='space-y-4'>
                                <div className='flex justify-between items-center text-sm'>
                                    <span className='text-muted-foreground'>{t('admin.nodes.used_total')}</span>
                                    <span className='font-medium'>
                                        {formatBytes(globalStats.used_disk)} / {formatBytes(globalStats.total_disk)}
                                    </span>
                                </div>
                                <div className='h-3 w-full bg-secondary rounded-full overflow-hidden'>
                                    <div
                                        className={`h-full transition-all duration-500 rounded-full ${
                                            getDiskUsagePercent() > 90
                                                ? 'bg-red-500'
                                                : getDiskUsagePercent() > 75
                                                  ? 'bg-orange-500'
                                                  : 'bg-green-500'
                                        }`}
                                        style={{ width: `${getDiskUsagePercent()}%` }}
                                    />
                                </div>
                                <p className='text-xs text-center text-muted-foreground'>
                                    {t('admin.nodes.used_percent', { percent: getDiskUsagePercent().toFixed(1) })}
                                </p>
                            </div>
                        </PageCard>
                    </div>

                    <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'after-resource-usage')} />

                    {/* Individual Nodes */}
                    <div className='space-y-4'>
                        <h2 className='text-2xl font-bold tracking-tight'>{t('admin.nodes.individual_nodes')}</h2>
                        <div className='grid gap-6 xl:grid-cols-2'>
                            {nodes.length === 0 ? (
                                <div className='col-span-2'>
                                    <EmptyState
                                        title={t('admin.nodes.no_nodes')}
                                        description={t('admin.nodes.no_nodes_description')}
                                        icon={Server}
                                    />
                                </div>
                            ) : (
                                nodes.map((node) => (
                                    <PageCard
                                        key={node.id}
                                        title={node.name}
                                        description={node.fqdn}
                                        icon={Server}
                                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                                        variant={node.status === 'healthy' ? 'default' : 'danger'}
                                        action={
                                            <Badge variant={node.status === 'healthy' ? 'default' : 'destructive'}>
                                                {node.status === 'healthy'
                                                    ? t('admin.nodes.online')
                                                    : t('admin.nodes.offline')}
                                            </Badge>
                                        }
                                    >
                                        <div className='pt-2'>
                                            {node.status === 'healthy' && node.utilization ? (
                                                <div className='space-y-6'>
                                                    {/* CPU */}
                                                    <div className='space-y-2'>
                                                        <div className='flex justify-between items-center text-sm'>
                                                            <span className='font-medium'>
                                                                {t('admin.nodes.cpu_usage')}
                                                            </span>
                                                            <span className='text-muted-foreground'>
                                                                {node.utilization.cpu_percent.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className='h-2 w-full bg-secondary rounded-full overflow-hidden'>
                                                            <div
                                                                className='h-full bg-primary rounded-full transition-all duration-300'
                                                                style={{
                                                                    width: `${Math.min(100, node.utilization.cpu_percent)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <div className='flex justify-between text-xs text-muted-foreground font-mono'>
                                                            <span>
                                                                {t('admin.nodes.load')}:{' '}
                                                                {node.utilization.load_average1}
                                                            </span>
                                                            <span>{node.utilization.load_average5}</span>
                                                            <span>{node.utilization.load_average15}</span>
                                                        </div>
                                                    </div>

                                                    {/* Memory */}
                                                    <div className='space-y-2'>
                                                        <div className='flex justify-between items-center text-sm'>
                                                            <span className='font-medium'>
                                                                {t('admin.nodes.memory')}
                                                            </span>
                                                            <span className='text-muted-foreground'>
                                                                {formatBytes(node.utilization.memory_used)} /{' '}
                                                                {formatBytes(node.utilization.memory_total)}
                                                            </span>
                                                        </div>
                                                        <div className='h-2 w-full bg-secondary rounded-full overflow-hidden'>
                                                            <div
                                                                className='h-full bg-blue-500 rounded-full transition-all duration-300'
                                                                style={{
                                                                    width: `${(node.utilization.memory_used / node.utilization.memory_total) * 100}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Disk */}
                                                    <div className='space-y-2'>
                                                        <div className='flex justify-between items-center text-sm'>
                                                            <span className='font-medium'>{t('admin.nodes.disk')}</span>
                                                            <span className='text-muted-foreground'>
                                                                {formatBytes(node.utilization.disk_used)} /{' '}
                                                                {formatBytes(node.utilization.disk_total)}
                                                            </span>
                                                        </div>
                                                        <div className='h-2 w-full bg-secondary rounded-full overflow-hidden'>
                                                            <div
                                                                className='h-full bg-green-500 rounded-full transition-all duration-300'
                                                                style={{
                                                                    width: `${(node.utilization.disk_used / node.utilization.disk_total) * 100}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Swap */}
                                                    {node.utilization.swap_total > 0 && (
                                                        <div className='space-y-2'>
                                                            <div className='flex justify-between items-center text-sm'>
                                                                <span className='font-medium'>
                                                                    {t('admin.nodes.swap')}
                                                                </span>
                                                                <span className='text-muted-foreground'>
                                                                    {formatBytes(node.utilization.swap_used)} /{' '}
                                                                    {formatBytes(node.utilization.swap_total)}
                                                                </span>
                                                            </div>
                                                            <div className='h-2 w-full bg-secondary rounded-full overflow-hidden'>
                                                                <div
                                                                    className='h-full bg-orange-500 rounded-full transition-all duration-300'
                                                                    style={{
                                                                        width: `${(node.utilization.swap_used / node.utilization.swap_total) * 100}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <Alert variant='destructive'>
                                                    <AlertTriangle className='h-4 w-4' />
                                                    <div className='ml-2'>
                                                        <AlertTitle>{t('admin.nodes.offline')}</AlertTitle>
                                                        <AlertDescription>
                                                            {node.error || 'Cannot connect to Wings daemon'}
                                                        </AlertDescription>
                                                    </div>
                                                </Alert>
                                            )}
                                        </div>
                                    </PageCard>
                                ))
                            )}
                        </div>
                    </div>

                    <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'after-individual-nodes')} />
                </>
            )}

            <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'bottom-of-page')} />
        </div>
    );
}
