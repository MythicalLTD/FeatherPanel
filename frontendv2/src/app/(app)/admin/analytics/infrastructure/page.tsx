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

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import api from '@/lib/api';
import { SimplePieChart, SimpleBarChart, NodeResourceChart } from '@/components/admin/analytics/SharedCharts';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { PageHeader } from '@/components/featherui/PageHeader';
import { MapPin, Server, Network, Database } from 'lucide-react';

interface InfrastructureOverview {
    locations: { total: number; with_nodes: number };
    nodes: { total: number; public: number; percentage_public: number };
    allocations: { total: number; in_use: number; percentage_in_use: number };
    databases: { total: number; hosts: number };
}

interface StatsItem {
    name: string;
    value: number;
}

interface NodeResourceStats {
    name: string;
    memory_usage: number;
    disk_usage: number;
}

export default function InfrastructureAnalyticsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [overview, setOverview] = useState<InfrastructureOverview | null>(null);
    const [nodesByLocation, setNodesByLocation] = useState<StatsItem[]>([]);
    const [allocationUsage, setAllocationUsage] = useState<StatsItem[]>([]);
    const [serversByNode, setServersByNode] = useState<StatsItem[]>([]);
    const [dbTypes, setDbTypes] = useState<StatsItem[]>([]);
    const [nodeResources, setNodeResources] = useState<NodeResourceStats[]>([]);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [
                overviewRes,
                nodesByLocationRes,
                allocationUsageRes,
                serversByNodeRes,
                dbOverviewRes,
                nodeResourcesRes,
            ] = await Promise.all([
                api.get('/admin/analytics/infrastructure/dashboard'), // Use dashboard endpoint or combine overviews
                api.get('/admin/analytics/nodes/by-location'),
                api.get('/admin/analytics/allocations/overview'), // Check if this gives usage
                api.get('/admin/analytics/servers/by-node'),
                api.get('/admin/analytics/databases/overview'),
                api.get('/admin/analytics/nodes/resources'),
            ]);

            setOverview(overviewRes.data.data);
            setNodesByLocation(
                (nodesByLocationRes.data.data.locations || []).map(
                    (l: { location_name: string; node_count: number }) => ({
                        name: l.location_name,
                        value: l.node_count,
                    }),
                ),
            );

            const allocData = allocationUsageRes.data.data;
            setAllocationUsage([
                { name: t('admin.analytics.infrastructure.assigned'), value: allocData.assigned },
                { name: t('admin.analytics.infrastructure.available'), value: allocData.available },
            ]);

            setServersByNode(
                (serversByNodeRes.data.data.nodes || []).map((n: { node_name: string; server_count: number }) => ({
                    name: n.node_name,
                    value: n.server_count,
                })),
            );

            setDbTypes(
                (dbOverviewRes.data.data.by_type || []).map((d: { database_type: string; count: number }) => ({
                    name: d.database_type,
                    value: d.count,
                })),
            );

            setNodeResources(nodeResourcesRes.data.data.nodes || []);
        } catch (err) {
            console.error('Failed to fetch infrastructure analytics:', err);
            setError(t('admin.analytics.infrastructure.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-[400px]'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='flex flex-col items-center justify-center min-h-[400px] text-center'>
                <p className='text-red-500 mb-4'>{error}</p>
                <button
                    onClick={fetchData}
                    className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity'
                >
                    {t('admin.analytics.activity.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.analytics.infrastructure.title')}
                description={t('admin.analytics.infrastructure.subtitle')}
                icon={Server}
            />

            {/* Overview Stats */}
            {overview && (
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                    <ResourceCard
                        title={(overview.locations?.total ?? 0).toString()}
                        subtitle={t('admin.analytics.infrastructure.locations')}
                        description={t('admin.analytics.infrastructure.with_nodes', {
                            count: String(overview.locations?.with_nodes ?? 0),
                        })}
                        icon={MapPin}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={(overview.nodes?.total ?? 0).toString()}
                        subtitle={t('admin.analytics.infrastructure.nodes')}
                        description={t('admin.analytics.infrastructure.public', {
                            percentage: String(overview.nodes?.percentage_public ?? 0),
                        })}
                        icon={Server}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={(overview.allocations?.total ?? 0).toString()}
                        subtitle={t('admin.analytics.infrastructure.allocations')}
                        description={t('admin.analytics.infrastructure.in_use', {
                            percentage: String(overview.allocations?.percentage_in_use ?? 0),
                        })}
                        icon={Network}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={(overview.databases?.hosts ?? 0).toString()}
                        subtitle={t('admin.analytics.infrastructure.db_hosts')}
                        description={t('admin.analytics.infrastructure.across_nodes')}
                        icon={Database}
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                </div>
            )}

            {/* Charts Section */}
            <div className='grid gap-4 md:grid-cols-2'>
                <SimplePieChart
                    title={t('admin.analytics.infrastructure.nodes_by_location')}
                    description={t('admin.analytics.infrastructure.nodes_by_location_desc')}
                    data={nodesByLocation}
                />
                <SimplePieChart
                    title={t('admin.analytics.infrastructure.allocation_usage')}
                    description={t('admin.analytics.infrastructure.allocation_usage_desc')}
                    data={allocationUsage}
                />
            </div>

            <div className='grid gap-4 md:grid-cols-1'>
                <NodeResourceChart
                    title={t('admin.analytics.infrastructure.node_resources')}
                    description={t('admin.analytics.infrastructure.node_resources_desc')}
                    data={nodeResources}
                />
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
                <SimpleBarChart
                    title={t('admin.analytics.infrastructure.servers_by_node')}
                    description={t('admin.analytics.infrastructure.servers_by_node_desc')}
                    data={serversByNode}
                />
                <SimplePieChart
                    title={t('admin.analytics.infrastructure.db_types')}
                    description={t('admin.analytics.infrastructure.db_types_desc')}
                    data={dbTypes}
                />
            </div>
        </div>
    );
}
