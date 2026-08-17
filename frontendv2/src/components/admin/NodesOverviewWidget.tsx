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

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { ArrowUpRight, HardDrive, Lock, Server } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { HealthNode } from '@/hooks/useSystemHealth';

interface NodesOverviewWidgetProps {
    nodes: HealthNode[];
    loading: boolean;
}

export function NodesOverviewWidget({ nodes, loading }: NodesOverviewWidgetProps) {
    const { t } = useTranslation();
    const list = nodes.slice(0, 6);

    return (
        <PageCard
            title={t('admin.nodes_overview.title')}
            description={t('admin.nodes_overview.description')}
            icon={HardDrive}
            className='h-full'
            action={
                <Link
                    href='/admin/nodes/status'
                    className='text-muted-foreground hover:text-primary flex items-center gap-1 text-[9px] font-black tracking-widest uppercase transition-colors md:text-[10px]'
                >
                    {t('admin.nodes_overview.view_all')}
                    <ArrowUpRight className='h-3.5 w-3.5' />
                </Link>
            }
        >
            {loading ? (
                <div className='space-y-3'>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className='bg-muted/20 h-16 animate-pulse rounded-2xl' />
                    ))}
                </div>
            ) : list.length === 0 ? (
                <div className='text-muted-foreground py-10 text-center text-sm font-medium'>
                    {t('admin.nodes_overview.empty')}
                </div>
            ) : (
                <div className='space-y-2.5'>
                    {list.map((node) => {
                        const healthy = node.status === 'healthy';
                        const memTotal = node.utilization?.memory_total || 0;
                        const memUsed = node.utilization?.memory_used || 0;
                        const memPct = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;
                        const cpu = Math.round(node.utilization?.cpu_percent || 0);

                        return (
                            <Link
                                key={node.id}
                                href={`/admin/nodes/${node.id}/edit`}
                                className='bg-muted/10 border-border/50 hover:border-primary/30 hover:bg-muted/20 group flex flex-col gap-3 rounded-2xl border p-3.5 transition-all md:p-4'
                            >
                                <div className='flex items-center gap-3'>
                                    <div
                                        className={cn(
                                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                                            healthy
                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                                                : 'border-red-500/30 bg-red-500/10 text-red-500',
                                        )}
                                    >
                                        <Server className='h-4 w-4' />
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <p className='truncate text-sm font-bold'>{node.name}</p>
                                        <p className='text-muted-foreground truncate text-[10px] font-medium'>
                                            {node.fqdn}
                                            {typeof node.server_count === 'number'
                                                ? ` · ${t('admin.nodes_overview.servers_count', {
                                                      count: String(node.server_count),
                                                  })}`
                                                : ''}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            'rounded-full px-2.5 py-1 text-[9px] font-black tracking-wider uppercase',
                                            healthy
                                                ? 'bg-emerald-500/15 text-emerald-500'
                                                : 'bg-red-500/15 text-red-500',
                                        )}
                                    >
                                        {healthy
                                            ? t('admin.nodes_overview.healthy')
                                            : t('admin.nodes_overview.unhealthy')}
                                    </span>
                                </div>
                                {node.utilization && (
                                    <div className='grid grid-cols-2 gap-3'>
                                        <div className='space-y-1.5'>
                                            <div className='text-muted-foreground flex justify-between text-[9px] font-black tracking-widest uppercase'>
                                                <span>CPU</span>
                                                <span>{cpu}%</span>
                                            </div>
                                            <Progress
                                                value={cpu}
                                                className='h-1.5'
                                                indicatorClassName={
                                                    cpu > 90 ? 'bg-red-500' : cpu > 75 ? 'bg-amber-500' : undefined
                                                }
                                            />
                                        </div>
                                        <div className='space-y-1.5'>
                                            <div className='text-muted-foreground flex justify-between text-[9px] font-black tracking-widest uppercase'>
                                                <span>RAM</span>
                                                <span>{memPct}%</span>
                                            </div>
                                            <Progress
                                                value={memPct}
                                                className='h-1.5'
                                                indicatorClassName={
                                                    memPct > 90
                                                        ? 'bg-red-500'
                                                        : memPct > 75
                                                          ? 'bg-amber-500'
                                                          : undefined
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </PageCard>
    );
}

/** Optional fetch wrapper when parent doesn't already have node list */
export function NodesOverviewWidgetStandalone() {
    const [nodes, setNodes] = useState<HealthNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [forbidden, setForbidden] = useState(false);

    const fetchNodes = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/nodes/status/global');
            if (res.data.success) {
                setNodes(res.data.data.nodes || []);
            }
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 403) {
                setForbidden(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNodes();
    }, [fetchNodes]);

    if (forbidden) {
        return (
            <PageCard title='Nodes' description='Unavailable' icon={Lock}>
                <p className='text-muted-foreground py-8 text-center text-sm'>Permission required</p>
            </PageCard>
        );
    }

    return <NodesOverviewWidget nodes={nodes} loading={loading} />;
}
