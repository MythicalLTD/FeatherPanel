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

import { AdminWidgetLoading } from './AdminWidgetLoading';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Lock, HardDrive } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { HealthNode } from '@/hooks/useSystemHealth';

interface NodesOverviewWidgetProps {
    nodes: HealthNode[];
    loading: boolean;
    unavailable?: boolean;
}

export function NodesOverviewWidget({ nodes, loading, unavailable }: NodesOverviewWidgetProps) {
    const { t } = useTranslation();
    const list = nodes.slice(0, 6);
    return (
        <PageCard
            className='space-y-4 p-4 sm:p-5 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child]:pb-4'
            title={t('admin.nodes_overview.title')}
            icon={HardDrive}
            description={t('admin.nodes_overview.description')}
            action={
                <Link
                    href='/admin/nodes/status'
                    className='text-muted-foreground hover:bg-accent hover:text-foreground inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-medium transition-colors'
                >
                    {t('admin.nodes_overview.view_all')}
                </Link>
            }
        >
            {loading ? (
                <AdminWidgetLoading label={t('admin.nodes_overview.title')} />
            ) : unavailable ? (
                <p className='text-muted-foreground py-8 text-sm'>{t('admin.system_health.status.unavailable')}</p>
            ) : list.length === 0 ? (
                <div className='space-y-3 py-2 text-center'>
                    <p className='text-muted-foreground text-sm'>{t('admin.nodes_overview.empty')}</p>
                    <Link
                        href='/admin/nodes'
                        className='bg-secondary inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium'
                    >
                        {t('admin.welcome.manage_nodes')}
                    </Link>
                </div>
            ) : (
                <div className='divide-border divide-y'>
                    {list.map((node) => {
                        const healthy = node.status === 'healthy';
                        const knownStatus = healthy || node.status === 'unhealthy';
                        const utilization = node.utilization;
                        const memoryPct =
                            utilization?.memory_total && typeof utilization.memory_used === 'number'
                                ? Math.round((utilization.memory_used / utilization.memory_total) * 100)
                                : null;
                        const cpu =
                            typeof utilization?.cpu_percent === 'number' ? Math.round(utilization.cpu_percent) : null;
                        return (
                            <Link
                                key={node.id}
                                href={`/admin/nodes/${node.id}/edit`}
                                className='hover:bg-accent flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-md py-4 transition-colors'
                            >
                                <div className='min-w-0 flex-1 basis-36 space-y-1'>
                                    <p className='text-sm font-medium wrap-break-word'>{node.name}</p>
                                    <p className='text-muted-foreground text-xs wrap-break-word'>{node.fqdn}</p>
                                    {typeof node.server_count === 'number' && (
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.nodes_overview.servers_count', {
                                                count: String(node.server_count),
                                            })}
                                        </p>
                                    )}
                                </div>
                                <div className='flex flex-wrap items-center gap-4 text-xs'>
                                    {utilization && (
                                        <dl className='text-muted-foreground flex gap-4 tabular-nums'>
                                            <div className='space-y-1'>
                                                <dt>CPU</dt>
                                                <dd className='text-foreground'>{cpu === null ? '…' : `${cpu}%`}</dd>
                                            </div>
                                            <div className='space-y-1'>
                                                <dt>RAM</dt>
                                                <dd className='text-foreground'>
                                                    {memoryPct === null ? '…' : `${memoryPct}%`}
                                                </dd>
                                            </div>
                                        </dl>
                                    )}
                                    <span
                                        className={cn(
                                            'rounded-md px-2 py-1 font-medium',
                                            !knownStatus
                                                ? 'bg-muted text-muted-foreground'
                                                : healthy
                                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                  : 'bg-red-500/10 text-red-700 dark:text-red-400',
                                        )}
                                    >
                                        {healthy
                                            ? t('admin.nodes_overview.healthy')
                                            : knownStatus
                                              ? t('admin.nodes_overview.unhealthy')
                                              : t('common.unknown')}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </PageCard>
    );
}

export function NodesOverviewWidgetStandalone() {
    const { t } = useTranslation();
    const [nodes, setNodes] = useState<HealthNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [forbidden, setForbidden] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const fetchNodes = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/nodes/status/global');
            if (res.data.success) setNodes(res.data.data.nodes || []);
            else setUnavailable(true);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 403) setForbidden(true);
            else setUnavailable(true);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchNodes();
    }, [fetchNodes]);
    if (forbidden)
        return (
            <PageCard title={t('admin.nodes_overview.title')}>
                <div className='text-muted-foreground flex items-center gap-3 py-8 text-sm'>
                    <Lock className='h-4 w-4' aria-hidden />
                    {t('admin.recent_servers.no_permission')}
                </div>
            </PageCard>
        );
    return <NodesOverviewWidget nodes={nodes} loading={loading} unavailable={unavailable} />;
}
