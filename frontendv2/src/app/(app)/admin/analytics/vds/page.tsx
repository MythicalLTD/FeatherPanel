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
import api from '@/lib/api';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { PageHeader } from '@/components/featherui/PageHeader';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { SimplePieChart, SimpleBarChart } from '@/components/admin/analytics/SharedCharts';
import { Boxes, Server, Archive, Activity } from 'lucide-react';

interface DashboardData {
    vds: Record<string, number>;
    totals: {
        vds_objects: number;
    };
}

export default function VdsAnalyticsPage() {
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-analytics-vds');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/admin/analytics/vds/dashboard');
            setDashboard(res.data.data);
        } catch (err) {
            console.error('Failed to fetch VDS analytics:', err);
            setError('Failed to fetch VDS analytics data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    if (loading) {
        return (
            <div className='flex min-h-[400px] items-center justify-center'>
                <div className='border-primary h-8 w-8 animate-spin rounded-full border-b-2'></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='flex min-h-[400px] flex-col items-center justify-center text-center'>
                <p className='mb-4 text-red-500'>{error}</p>
                <button
                    onClick={fetchData}
                    className='bg-primary text-primary-foreground rounded-md px-4 py-2 transition-opacity hover:opacity-90'
                >
                    Retry
                </button>
            </div>
        );
    }

    const vdsBreakdown = [
        { name: 'Instances', value: dashboard?.vds.instances ?? 0 },
        { name: 'Nodes', value: dashboard?.vds.nodes ?? 0 },
        { name: 'Templates', value: dashboard?.vds.templates ?? 0 },
        { name: 'Backups', value: dashboard?.vds.instance_backups ?? 0 },
        { name: 'Tasks', value: dashboard?.vds.tasks ?? 0 },
    ];

    const vdsRuntimeBreakdown = [
        { name: 'Subusers', value: dashboard?.vds.subusers ?? 0 },
        { name: 'Instance IPs', value: dashboard?.vds.instance_ips ?? 0 },
        { name: 'Activities', value: dashboard?.vds.instance_activities ?? 0 },
        { name: 'Backups', value: dashboard?.vds.instance_backups ?? 0 },
    ];

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-analytics-vds', 'top-of-page')} />
            <div className='space-y-6'>
                <PageHeader
                    title='VDS Analytics'
                    description='VDS-only KPIs for nodes, templates, instances, backups, and operations.'
                    icon={Boxes}
                />

                {dashboard && (
                    <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                        <ResourceCard
                            title={String(dashboard.vds.instances)}
                            subtitle='VDS Instances'
                            description={`Nodes: ${dashboard.vds.nodes}, Templates: ${dashboard.vds.templates}`}
                            icon={Boxes}
                            className='bg-card/50 shadow-none! backdrop-blur-sm'
                        />
                        <ResourceCard
                            title={String(dashboard.vds.nodes)}
                            subtitle='VDS Nodes'
                            description={`Templates: ${dashboard.vds.templates}, Tasks: ${dashboard.vds.tasks}`}
                            icon={Server}
                            className='bg-card/50 shadow-none! backdrop-blur-sm'
                        />
                        <ResourceCard
                            title={String(dashboard.vds.instance_backups)}
                            subtitle='Instance Backups'
                            description={`IPs: ${dashboard.vds.instance_ips}, Subusers: ${dashboard.vds.subusers}`}
                            icon={Archive}
                            className='bg-card/50 shadow-none! backdrop-blur-sm'
                        />
                        <ResourceCard
                            title={String(dashboard.vds.instance_activities)}
                            subtitle='Instance Activities'
                            description={`Total VDS objects: ${dashboard.totals.vds_objects}`}
                            icon={Activity}
                            className='bg-card/50 shadow-none! backdrop-blur-sm'
                        />
                    </div>
                )}

                <div className='grid gap-4 md:grid-cols-2'>
                    <SimplePieChart title='VDS Breakdown' description='VDS-related object totals' data={vdsBreakdown} />
                    <SimpleBarChart
                        title='VDS Totals'
                        description='Total VDS object count'
                        data={[{ name: 'VDS Objects', value: dashboard?.totals.vds_objects ?? 0 }]}
                        color='#6366f1'
                    />
                </div>

                <div className='grid gap-4 md:grid-cols-1'>
                    <SimpleBarChart
                        title='VDS Runtime Breakdown'
                        description='Operational VDS entities and usage'
                        data={vdsRuntimeBreakdown}
                        color='#22c55e'
                    />
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('admin-analytics-vds', 'bottom-of-page')} />
        </>
    );
}
